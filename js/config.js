/**
 * Configuration settings for the Course Information Portal
 */
const CONFIG = {
  // Data Sources
  dataSources: {
    cdnUrl: 'https://usis-cdn.eniamza.com/connect.json',
    semesters: [
      {
        id: 'summer25',
        name: 'Summer 2025',
        file: 'summer-25.json',
        year: '2025',
        dataFormat: 'spring25',
        isCurrent: true
      },
      {
        id: 'spring',
        name: 'Spring 2025',
        file: 'spring-25.json',
        year: '2025',
        dataFormat: 'spring25'
      },
      {
        id: 'fall',
        name: 'Fall 2024',
        file: 'fall-24.json',
        year: '2024',
        dataFormat: 'old'
      },
      {
        id: 'summer',
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
    storageKey: 'coursePortalData',
    expirationMinutes: 60 // Cache data for 60 minutes
  },

  // UI Status messages
  statusMessages: {
    loading: {
      text: '⏳ Loading semester data...',
      bgColor: '#e2e3e5',
      textColor: '#383d41'
    },
    liveData: {
      text: '🟢 Live Data: Connected to CDN',
      bgColor: '#d4edda',
      textColor: '#155724'
    },
    offlineData: {
      text: '🔴 Offline Data: Loaded from Local File',
      bgColor: '#f8d7da',
      textColor: '#721c24'
    },
    localData: {
      text: '🟠 Local Data: {semester} {year} Semester',
      bgColor: '#fff3cd',
      textColor: '#856404'
    }
  }
};