/**
 * Configuration settings for the Course Information Portal
 */
const CONFIG = {
  // Global debug flag (set to true for verbose console logging)
  debug: false,
  // Data Sources
  dataSources: {
    cdnUrl: 'https://usis-cdn.eniamza.com/connect.json',
    semesters: [
      {
        id: 'spring26',
        name: 'Spring 2026',
        file: 'spring-26.json',
        year: '2026',
        dataFormat: 'spring25',
        isCurrent: true
      },
      {
        id: 'fall25',           // ← Fixed: unique ID
        name: 'Fall 2025',
        file: 'fall-25.json',
        year: '2025',
        dataFormat: 'spring25'
      },
      {
        id: 'summer25',         // ← Fixed: matches dataService expectation
        name: 'Summer 2025',
        file: 'summer-25.json',
        year: '2025',
        dataFormat: 'spring25'
        // Summer 25 is NOT current - it's a past semester
      },
      {
        id: 'spring25',         // ← Fixed: unique ID
        name: 'Spring 2025',
        file: 'spring-25.json',
        year: '2025',
        dataFormat: 'spring25'
      },
      {
        id: 'fall24',           // ← Fixed: unique ID
        name: 'Fall 2024',
        file: 'fall-24.json',
        year: '2024',
        dataFormat: 'old'
      },
      {
        id: 'summer24',         // ← Fixed: unique ID
        name: 'Summer 2024',
        file: 'summer-24.json',
        year: '2024',
        dataFormat: 'old'
      }
    ]
  },

  // Pagination settings
  pagination: {
    itemsPerPage: 50
  },

  // Cache settings
  cache: {
    storageKey: 'coursePortalData_v2',
    expirationMinutes: 60 // Cache data for 60 minutes
  },

  // UI Status messages - Seamless integration
  statusMessages: {
    loading: {
      text: 'Loading data...',
      bgColor: 'transparent',
      textColor: 'inherit'
    },
    liveData: {
      text: '● Live',
      bgColor: '#dcfce7',
      textColor: '#16a34a'
    },
    offlineData: {
      text: '● Offline',
      bgColor: '#fee2e2',
      textColor: '#dc2626'
    },
    localData: {
      text: '● Archive: {semester} {year}',
      bgColor: '#fff7ed',
      textColor: '#ea580c'
    }
  }
};