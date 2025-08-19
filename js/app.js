/**
 * Main Application Entry Point
 * Initializes and connects all modules
 */
(async function() {
  'use strict';

  // Add debugging information to the console
  console.log('🚀 Application starting...');

  // Initialize UI first
  UIController.init();
  console.log('🎨 UI initialized');

  try {
    // Initialize data service and preload data
    console.log('📊 Initializing DataService...');
    const startTime = performance.now();
    await DataService.init();
    const endTime = performance.now();
    console.log(`✅ DataService initialized in ${Math.round(endTime - startTime)}ms`);

    // Set default semester (current one)
    const currentSemester = DataService.getCurrentSemester();
    console.log('🎯 Current semester detected:', currentSemester);

    // Check if data is present
    const dataStatus = Object.keys(DataService._semesterData).map(id => {
      return {
        id,
        count: DataService._semesterData[id]?.length || 0,
        loaded: !!DataService._semesterData[id]
      };
    });
    console.log('📋 Semester data status after preload:', dataStatus);

    console.log(`🔄 Loading UI with current semester: ${currentSemester.id}`);
    await UIController.loadSemesterData(currentSemester.id);
    console.log('✅ Semester data loaded into UI');

    console.log('🎉 Course Information Portal initialized successfully');
  } catch (error) {
    console.error('❌ Initialization failed:', error);
    Utils.handleError(error, UIController.elements.tableBody);
  }
})();