/**
 * UI Controller for Course Information Portal
 * Handles UI updates and user interactions
 */
const UIController = {
  // DOM element references
  elements: {
    dataStatus: null,
    tableBody: null,
    searchInput: null,
    clearSearch: null,
    pageInfoBottom: null,
    prevPageBtnBottom: null,
    nextPageBtnBottom: null,
    pageNumbers: null,
    semesterButtonsContainer: null,
    backToTop: null,
    zoomIn: null,
    zoomOut: null,
    tableContainer: null,
    helpButton: null,
    infoModal: null,
    closeModalBtn: null,
    versionNumber: null
  },

  // Application state
  sortState: {
    key: 'code',
    direction: 'asc', // 'asc' or 'desc'
    useCodeAsPrimary: true
  },

  // Table zoom state
  zoomState: {
    level: 'normal', // 'normal', 'zoomed-in', or 'zoomed-out'
  },

  /**
   * Initialize UI controller
   */
  init: function() {
    // Cache DOM elements
    this.elements = {
      dataStatus: document.getElementById('data-status'),
      tableBody: document.getElementById('courseTableBody'),
      searchInput: document.getElementById('searchInput'),
      clearSearch: document.getElementById('clearSearch'),
      pageInfoBottom: document.getElementById('pageInfoBottom'),
      prevPageBtnBottom: document.getElementById('prevPageBottom'),
      nextPageBtnBottom: document.getElementById('nextPageBottom'),
      pageNumbers: document.getElementById('pageNumbers'),
      semesterButtonsContainer: document.getElementById('semesterButtons'),
      backToTop: document.getElementById('backToTop'),
      zoomIn: document.getElementById('zoomIn'),
      zoomOut: document.getElementById('zoomOut'),
      tableContainer: document.querySelector('.table-responsive'),
      helpButton: document.getElementById('helpButton'),
      infoModal: document.getElementById('infoModal'),
      closeModalBtn: document.getElementById('closeModal'),
      versionNumber: document.querySelector('.version-number')
    };

    this.createSemesterButtons();
    this.setupEventListeners();
    this.setupMobileFeatures();
    this.setupZoomControls();
    this.setupHelpModal();
    this.initEventListeners();

    // Add blinking animation to version number
    setTimeout(() => {
      if (this.elements.versionNumber) {
        this.elements.versionNumber.classList.add('blink-animation');
      }
    }, 500); // Short delay for better visual effect

    // Show help modal once on first visit
    this.showHelpModalOnFirstVisit();
  },

  /**
   * Shows the help modal once on first visit
   */
  showHelpModalOnFirstVisit: function() {
    // Check if user has visited before
    if (!localStorage.getItem('hasVisitedBefore')) {
      // Set flag in localStorage to indicate user has visited
      localStorage.setItem('hasVisitedBefore', 'true');

      // Show the help modal after a short delay
      setTimeout(() => {
        if (this.elements.infoModal) {
          this.elements.infoModal.classList.add('visible');
          document.body.style.overflow = 'hidden';
        }
      }, 1000);
    }
  },

  /**
   * Create semester buttons from configuration
   */
  createSemesterButtons: function() {
    if (!this.elements.semesterButtonsContainer) return;

    const container = this.elements.semesterButtonsContainer;
    container.innerHTML = '';

    CONFIG.dataSources.semesters.forEach(semester => {
      const button = document.createElement('button');
      button.className = 'semester-button';
      button.dataset.semesterId = semester.id;
      button.textContent = semester.name;

      if (semester.isCurrent) {
        button.classList.add('active');
      }

      container.appendChild(button);
    });
  },

  /**
   * Set up mobile-specific features
   */
  setupMobileFeatures: function() {
    // Back to top button functionality
    if (this.elements.backToTop) {
      window.addEventListener('scroll', () => {
        if (window.pageYOffset > 300) {
          this.elements.backToTop.classList.add('visible');
        } else {
          this.elements.backToTop.classList.remove('visible');
        }
      });

      this.elements.backToTop.addEventListener('click', (e) => {
        e.preventDefault();
        window.scrollTo({ top: 0, behavior: 'smooth' });
      });
    }

    // Clear search button functionality
    if (this.elements.searchInput && this.elements.clearSearch) {
      this.elements.searchInput.addEventListener('input', () => {
        if (this.elements.searchInput.value) {
          this.elements.clearSearch.classList.add('visible');
        } else {
          this.elements.clearSearch.classList.remove('visible');
        }
      });

      this.elements.clearSearch.addEventListener('click', () => {
        this.elements.searchInput.value = '';
        this.elements.clearSearch.classList.remove('visible');
        this.onSearchInput(); // Refresh results
        this.elements.searchInput.focus(); // Keep focus on search input
      });
    }
  },

  /**
   * Set up zoom controls for mobile table
   */
  setupZoomControls: function() {
    if (!this.elements.zoomIn || !this.elements.zoomOut || !this.elements.tableContainer) return;

    // Set initial state to normal
    this.zoomState.level = 'normal';

    // Zoom in button click handler
    this.elements.zoomIn.addEventListener('click', () => {
      // If already zoomed in, do nothing
      if (this.zoomState.level === 'zoomed-in') return;

      // Remove all zoom classes
      this.elements.tableContainer.classList.remove('zoomed-out', 'normal');

      // Add zoomed-in class
      this.elements.tableContainer.classList.add('zoomed-in');
      this.zoomState.level = 'zoomed-in';
    });

    // Zoom out button click handler
    this.elements.zoomOut.addEventListener('click', () => {
      // If already zoomed out, do nothing
      if (this.zoomState.level === 'zoomed-out') return;

      // Remove all zoom classes
      this.elements.tableContainer.classList.remove('zoomed-in', 'normal');

      // Add zoomed-out class
      this.elements.tableContainer.classList.add('zoomed-out');
      this.zoomState.level = 'zoomed-out';
    });

    // Double-tap handler to reset zoom
    let lastTap = 0;
    this.elements.tableContainer.addEventListener('touchend', (e) => {
      const currentTime = new Date().getTime();
      const tapLength = currentTime - lastTap;

      // If double tap detected (tap within 300ms of last tap)
      if (tapLength < 300 && tapLength > 0) {
        // Reset to normal zoom
        this.elements.tableContainer.classList.remove('zoomed-in', 'zoomed-out');
        this.elements.tableContainer.classList.add('normal');
        this.zoomState.level = 'normal';

        // Prevent default behavior
        e.preventDefault();
      }

      lastTap = currentTime;
    });
  },

  /**
   * Set zoom level for table
   * @param {string} level - Zoom level ('normal', 'zoomed-in', 'zoomed-out')
   */
  setZoomLevel: function(level) {
    if (!this.elements.tableContainer) return;

    this.zoomState.level = level;

    // Update table container class based on zoom level
    this.elements.tableContainer.classList.remove('zoomed-in', 'zoomed-out', 'normal');
    this.elements.tableContainer.classList.add(level);
  },

  /**
   * Set up event listeners for UI elements
   */
  setupEventListeners: function() {
    // Semester button click
    if (this.elements.semesterButtonsContainer) {
      this.elements.semesterButtonsContainer.addEventListener('click', event => {
        if (event.target.classList.contains('semester-button')) {
          this.onSemesterButtonClick(event.target);
        }
      });
    }

    // Search input
    if (this.elements.searchInput) {
      this.elements.searchInput.addEventListener('input', () => {
        this.onSearchInput();
      });
    }

    // Pagination - bottom buttons
    if (this.elements.prevPageBtnBottom) {
      this.elements.prevPageBtnBottom.addEventListener('click', () => {
        this.onPrevPageClick();
      });
    }

    if (this.elements.nextPageBtnBottom) {
      this.elements.nextPageBtnBottom.addEventListener('click', () => {
        this.onNextPageClick();
      });
    }

    // Handle clicks on page numbers for mobile
    if (this.elements.pageNumbers) {
      this.elements.pageNumbers.addEventListener('click', (e) => {
        if (e.target.classList.contains('page-number')) {
          const pageNum = parseInt(e.target.textContent);
          if (!isNaN(pageNum)) {
            this.goToPage(pageNum);
          }
        }
      });
    }
  },

  /**
   * Set up the help button and info modal
   */
  setupHelpModal: function() {
    if (!this.elements.helpButton || !this.elements.infoModal || !this.elements.closeModalBtn) return;

    // Show modal when help button is clicked
    this.elements.helpButton.addEventListener('click', () => {
      this.elements.infoModal.classList.add('visible');
      // Prevent body scrolling when modal is open
      document.body.style.overflow = 'hidden';
    });

    // Hide modal when close button is clicked
    this.elements.closeModalBtn.addEventListener('click', () => {
      this.elements.infoModal.classList.remove('visible');
      // Restore body scrolling
      document.body.style.overflow = '';
    });

    // Hide modal when clicking outside the modal content
    this.elements.infoModal.addEventListener('click', (event) => {
      if (event.target === this.elements.infoModal) {
        this.elements.infoModal.classList.remove('visible');
        document.body.style.overflow = '';
      }
    });

    // Hide modal when pressing Escape key
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && this.elements.infoModal.classList.contains('visible')) {
        this.elements.infoModal.classList.remove('visible');
        document.body.style.overflow = '';
      }
    });
  },

  /**
   * Set up all event listeners
   */
  initEventListeners: function() {
    // Sorting headers
    document.querySelectorAll('th.sortable').forEach(th => {
      th.addEventListener('click', (e) => {
        const key = th.getAttribute('data-sort');
        this.handleSort(key);
      });
    });
  },

  /**
   * Handle sort column click
   * @param {string} key - The column key to sort by
   */
  handleSort: function(key) {
    // If clicking the same column, toggle direction
    if (this.sortState.key === key) {
      this.sortState.direction = this.sortState.direction === 'asc' ? 'desc' : 'asc';
    } else {
      // New column, reset to ascending
      this.sortState.key = key;
      this.sortState.direction = 'asc';
    }

    console.log('Sorting by:', key, 'Direction:', this.sortState.direction);

    // Apply sorting
    DataService.sortData(this.sortState.key, this.sortState.direction);

    // Update UI to reflect the sort
    this.updateSortIcons();
    this.updateDisplay();
  },

  /**
   * Go to a specific page number
   * @param {number} pageNum - Page number to navigate to
   */
  goToPage: function(pageNum) {
    const pagination = DataService.getPaginationInfo();
    if (pageNum < 1 || pageNum > pagination.totalPages) return;

    // Set current page in DataService
    DataService._state.currentPage = pageNum;
    this.updateDisplay();

    // Scroll back to top of table for better UX
    document.querySelector('.table-responsive').scrollIntoView({ behavior: 'smooth' });
  },

  /**
   * Handle semester button click
   * @param {HTMLElement} button - Clicked button element
   */
  onSemesterButtonClick: function(button) {
    const semesterId = button.dataset.semesterId;

    // Update active button - with null check
    const activeButton = document.querySelector('.semester-button.active');
    if (activeButton) {
      activeButton.classList.remove('active');
    }
    button.classList.add('active');

    // Do NOT clear search bar here

    // Load semester data
    this.loadSemesterData(semesterId);
  },

  /**
   * Handle search input changes
   */
  onSearchInput: function() {
    const searchText = this.elements.searchInput.value;
    DataService.filterData(searchText);
    this.updateDisplay();
  },

  /**
   * Handle previous page button click
   */
  onPrevPageClick: function() {
    if (DataService.prevPage()) {
      this.updateDisplay();
      // Scroll back to top of table for better UX
      document.querySelector('.table-responsive').scrollIntoView({ behavior: 'smooth' });
    }
  },

  /**
   * Handle next page button click
   */
  onNextPageClick: function() {
    if (DataService.nextPage()) {
      this.updateDisplay();
      // Scroll back to top of table for better UX
      document.querySelector('.table-responsive').scrollIntoView({ behavior: 'smooth' });
    }
  },

  /**
   * Load data for a specific semester
   * @param {string} semesterId - Semester identifier
   */
  loadSemesterData: async function(semesterId) {
    try {
      const semester = DataService.getSemesterConfig(semesterId);

      // Reset status to a loading state first
      this.updateDataStatus('loading');

      // Load the semester data
      await DataService.setCurrentSemester(semesterId);

      // Re-apply search filter after loading new semester
      this.onSearchInput();

      // If the status is still showing loading, set it to the appropriate status
      // This happens if the specific loaders didn't update the status
      if (this.elements.dataStatus.textContent.includes('Loading')) {
        // Set local data status for all semesters
        this.updateDataStatus('localData', {
          semester: semester.name.split(' ')[0],
          year: semester.year
        });
      }
    } catch (error) {
      // Show error status
      this.updateDataStatus('offlineData');
      Utils.handleError(error, this.elements.tableBody);
    }
  },

  /**
   * Update the table and pagination display
   */
  updateDisplay: function() {
    const courseData = DataService.getCurrentPageData();
    this.renderTable(courseData);
    this.updatePagination();
    this.updateSortIcons();
  },

  /**
   * Render course table with provided data
   * @param {Array} courses - Array of course objects to display
   */
  renderTable: function(courses) {
    console.log(`🎨 renderTable called with ${courses?.length || 0} courses`);

    if (!this.elements.tableBody) {
      console.error('❌ Table body element not found in DOM!');
      return;
    }

    // Clear existing table content
    this.elements.tableBody.innerHTML = '';

    // Check if data is available
    if (!courses || courses.length === 0) {
      console.log(`⚠️ No courses to render`);
      this.elements.tableBody.innerHTML = `
        <tr>
          <td colspan="9">No courses found. Please try another search or select a different semester.</td>
        </tr>
      `;
      return;
    }

    console.log(`🔄 Rendering table with ${courses.length} courses`);
    console.log(`📊 Sample course data:`, courses[0]);

    try {
      courses.forEach(course => {
        const row = document.createElement('tr');
        let facultyInfo = course.faculty;
        let seatInfo = ['N/A', 'N/A', 'N/A'];

        // Format seat information if available
        if (course.seats && typeof course.seats.available === 'number') {
          seatInfo = [
            `<span class="seats-available">${course.seats.available}</span>`,
            `<span class="seats-full">${course.seats.booked}</span>`,
            `<span>${course.seats.capacity}</span>`
          ];
        }

        // Handle TBA faculty with potential matches
        if (course.faculty === 'TBA') {
          const matches = DataService.findMatches(course);
          facultyInfo = this.buildMatchInfo(matches);
        }

        // Ensure schedule data exists before accessing it
        const scheduleHtml = course.schedule && Array.isArray(course.schedule)
          ? course.schedule.map(s => `${s.day} ${Utils.formatTime(s.start)}`).join('<br>')
          : 'TBA';

        // Format exam date in DD/MM/YYYY format with time on second line
        let examDateHtml = 'TBA';
        if (course.examDate && course.examDate !== 'TBA') {
          // Parse the date and format it
          try {
            const dateParts = course.examDate.split(' ');
            let dateStr = dateParts[0]; // Date part
            let timeStr = dateParts.length > 1 ? dateParts[1] : ''; // Time part

            // Format date as DD/MM/YYYY if it contains numbers and slashes or dashes
            if (/[\d\/\-]/.test(dateStr)) {
              // Split by any common date delimiter
              const parts = dateStr.split(/[\/\-\.]/);
              if (parts.length === 3) {
                // Determine format based on number range (assuming year is largest)
                if (parseInt(parts[2]) > 31) {
                  // Format is MM/DD/YYYY or DD/MM/YYYY
                  const day = parseInt(parts[0]) > 12 ? parts[0] : parts[1];
                  const month = parseInt(parts[0]) <= 12 ? parts[0] : parts[1];
                  const year = parts[2];
                  dateStr = `${day}/${month}/${year}`;
                }
              }
            }

            examDateHtml = `
              <div class="exam-date">
                <span class="exam-date-day">${dateStr}</span>
                <span class="exam-date-time">${timeStr}</span>
              </div>
            `;
          } catch (e) {
            examDateHtml = course.examDate; // Fallback to original format
          }
        }

        // All cells are now centered by default in CSS
        row.innerHTML = `
          <td>${course.code || 'N/A'}</td>
          <td>${course.section || 'N/A'}</td>
          <td>${course.faculty !== 'TBA' ? course.facultyInitial : 'TBA'}</td>
          <td>${facultyInfo}</td>
          <td>${scheduleHtml}</td>
          <td>${seatInfo[0]}</td>
          <td>${seatInfo[1]}</td>
          <td>${seatInfo[2]}</td>
          <td>${examDateHtml}</td>
        `;

        this.elements.tableBody.appendChild(row);
      });
    } catch (error) {
      console.error('Error rendering table:', error);
      this.elements.tableBody.innerHTML = `
        <tr>
          <td colspan="9">Error rendering course data: ${error.message}</td>
        </tr>
      `;
    }
  },

  /**
   * Display courses in sorted order
   * @param {Array} courses - Array of course objects to display
   */
  displayCourses: function(courses) {
    const coursesCopy = [...courses]; // Create a copy first
    const sortedCourses = coursesCopy.sort((a, b) => a.courseCode.localeCompare(b.courseCode));
    const tbody = document.getElementById('courseTableBody');
    tbody.innerHTML = '';

    sortedCourses.forEach(course => {
      const row = document.createElement('tr');
      row.innerHTML = `
        <td>${course.code}</td>
        <td>${course.section}</td>
        <td>${course.faculty}</td>
        <td>${course.schedule.map(s => `${s.day} ${Utils.formatTime(s.start)}`).join('<br>')}</td>
        <td>${course.seats.available}</td>
        <td>${course.seats.booked}</td>
        <td>${course.seats.capacity}</td>
        <td>${course.examDate}</td>
      `;
      tbody.appendChild(row);
    });
  },

  /**
   * Update pagination information and button states
   */
  updatePagination: function() {
    const pagination = DataService.getPaginationInfo();

    // Update bottom pagination info
    this.elements.pageInfoBottom.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages}`;

    // Update button states
    this.elements.prevPageBtnBottom.disabled = !pagination.hasPrevPage;
    this.elements.nextPageBtnBottom.disabled = !pagination.hasNextPage;

    // Generate page number buttons for mobile
    this.generatePageNumbers(pagination);
  },

  /**
   * Generate page number buttons for mobile pagination
   * @param {Object} pagination - Pagination information
   */
  generatePageNumbers: function(pagination) {
    const { currentPage, totalPages } = pagination;
    this.elements.pageNumbers.innerHTML = '';

    // Show at most 5 page numbers, centered around current page
    let startPage = Math.max(1, currentPage - 2);
    const endPage = Math.min(totalPages, startPage + 4);

    // Adjust start page if we're near the end
    if (endPage - startPage < 4) {
      startPage = Math.max(1, endPage - 4);
    }

    // Always show first page
    if (startPage > 1) {
      const pageEl = document.createElement('span');
      pageEl.className = 'page-number';
      pageEl.textContent = '1';
      this.elements.pageNumbers.appendChild(pageEl);

      if (startPage > 2) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        this.elements.pageNumbers.appendChild(ellipsis);
      }
    }

    // Generate visible page numbers
    for (let i = startPage; i <= endPage; i++) {
      const pageEl = document.createElement('span');
      pageEl.className = 'page-number';
      if (i === currentPage) pageEl.classList.add('active');
      pageEl.textContent = i;
      this.elements.pageNumbers.appendChild(pageEl);
    }

    // Always show last page
    if (endPage < totalPages) {
      if (endPage < totalPages - 1) {
        const ellipsis = document.createElement('span');
        ellipsis.className = 'page-ellipsis';
        ellipsis.textContent = '...';
        this.elements.pageNumbers.appendChild(ellipsis);
      }

      const pageEl = document.createElement('span');
      pageEl.className = 'page-number';
      pageEl.textContent = totalPages;
      this.elements.pageNumbers.appendChild(pageEl);
    }
  },

  /**
   * Build HTML for displaying faculty match info
   * @param {Object} matches - Match information object
   * @returns {string} HTML markup for match information
   */
  buildMatchInfo: function(matches) {
    // Create TBA info with or without the potential faculty text
    let html = '<div class="tba-info">TBA';

    // Only add "(Potential Faculty)" if we actually have any matches
    if (matches.sectionHistory.length > 0 || matches.timeMatches.length > 0) {
      html += ' (Potential Faculty)';
    }
    html += '</div>';

    // Section history matches
    if (matches.sectionHistory.length > 0) {
      html += `
        <div class="semester-group">
          <div class="section-history-match">
            Previous Section Faculty:
            ${matches.sectionHistory.map(m => {
              // Determine correct year tag based on semester
              const semConfig = DataService.getSemesterConfig(m.semester);
              const year = semConfig ? semConfig.year : '?';

              // Format semester name for display
              let semesterName;
              if (m.semester === 'summer25') {
                semesterName = 'SUMMER';
              } else if (semConfig) {
                semesterName = semConfig.name.split(' ')[0].toUpperCase();
              } else {
                semesterName = m.semester.toUpperCase();
              }

              return `
              <div>
                ${m.faculty}
                <span class="semester-tag">(${semesterName}-${year})</span>
              </div>
              `;
            }).join('')}
          </div>
        </div>`;
    }

    // Time matches
    if (matches.timeMatches.length > 0) {
      const uniqueFaculty = [];
      const seenFaculty = new Set();

      matches.timeMatches.forEach(match => {
        if (!seenFaculty.has(match.faculty)) {
          uniqueFaculty.push(match);
          seenFaculty.add(match.faculty);
        }
      });

      html += `
        <div class="semester-group">
          <div class="time-match">
            Time Match Faculty:
            ${uniqueFaculty.map(match => {
              // Determine correct year tag based on semester
              const semConfig = DataService.getSemesterConfig(match.semester);
              const year = semConfig ? semConfig.year : '?';

              // Format semester name for display
              let semesterName;
              if (match.semester === 'summer25') {
                semesterName = 'SUMMER';
              } else if (semConfig) {
                semesterName = semConfig.name.split(' ')[0].toUpperCase();
              } else {
                semesterName = match.semester.toUpperCase();
              }

              return `
              <div>
                ${match.faculty}
                <span class="semester-tag">${semesterName}-${year} Sec ${match.section}</span>
              </div>
              `;
            }).join('')}
          </div>
        </div>`;
    }

    // Room matches
    if (matches.roomMatches && matches.roomMatches.length > 0) {
      const uniqueRooms = [];
      const seenRooms = new Set();

      matches.roomMatches.forEach(match => {
        if (!seenRooms.has(match.room)) {
          uniqueRooms.push(match);
          seenRooms.add(match.room);
        }
      });

      html += `
        <div class="semester-group">
          <div class="room-match">
            Room Match:
            ${uniqueRooms.map(match => {
              // Determine correct year tag based on semester
              const semConfig = DataService.getSemesterConfig(match.semester);
              const year = semConfig ? semConfig.year : '?';

              // Format semester name for display
              let semesterName;
              if (match.semester === 'summer25') {
                semesterName = 'SUMMER';
              } else if (semConfig) {
                semesterName = semConfig.name.split(' ')[0].toUpperCase();
              } else {
                semesterName = match.semester.toUpperCase();
              }

              return `
              <div>
                <span class="room-number">${match.room}</span>
                <span class="semester-tag">${semesterName}-${year}</span>
              </div>
              `;
            }).join('')}
          </div>
        </div>`;
    }

    return html;
  },

  /**
   * Update data status display based on predefined status types
   * @param {string} statusType - Type of status to display (liveData/offlineData/localData)
   * @param {Object} params - Optional parameters for text replacement
   */
  updateDataStatus: function(statusType, params = {}) {
    if (!this.elements.dataStatus) return;

    const statusConfig = CONFIG.statusMessages[statusType];
    if (!statusConfig) return;

    let statusText = statusConfig.text;

    // Replace template parameters
    if (params.semester) {
      statusText = statusText.replace('{semester}', params.semester);
    }
    if (params.year) {
      statusText = statusText.replace('{year}', params.year);
    }

    // Add loading spinner for loading status
    if (statusType === 'loading') {
      statusText = `<span class="loader"></span>${statusText}`;
    }

    this.elements.dataStatus.innerHTML = statusText;
    this.elements.dataStatus.style.backgroundColor = statusConfig.bgColor;
    this.elements.dataStatus.style.color = statusConfig.textColor;
  },

  /**
   * Update sort icons in table headers
   */
  updateSortIcons: function() {
    document.querySelectorAll('th.sortable').forEach(th => {
      const key = th.getAttribute('data-sort');

      // Remove sorted class and direction attributes from all headers
      th.classList.remove('sorted');
      th.removeAttribute('data-direction');

      // Check if this is the current sort column
      if (this.sortState.key === key) {
        // Add sorted class to the current sort column
        th.classList.add('sorted');

        // Set the direction attribute for CSS to target
        th.setAttribute('data-direction', this.sortState.direction);

        // Clear any previous HTML content in the sort icon
        const icon = th.querySelector('.sort-icon');
        if (icon) {
          // Let CSS handle the icon display via ::before pseudo-element
          icon.innerHTML = '';
        }
      }
    });
  }
};

/**
 * Sort table data
 * @param {Array} tableData - Array of table data objects
 * @returns {Array} Sorted table data
 */
function sortTableData(tableData) {
  return [...tableData].sort((a, b) => {
    // Always sort by course code first
    const courseCodeComparison = a.code.localeCompare(b.code);
    if (courseCodeComparison !== 0) {
      return courseCodeComparison;
    }
    // Then by section
    return a.section.localeCompare(b.section);
  });
}

/**
 * Sort data
 * @param {Array} data - Array of data objects
 * @returns {Array} Sorted data
 */
function sortData(data) {
  return [...data].sort((a, b) => {
    // Always sort by course code first
    const codeComparison = a.code.localeCompare(b.code);
    if (codeComparison !== 0) return codeComparison;

    // Secondary sort by section if course codes are equal
    return a.section.localeCompare(b.section);
  });
}