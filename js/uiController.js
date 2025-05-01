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
    pageInfo: null,
    pageInfoBottom: null,
    prevPageBtn: null,
    nextPageBtn: null,
    prevPageBtnBottom: null,
    nextPageBtnBottom: null,
    pageNumbers: null,
    semesterButtonsContainer: null,
    backToTop: null
  },

  /**
   * Initialize UI controller
   */
  init: function() {
    // Cache DOM elements
    this.elements = {
      dataStatus: document.getElementById('data-status'),
      tableBody: document.getElementById('courseTable'),
      searchInput: document.getElementById('searchInput'),
      clearSearch: document.getElementById('clearSearch'),
      pageInfo: document.getElementById('pageInfo'),
      pageInfoBottom: document.getElementById('pageInfoBottom'),
      prevPageBtn: document.getElementById('prevPage'),
      nextPageBtn: document.getElementById('nextPage'),
      prevPageBtnBottom: document.getElementById('prevPageBottom'),
      nextPageBtnBottom: document.getElementById('nextPageBottom'),
      pageNumbers: document.getElementById('pageNumbers'),
      semesterButtonsContainer: document.getElementById('semesterButtons'),
      backToTop: document.getElementById('backToTop')
    };

    this.createSemesterButtons();
    this.setupEventListeners();
    this.setupMobileFeatures();
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

    // Clear search button functionality
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
  },

  /**
   * Set up event listeners for UI elements
   */
  setupEventListeners: function() {
    // Semester button click
    this.elements.semesterButtonsContainer.addEventListener('click', event => {
      if (event.target.classList.contains('semester-button')) {
        this.onSemesterButtonClick(event.target);
      }
    });

    // Search input
    this.elements.searchInput.addEventListener('input', () => {
      this.onSearchInput();
    });

    // Pagination - top buttons
    this.elements.prevPageBtn.addEventListener('click', () => {
      this.onPrevPageClick();
    });

    this.elements.nextPageBtn.addEventListener('click', () => {
      this.onNextPageClick();
    });

    // Pagination - bottom buttons
    this.elements.prevPageBtnBottom.addEventListener('click', () => {
      this.onPrevPageClick();
    });

    this.elements.nextPageBtnBottom.addEventListener('click', () => {
      this.onNextPageClick();
    });

    // Handle clicks on page numbers for mobile
    this.elements.pageNumbers.addEventListener('click', (e) => {
      if (e.target.classList.contains('page-number')) {
        const pageNum = parseInt(e.target.textContent);
        if (!isNaN(pageNum)) {
          this.goToPage(pageNum);
        }
      }
    });
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

    // Update active button
    document.querySelector('.semester-button.active')?.classList.remove('active');
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
        if (semester.id === 'spring') {
          this.updateDataStatus('localData', {
            semester: 'Spring',
            year: '2025'
          });
        } else if (semester.id !== 'summer25') {
          this.updateDataStatus('localData', {
            semester: semester.name.split(' ')[0],
            year: semester.year
          });
        }
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
  },

  /**
   * Render course table with provided data
   * @param {Array} courses - Array of course objects to display
   */
  renderTable: function(courses) {
    this.elements.tableBody.innerHTML = '';

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

      // No more mobile-hide classes - show all columns on mobile
      row.innerHTML = `
        <td>${course.code}</td>
        <td>${course.section}</td>
        <td>${course.faculty !== 'TBA' ? course.facultyInitial : 'TBA'}</td>
        <td>${facultyInfo}</td>
        <td>${course.schedule.map(s => `${s.day} ${Utils.formatTime(s.start)}`).join('<br>')}</td>
        <td>${seatInfo[0]}</td>
        <td>${seatInfo[1]}</td>
        <td>${seatInfo[2]}</td>
        <td>${course.examDate}</td>
      `;

      this.elements.tableBody.appendChild(row);
    });
  },

  /**
   * Update pagination information and button states
   */
  updatePagination: function() {
    const pagination = DataService.getPaginationInfo();

    // Update top and bottom pagination info
    this.elements.pageInfo.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages}`;
    this.elements.pageInfoBottom.textContent = `Page ${pagination.currentPage} of ${pagination.totalPages}`;

    // Update button states
    this.elements.prevPageBtn.disabled = !pagination.hasPrevPage;
    this.elements.nextPageBtn.disabled = !pagination.hasNextPage;
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
    let html = `<div class="tba-info">TBA (Potential Faculty)</div>`;

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
              const semesterName = m.semester === 'summer25' ? 'SUMMER' :
                                    (semConfig ? semConfig.name.split(' ')[0].toUpperCase() : m.semester.toUpperCase());
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
              const semesterName = match.semester === 'summer25' ? 'SUMMER' :
                                  (semConfig ? semConfig.name.split(' ')[0].toUpperCase() : match.semester.toUpperCase());
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
  }
};