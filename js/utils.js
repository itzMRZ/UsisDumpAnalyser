/**
 * Utility functions for the Course Information Portal
 */
const Utils = {
  /**
   * Converts time string (e.g., "8:00 AM") to minutes since midnight
   * @param {string} timeStr - Time in format "HH:MM AM/PM"
   * @return {number} Minutes since midnight
   */
  timeToMinutes: function(timeStr) {
    if (!timeStr) return 0;
    const [timePart, period] = timeStr.split(/(?=[AP]M)/i);
    const [hours, minutes] = timePart.split(':').map(Number);
    let total = hours * 60 + minutes;
    if (period?.toUpperCase() === 'PM' && hours < 12) total += 720;
    if (period?.toUpperCase() === 'AM' && hours === 12) total -= 720;
    return total;
  },

  /**
   * Converts minutes since midnight to formatted time string
   * @param {number} minutes - Minutes since midnight
   * @return {string} Formatted time string (e.g., "8:00 AM")
   */
  formatTime: function(minutes) {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    const period = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${mins.toString().padStart(2, '0')} ${period}`;
  },

  /**
   * Normalize course data based on format ("spring25" vs. "old")
   * @param {Array} data - Raw course data array
   * @param {string} format - Data format identifier
   * @return {Array} Normalized course data
   */
  normalizeCourseData: function(data, format) {
    return data.map(course => {
      const section = format === 'spring25'
        ? course.sectionName
        : (course.courseDetails?.match(/\[(.*?)\]/) || [,''])[1];
      const examDate = format === 'spring25'
        ? (course.sectionSchedule?.finalExamDetail || course.examDate || 'TBA')
        : (course.examDate || course.dayNo || 'TBA');
      let seats = null;
      if (format !== 'spring25') {
        if (course.defaultSeatCapacity && course.totalFillupSeat && course.availableSeat) {
          seats = {
            available: parseInt(course.availableSeat),
            booked: parseInt(course.totalFillupSeat),
            capacity: parseInt(course.defaultSeatCapacity)
          };
        }
      } else {
        seats = {
          available: parseInt(course.capacity || 0) - parseInt(course.consumedSeat || 0),
          booked: parseInt(course.consumedSeat || 0),
          capacity: parseInt(course.capacity || 0),
          waitlist: parseInt(course.waitlistSeats || 0)
        };
      }

      // Extract room information
      const room = format === 'spring25'
        ? this.extractRoomInfo(course.sectionSchedule?.classSchedules)
        : (course.roomNo || 'TBA');

      return {
        code: course.courseCode,
        section: section,
        faculty: format === 'spring25' ? (course.faculties || 'TBA') : (course.empName || 'TBA'),
        facultyInitial: format === 'spring25' ? (course.faculties || 'TBA') : (course.empShortName || 'TBA'),
        schedule: this.getComparableSchedule(course, format),
        examDate: examDate,
        seats: seats,
        room: room
      };
    });
  },

  /**
   * Extract room information from class schedules
   * @param {Array} classSchedules - Array of class schedule objects
   * @return {string} Room information or TBA
   */
  extractRoomInfo: function(classSchedules) {
    if (!classSchedules || classSchedules.length === 0) return 'TBA';

    // Try to get room information from the first schedule
    const firstSchedule = classSchedules[0];
    return firstSchedule.room || firstSchedule.roomNo || 'TBA';
  },

  /**
   * Build a unified schedule array from classSchedule and LabSchedule (for old format)
   * @param {Object} course - Course data object
   * @param {string} format - Data format identifier
   * @return {Array} Unified schedule array
   */
  getComparableSchedule: function(course, format) {
    if (format === 'spring25') {
      return (course.sectionSchedule?.classSchedules || []).map(s => ({
        day: s.day.substring(0, 3).toUpperCase(),
        start: this.timeToMinutes(s.startTime),
        end: this.timeToMinutes(s.endTime)
      }));
    }
    let scheduleEntries = [];
    if (course.classSchedule) {
      scheduleEntries = scheduleEntries.concat(course.classSchedule.split('\n'));
    }
    if (course.LabSchedule) {
      scheduleEntries = scheduleEntries.concat(course.LabSchedule.split('\n'));
    }
    return scheduleEntries.map(entry => {
      const match = entry.match(/(\w+)\((\d+:\d+ [AP]M)/i);
      return match ? {
        day: match[1].substring(0, 3).toUpperCase(),
        start: this.timeToMinutes(match[2]),
        end: null
      } : null;
    }).filter(Boolean);
  },

  /**
   * Save data to localStorage with expiration
   * @param {string} key - Storage key
   * @param {*} data - Data to store
   * @param {number} expirationMinutes - Minutes until expiration
   */
  saveToCache: function(key, data, expirationMinutes) {
    const now = new Date();
    const item = {
      data: data,
      expiry: now.getTime() + (expirationMinutes * 60 * 1000)
    };
    try {
      localStorage.setItem(key, JSON.stringify(item));
    } catch (error) {
      console.warn('Cache save failed:', error);
    }
  },

  /**
   * Retrieve data from localStorage if not expired
   * @param {string} key - Storage key
   * @return {*|null} Retrieved data or null if expired/not found
   */
  getFromCache: function(key) {
    try {
      const itemStr = localStorage.getItem(key);
      if (!itemStr) return null;

      const item = JSON.parse(itemStr);
      const now = new Date();

      if (now.getTime() > item.expiry) {
        localStorage.removeItem(key);
        return null;
      }

      return item.data;
    } catch (error) {
      console.warn('Cache retrieval failed:', error);
      return null;
    }
  },

  /**
   * Generate a cache key for semester data
   * @param {string} semesterId - Semester identifier
   * @return {string} Cache key
   */
  getSemesterCacheKey: function(semesterId) {
    return `${CONFIG.cache.storageKey}_${semesterId}`;
  },

  /**
   * Handle and display errors
   * @param {Error} error - Error object
   * @param {HTMLElement} tableBody - Table body element to show error
   */
  handleError: function(error, tableBody) {
    console.error('Error:', error);
    tableBody.innerHTML = `
      <tr>
        <td colspan="9">
          <div class="error-message">${error.message}</div>
        </td>
      </tr>
    `;
  }
};