/**
 * Data Service for Course Information Portal
 * Handles data fetching, caching, and processing
 */
const DataService = {
  // Cache for semester data
  _semesterData: {},

  // Current application state
  _state: {
    currentSemester: null,
    currentData: [],
    filteredData: [],
    currentPage: 1
  },

  /**
   * Initialize data service
   * @returns {Promise} Promise resolving when initialization is complete
   */
  init: async function() {
    return this.preloadAllSemesterData();
  },

  /**
   * Get configuration for a specific semester
   * @param {string} semesterId - Semester identifier
   * @returns {Object|null} Semester configuration
   */
  getSemesterConfig: function(semesterId) {
    return CONFIG.dataSources.semesters.find(s => s.id === semesterId) || null;
  },

  /**
   * Get the current semester for initial loading
   * @returns {Object} The current semester configuration
   */
  getCurrentSemester: function() {
    return CONFIG.dataSources.semesters.find(s => s.isCurrent) || CONFIG.dataSources.semesters[0];
  },

  /**
   * Set current semester and load its data
   * @param {string} semesterId - Semester identifier
   * @returns {Promise} Promise resolving with the loaded data
   */
  setCurrentSemester: async function(semesterId) {
    const semester = this.getSemesterConfig(semesterId);
    if (!semester) {
      throw new Error(`Unknown semester: ${semesterId}`);
    }

    this._state.currentSemester = semester;
    this._state.currentPage = 1;

    const data = await this.loadSemesterData(semester);
    this._state.currentData = data;
    this._state.filteredData = [...data];

    return data;
  },

  /**
   * Preload all semester data in parallel
   * @returns {Promise} Promise resolving when all data is loaded
   */
  preloadAllSemesterData: async function() {
    const promises = CONFIG.dataSources.semesters.map(semester => {
      return this.loadSemesterData(semester)
        .then(data => {
          this._semesterData[semester.id] = data;
          return { id: semester.id, data };
        })
        .catch(error => {
          console.warn(`Failed to preload ${semester.id} data:`, error);
          return { id: semester.id, data: null };
        });
    });

    return Promise.all(promises);
  },

  /**
   * Load data for a specific semester with caching
   * @param {Object} semester - Semester configuration
   * @returns {Promise<Array>} Promise resolving with normalized course data
   */
  loadSemesterData: async function(semester) {
    const cacheKey = Utils.getSemesterCacheKey(semester.id);

    // For current semester, always try CDN first (skip cache)
    if (semester.isCurrent) {
      try {
        console.log(`Current semester (${semester.id}): Loading fresh data from CDN`);
        const data = await this.loadSummer25Data(true); // true = skip cache
        return data;
      } catch (error) {
        console.warn(`Failed to load current semester data from CDN: ${error.message}`);
        // Will continue to try cache and local file below
      }
    } else {
      // For older semesters, check cache first
      const cachedData = Utils.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`Using cached data for ${semester.id}`);
        return cachedData;
      }
    }

    let data;
    try {
      // Handle special case for Summer 2025 (live data)
      if (semester.id === 'summer25') {
        data = await this.loadSummer25Data(false); // false = allow cached/local fallback
      } else if (semester.id === 'spring') {
        data = await this.loadSpringData();
        // Spring status is already set in loadSpringData, no need to set it here
      } else {
        const response = await fetch(semester.file);
        if (!response.ok) throw new Error(`Failed to load ${semester.file}`);
        const rawData = await response.json();
        const courses = rawData.data ? rawData.data : (Array.isArray(rawData) ? rawData : [rawData]);
        data = Utils.normalizeCourseData(courses, semester.dataFormat);

        // Only set status for semesters other than spring and current
        UIController.updateDataStatus('localData', {
          semester: semester.name.split(' ')[0],
          year: semester.year
        });
      }

      // Sort courses by code
      data.sort((a, b) => a.code.localeCompare(b.code));

      // Cache the processed data
      Utils.saveToCache(cacheKey, data, CONFIG.cache.expirationMinutes);

      return data;
    } catch (error) {
      throw new Error(`Failed to load data for ${semester.name}: ${error.message}`);
    }
  },

  /**
   * Load Summer 2025 data from CDN with fallback to cache/local file
   * @param {boolean} skipCache - If true, skip cache and always try CDN
   * @returns {Promise<Array>} Promise resolving with normalized course data
   */
  loadSummer25Data: async function(skipCache = false) {
    const cacheKey = Utils.getSemesterCacheKey('summer25');

    // Check cache first if not skipping
    if (!skipCache) {
      const cachedData = Utils.getFromCache(cacheKey);
      if (cachedData) {
        console.log('Using cached Summer 2025 data');
        UIController.updateDataStatus('localData', { semester: 'Summer', year: '2025' });
        return cachedData;
      }
    }

    // Try CDN
    try {
      const cdnResponse = await fetch(CONFIG.dataSources.cdnUrl);
      if (!cdnResponse.ok) {
        throw new Error(`CDN fetch failed with status: ${cdnResponse.status}`);
      }

      let cdnData = await cdnResponse.json();
      // Ensure the data is an array; if not, try extracting from a "data" property
      if (!Array.isArray(cdnData)) {
        if (cdnData.data && Array.isArray(cdnData.data)) {
          cdnData = cdnData.data;
        } else {
          throw new Error('CDN data is not in the expected format');
        }
      }

      // Set status to live data
      UIController.updateDataStatus('liveData');

      const normalizedData = Utils.normalizeCourseData(cdnData, 'spring25');

      // Cache the processed data
      Utils.saveToCache(cacheKey, normalizedData, CONFIG.cache.expirationMinutes);

      return normalizedData;
    } catch (cdnError) {
      console.warn('CDN fetch error:', cdnError.message);

      // If skipping cache, try local file directly
      try {
        const fileResponse = await fetch('summer-25.json');
        if (!fileResponse.ok) {
          throw new Error('Local file fetch failed');
        }

        const fileData = await fileResponse.json();

        // Set status to offline data
        UIController.updateDataStatus('offlineData');

        const normalizedData = Utils.normalizeCourseData(fileData, 'spring25');

        // Cache the processed data if we're not skipping cache
        if (!skipCache) {
          Utils.saveToCache(cacheKey, normalizedData, CONFIG.cache.expirationMinutes);
        }

        return normalizedData;
      } catch (fileError) {
        throw new Error(`Both CDN and local file fetch failed: ${fileError.message}`);
      }
    }
  },

  /**
   * Load Spring data from local file only (no CDN)
   * @returns {Promise<Array>} Promise resolving with normalized course data
   */
  loadSpringData: async function() {
    try {
      // Explicitly set a loading status here to indicate progress
      console.log('Loading Spring 2025 data from local file');

      const fileResponse = await fetch('spring-25.json');
      if (!fileResponse.ok) {
        throw new Error('Failed to load spring-25.json');
      }

      const fileData = await fileResponse.json();
      // Make sure to only use the array part if needed
      const courses = fileData.data ? fileData.data : (Array.isArray(fileData) ? fileData : [fileData]);

      // Set status AFTER we have successfully loaded the data
      UIController.updateDataStatus('localData', {
        semester: 'Spring',
        year: '2025'
      });

      // Return the normalized data
      return Utils.normalizeCourseData(courses, 'spring25');
    } catch (fileError) {
      console.error('Error loading Spring data:', fileError);
      UIController.updateDataStatus('offlineData');
      throw fileError;
    }
  },

  /**
   * Find faculty matches for a course across other semesters
   * @param {Object} course - Course object
   * @returns {Object} Object containing section and time matches
   */
  findMatches: function(course) {
    const matches = {
      timeMatches: [],
      sectionHistory: []
    };

    // Check all semesters for matches
    for (const semId of Object.keys(this._semesterData)) {
      if (!this._semesterData[semId]) continue;

      this._semesterData[semId].forEach(prevCourse => {
        // Check section history matches
        if (prevCourse.code === course.code && prevCourse.section === course.section) {
          matches.sectionHistory.push({
            faculty: prevCourse.facultyInitial,
            semester: semId,
            schedule: prevCourse.schedule
          });
        }

        // Check time overlap matches
        const hasTimeOverlap = course.schedule.some(courseTime =>
          prevCourse.schedule.some(prevTime =>
            courseTime.day === prevTime.day &&
            Math.abs(courseTime.start - prevTime.start) < 90
          )
        );

        if (hasTimeOverlap && prevCourse.facultyInitial !== 'TBA' && prevCourse.code === course.code) {
          matches.timeMatches.push({
            faculty: prevCourse.facultyInitial,
            section: prevCourse.section,
            semester: semId,
            schedule: prevCourse.schedule
          });
        }
      });
    }

    return matches;
  },

  /**
   * Filter the current data based on search text
   * @param {string} searchText - Text to search for
   */
  filterData: function(searchText) {
    const filter = searchText.trim().toUpperCase();

    if (!filter) {
      this._state.filteredData = [...this._state.currentData];
    } else {
      this._state.filteredData = this._state.currentData.filter(course => {
        const matchCode = course.code.toUpperCase().includes(filter);
        const matchSection = course.section.toUpperCase().includes(filter);
        const matchFaculty = course.faculty.toUpperCase().includes(filter);
        const matchSchedule = course.schedule.some(schedule =>
          `${schedule.day} ${Utils.formatTime(schedule.start)}`.toUpperCase().includes(filter)
        );
        return matchCode || matchSection || matchFaculty || matchSchedule;
      });
    }

    this._state.currentPage = 1;
  },

  /**
   * Get current filtered data for current page
   * @returns {Array} Courses for current page
   */
  getCurrentPageData: function() {
    const start = (this._state.currentPage - 1) * CONFIG.pagination.itemsPerPage;
    const end = start + CONFIG.pagination.itemsPerPage;
    return this._state.filteredData.slice(start, end);
  },

  /**
   * Get pagination information
   * @returns {Object} Pagination info
   */
  getPaginationInfo: function() {
    return {
      currentPage: this._state.currentPage,
      totalPages: Math.ceil(this._state.filteredData.length / CONFIG.pagination.itemsPerPage),
      hasNextPage: this._state.currentPage < Math.ceil(this._state.filteredData.length / CONFIG.pagination.itemsPerPage),
      hasPrevPage: this._state.currentPage > 1
    };
  },

  /**
   * Move to next page if available
   * @returns {boolean} Whether page changed
   */
  nextPage: function() {
    if (this._state.currentPage < Math.ceil(this._state.filteredData.length / CONFIG.pagination.itemsPerPage)) {
      this._state.currentPage++;
      return true;
    }
    return false;
  },

  /**
   * Move to previous page if available
   * @returns {boolean} Whether page changed
   */
  prevPage: function() {
    if (this._state.currentPage > 1) {
      this._state.currentPage--;
      return true;
    }
    return false;
  }
};