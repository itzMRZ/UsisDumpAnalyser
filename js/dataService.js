/**
 * Data Service for Course Information Portal
 * Handles data fetching, caching, and processing
 */
const DataService = {
  // Cache for semester data with metadata
  _semesterData: {},
  _semesterDataSource: {}, // Track whether data came from CDN, local, or cache

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
    console.log(`🎯 setCurrentSemester called with: ${semesterId}`);
    const semester = this.getSemesterConfig(semesterId);
    if (!semester) {
      throw new Error(`Unknown semester: ${semesterId}`);
    }

    console.log(`📋 Semester config found:`, semester);
    this._state.currentSemester = semester;
    this._state.currentPage = 1;

    // Check if data is already loaded in cache
    if (this._semesterData[semesterId]) {
      console.log(`💾 Using already loaded data for ${semesterId}: ${this._semesterData[semesterId].length} courses`);

      // Set appropriate status based on how the data was originally loaded
      const dataSource = this._semesterDataSource[semesterId] || 'local';
      if (dataSource === 'cdn') {
        UIController.updateDataStatus('liveData');
        console.log(`🟢 Status updated to Live Data for ${semesterId} (originally from CDN)`);
      } else if (semester.isCurrent) {
        UIController.updateDataStatus('offlineData');
        console.log(`🔴 Status updated to Offline Data for current semester ${semesterId}`);
      } else {
        UIController.updateDataStatus('localData', {
          semester: semester.name.split(' ')[0],
          year: semester.year
        });
        console.log(`🟠 Status updated to Local Data for ${semesterId}`);
      }

      this._state.currentData = this._semesterData[semesterId];
      this._state.filteredData = [...this._semesterData[semesterId]];
      console.log(`✅ State updated for ${semesterId}: currentData=${this._state.currentData.length}, filteredData=${this._state.filteredData.length}`);
      return this._semesterData[semesterId];
    }

    // Load data for the first time
    console.log(`🔄 Loading data for first time: ${semesterId}`);
    const data = await this.loadSemesterData(semester);
    console.log(`📊 Loaded data for ${semesterId}: ${data?.length || 0} courses`);

    this._semesterData[semesterId] = data; // Cache it
    this._state.currentData = data;
    this._state.filteredData = [...data];

    console.log(`✅ Final state for ${semesterId}: currentData=${this._state.currentData.length}, filteredData=${this._state.filteredData.length}`);
    return data;
  },

  /**
   * Preload all semester data in parallel
   * @returns {Promise} Promise resolving when all data is loaded
   */
  preloadAllSemesterData: async function() {
    console.log('🚀 Starting preload for all semesters...');
    const promises = CONFIG.dataSources.semesters.map(semester => {
      console.log(`📋 Queueing preload for semester: ${semester.id} (${semester.name})`);
      return this.loadSemesterData(semester)
        .then(data => {
          console.log(`✅ Successfully preloaded ${semester.id}: ${data?.length || 0} courses`);
          this._semesterData[semester.id] = data;
          return { id: semester.id, data };
        })
        .catch(error => {
          console.warn(`❌ Failed to preload ${semester.id} data:`, error);
          return { id: semester.id, data: null };
        });
    });

    const results = await Promise.all(promises);
    console.log('🏁 Preload completed. Results:', results.map(r => ({ id: r.id, loaded: !!r.data, count: r.data?.length || 0 })));
    return results;
  },

  /**
   * Load data for a specific semester with caching
   * @param {Object} semester - Semester configuration
   * @returns {Promise<Array>} Promise resolving with normalized course data
   */
  loadSemesterData: async function(semester) {
    console.log(`🔄 Loading data for semester: ${semester.id} (${semester.name})`);
    console.log(`🔍 Semester isCurrent status: ${semester.isCurrent}`);
    const cacheKey = Utils.getSemesterCacheKey(semester.id);

    // For older semesters, check cache first
    if (!semester.isCurrent) {
      console.log(`📦 Non-current semester - checking cache first for ${semester.id}`);
      const cachedData = Utils.getFromCache(cacheKey);
      if (cachedData) {
        console.log(`💾 Using cached data for ${semester.id}: ${cachedData.length} courses`);
        return cachedData;
      }
      console.log(`❌ No cache found for non-current semester ${semester.id}`);
    } else {
      console.log(`🚀 Current semester detected - skipping cache check for ${semester.id}`);
    }

    let data;

    // For current semester, try CDN first
    if (semester.isCurrent) {
      console.log(`🌐 Current semester detected - trying CDN first for ${semester.id}...`);
      try {
        console.log(`� Fetching from CDN: ${CONFIG.dataSources.cdnUrl}`);
        const cdnResponse = await fetch(CONFIG.dataSources.cdnUrl);
        console.log(`📡 CDN response status: ${cdnResponse.status} ${cdnResponse.statusText}`);

        if (cdnResponse.ok) {
          console.log(`📥 Parsing CDN response as JSON...`);
          let cdnData = await cdnResponse.json();
          console.log('🔍 CDN data received:', {
            type: typeof cdnData,
            isArray: Array.isArray(cdnData),
            hasDataProperty: !!cdnData.data,
            topLevelKeys: typeof cdnData === 'object' ? Object.keys(cdnData) : 'N/A'
          });

          // Ensure the data is an array; if not, try extracting from a "data" property
          if (!Array.isArray(cdnData)) {
            if (cdnData.data && Array.isArray(cdnData.data)) {
              cdnData = cdnData.data;
              console.log(`📋 Extracted data array from CDN data property, length: ${cdnData.length}`);
            } else if (cdnData.sections && Array.isArray(cdnData.sections)) {
              cdnData = cdnData.sections;
              console.log(`📋 Extracted data array from CDN sections property, length: ${cdnData.length}`);
            } else {
              throw new Error('CDN data is not in the expected format');
            }
          } else {
            console.log(`📋 CDN data is already an array, length: ${cdnData.length}`);
          }

          console.log(`🔄 Normalizing CDN data...`);
          data = Utils.normalizeCourseData(cdnData, semester.dataFormat);
          console.log(`✅ Data normalized from CDN, final count: ${data.length}`);

          // Set status to live data
          UIController.updateDataStatus('liveData');

          // Track that this data came from CDN
          this._semesterDataSource[semester.id] = 'cdn';

          // Cache the processed data
          Utils.saveToCache(cacheKey, data, CONFIG.cache.expirationMinutes);
          console.log(`💾 CDN data cached for ${semester.id}`);

          console.log(`🔢 Loaded ${data?.length || 0} courses from CDN for ${semester.id}`);
          return data;
        }
      } catch (cdnError) {
        console.warn(`❌ CDN fetch failed for current semester ${semester.id}:`, cdnError.message);
        console.log(`📁 Falling back to local file for current semester...`);
        data = null; // Will trigger local file loading below
      }
    }

    // If CDN failed or not current semester, load from local file
    if (!data) {
      try {
        console.log(`� Loading from local file for ${semester.id}...`);
        console.log(`📄 Loading semester file: ${semester.file}`);
        console.log(`🔗 Full fetch URL: ${window.location.origin}/${semester.file}`);

        const response = await fetch(semester.file);
        console.log(`📡 Response for ${semester.file}: status=${response.status}, ok=${response.ok}, statusText=${response.statusText}`);

        if (!response.ok) {
          console.error(`❌ Failed to fetch ${semester.file}: ${response.status} ${response.statusText}`);
          throw new Error(`Failed to load ${semester.file}: ${response.status} ${response.statusText}`);
        }

        console.log(`📥 Parsing JSON for ${semester.file}...`);
        const rawData = await response.json();
        console.log(`🔍 Raw data for ${semester.file}: type=${typeof rawData}, isArray=${Array.isArray(rawData)}, length=${Array.isArray(rawData) ? rawData.length : 'N/A'}`);

        let courses;
        if (rawData && rawData.data && Array.isArray(rawData.data)) {
          courses = rawData.data;
        } else if (rawData && rawData.sections && Array.isArray(rawData.sections)) {
          courses = rawData.sections;
        } else if (Array.isArray(rawData)) {
          courses = rawData;
        } else {
          courses = [rawData];
        }
        console.log(`📋 Courses array for ${semester.file}: length=${courses.length}`);

        data = Utils.normalizeCourseData(courses, semester.dataFormat);
        console.log(`✅ Normalized data for ${semester.file}: ${data.length} courses`);

        // Set appropriate status based on whether this was a fallback or primary load
        if (semester.isCurrent) {
          UIController.updateDataStatus('offlineData');
        } else {
          UIController.updateDataStatus('localData', {
            semester: semester.name.split(' ')[0],
            year: semester.year
          });
        }

        console.log(`🔢 Loaded ${data?.length || 0} courses from local file for ${semester.id}`);

      } catch (fileError) {
        console.error(`❌ Local file error for ${semester.id}:`, fileError);
        throw new Error(`Failed to load ${semester.file}: ${fileError.message}`);
      }
    }

    // Sort courses by code
    data.sort((a, b) => a.code.localeCompare(b.code));

    // Cache the processed data
    Utils.saveToCache(cacheKey, data, CONFIG.cache.expirationMinutes);
    console.log(`💾 Cached data for ${semester.id}`);

    return data;
  },

  /**
   * Find faculty matches for a course across other semesters
   * @param {Object} course - Course object
   * @returns {Object} Object containing section, time, and room matches
   */
  findMatches: function(course) {
    const matches = {
      timeMatches: [],
      sectionHistory: [],
      roomMatches: []
    };

    // Check all semesters for matches
    for (const semId of Object.keys(this._semesterData)) {
      if (!this._semesterData[semId]) continue;

      this._semesterData[semId].forEach(prevCourse => {
        // Check section history matches
        if (prevCourse.code === course.code && prevCourse.section === course.section) {
          // Only add if the previous faculty wasn't TBA
          if (prevCourse.facultyInitial !== 'TBA') {
            matches.sectionHistory.push({
              faculty: prevCourse.facultyInitial,
              semester: semId,
              schedule: prevCourse.schedule
            });
          }
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

        // Check for room matches (only based on course code)
        if (prevCourse.code === course.code && prevCourse.room && prevCourse.room !== 'TBA') {
          matches.roomMatches.push({
            room: prevCourse.room,
            section: prevCourse.section,
            semester: semId,
            faculty: prevCourse.facultyInitial
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
    console.log(`🔍 filterData called with: "${searchText}" (${this._state.currentData.length} total courses)`);

    if (!filter) {
      this._state.filteredData = [...this._state.currentData];
      console.log(`📋 No filter, showing all ${this._state.filteredData.length} courses`);
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
      console.log(`🔍 Filter "${filter}" resulted in ${this._state.filteredData.length} courses`);
    }

    this._state.currentPage = 1;
  },

  /**
   * Sort the filtered data by a given key and direction
   * @param {string} key - The property to sort by
   * @param {'asc'|'desc'} direction - Sort direction for the sorting
   */
  sortData: function(key, direction) {
    // For debugging
    console.log('DataService.sortData called with:', key, direction);

    // Make a fresh copy of the data to ensure sorting works every time
    const data = [...this._state.filteredData];

    // Store current sort key and direction for comparison
    const prevKey = this._sortKey;
    const prevDirection = this._sortDirection;

    // Update current sort settings
    this._sortKey = key;
    this._sortDirection = direction;

    data.sort((a, b) => {
      // 1. PRIMARY SORT: Always prioritize the user-selected column first
      if (key !== 'code' && key !== 'section') {
        let valA, valB;

        // Special handling for different data types
        switch(key) {
          case 'facultyInitial':
            valA = a.facultyInitial || '';
            valB = b.facultyInitial || '';
            break;

          case 'schedule':
            valA = a.schedule?.[0] ? `${a.schedule[0].day} ${a.schedule[0].start}` : '';
            valB = b.schedule?.[0] ? `${b.schedule[0].day} ${b.schedule[0].start}` : '';
            break;

          case 'available':
            valA = a.seats?.available || 0;
            valB = b.seats?.available || 0;
            break;

          case 'booked':
            valA = a.seats?.booked || 0;
            valB = b.seats?.booked || 0;
            break;

          case 'capacity':
            valA = a.seats?.capacity || 0;
            valB = b.seats?.capacity || 0;
            break;

          default:
            valA = a[key];
            valB = b[key];
        }

        // Numeric sort if both are numbers
        if (!isNaN(valA) && !isNaN(valB)) {
          const numCompare = direction === 'asc' ? valA - valB : valB - valA;
          if (numCompare !== 0) return numCompare;
        } else {
          // String sort
          const strCompare = direction === 'asc'
            ? String(valA || '').localeCompare(String(valB || ''))
            : String(valB || '').localeCompare(String(valA || ''));
          if (strCompare !== 0) return strCompare;
        }
      }

      // Special handling for section sorting (as primary sort)
      if (key === 'section') {
        const sectionCompare = direction === 'asc'
          ? String(a.section).localeCompare(String(b.section))
          : String(b.section).localeCompare(String(a.section));
        if (sectionCompare !== 0) return sectionCompare;

        // If sections are equal, fall back to course code
        return String(a.code).localeCompare(String(b.code));
      }

      // 2. SECONDARY SORT: Course code (if not already sorted by it)
      if (key !== 'code') {
        const codeCompare = String(a.code).localeCompare(String(b.code));
        if (codeCompare !== 0) return codeCompare;
      } else {
        // If explicitly sorting by code, apply the requested direction
        const codeCompare = direction === 'asc'
          ? String(a.code).localeCompare(String(b.code))
          : String(b.code).localeCompare(String(a.code));
        if (codeCompare !== 0) return codeCompare;
      }

      // 3. TERTIARY SORT: Section (if not already sorted by it or code)
      if (key !== 'section') {
        return String(a.section).localeCompare(String(b.section));
      }

      return 0;
    });

    // Assign the sorted data back to filteredData
    this._state.filteredData = data;

    // If sort criteria changed, force a re-render by resetting to page 1
    if (prevKey !== key || prevDirection !== direction) {
      this._state.currentPage = 1;
    }
  },

  /**
   * Get current filtered data for current page
   * @returns {Array} Courses for current page
   */
  getCurrentPageData: function() {
    const start = (this._state.currentPage - 1) * CONFIG.pagination.itemsPerPage;
    const end = start + CONFIG.pagination.itemsPerPage;
    const pageData = this._state.filteredData.slice(start, end);
    console.log(`📄 getCurrentPageData: page ${this._state.currentPage}, returning ${pageData.length} courses (${start}-${end} of ${this._state.filteredData.length} filtered)`);
    return pageData;
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