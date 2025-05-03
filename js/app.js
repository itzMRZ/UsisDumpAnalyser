/**
 * Main Application Entry Point
 * Initializes and connects all modules
 */
(async function() {
  'use strict';

  // Add debugging information to the console
  console.log('Application starting...');

  // Initialize UI first
  UIController.init();
  console.log('UI initialized');

  try {
    // Initialize data service and preload data
    console.log('Initializing DataService...');
    await DataService.init();
    console.log('DataService initialized');

    // Set default semester (current one)
    const currentSemester = DataService.getCurrentSemester();
    console.log('Current semester:', currentSemester);

    // Check if data is present
    console.log('Semester data loaded:', Object.keys(DataService._semesterData).map(id => {
      return {
        id,
        count: DataService._semesterData[id]?.length || 0
      };
    }));

    await UIController.loadSemesterData(currentSemester.id);
    console.log('Semester data loaded into UI');

    console.log('Course Information Portal initialized successfully');
  } catch (error) {
    console.error('Initialization failed:', error);
    Utils.handleError(error, UIController.elements.tableBody);
  }
})();

function sortTableData(data) {
    return data.sort((a, b) => {
        // Always sort by course code first
        const courseCodeA = a.courseCode;
        const courseCodeB = b.courseCode;
        return courseCodeA.localeCompare(courseCodeB);
    });
}