/**
 * Main Application Entry Point
 * Initializes and connects all modules
 */
(async function() {
  'use strict';

  // Initialize UI first
  UIController.init();

  try {
    // Initialize data service and preload data
    await DataService.init();

    // Set default semester (current one)
    const currentSemester = DataService.getCurrentSemester();
    await UIController.loadSemesterData(currentSemester.id);

    console.log('Course Information Portal initialized successfully');
  } catch (error) {
    console.error('Initialization failed:', error);
    Utils.handleError(error, UIController.elements.tableBody);
  }
})();