/**
 * Week-based date utility functions for slot fetching optimization
 */

export interface WeekInfo {
  weekNumber: number;
  startDate: string; // Monday of the week (YYYY-MM-DD)
  endDate: string;   // Sunday of the week (YYYY-MM-DD)
  dates: string[];   // All 7 days of the week (YYYY-MM-DD)
  isCurrentWeek: boolean;
  isPastWeek: boolean;
}

/**
 * Get detailed week information for a specified number of weeks starting from a date
 * @param startDate - Starting date (YYYY-MM-DD format)
 * @param weeks - Number of weeks to generate (default: 4)
 * @returns Array of WeekInfo objects with detailed week information
 */
export function getWeekDates(startDate: string, weeks: number = 4): WeekInfo[] {
  const weekInfos: WeekInfo[] = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  // Get Monday of the starting week
  const currentWeekStart = new Date(start);
  const dayOfWeek = currentWeekStart.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday = 0
  currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  // Generate specified number of weeks
  for (let week = 0; week < weeks; week++) {
    const weekStart = new Date(currentWeekStart);
    weekStart.setDate(currentWeekStart.getDate() + (week * 7));
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6); // Sunday
    
    // Generate all 7 days of the week
    const weekDates: string[] = [];
    for (let day = 0; day < 7; day++) {
      const date = new Date(weekStart);
      date.setDate(weekStart.getDate() + day);
      weekDates.push(date.toISOString().split('T')[0]);
    }
    
    // Check if this is the current week
    const isCurrentWeek = weekStart <= today && today <= weekEnd;
    
    // Check if this is a past week
    const isPastWeek = weekEnd < today;
    
    weekInfos.push({
      weekNumber: week + 1,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      dates: weekDates,
      isCurrentWeek,
      isPastWeek
    });
  }
  
  console.log(`📅 Generated ${weeks} weeks of detailed information:`, {
    startingFrom: weekInfos[0]?.startDate,
    endingAt: weekInfos[weekInfos.length - 1]?.endDate,
    totalWeeks: weekInfos.length,
    currentWeekIndex: weekInfos.findIndex(w => w.isCurrentWeek),
    weekInfos: weekInfos
  });
  
  return weekInfos;
}

/**
 * Generate week-based dates for slot fetching (simplified version)
 * Returns only the Monday of each week for API optimization
 * @param startDate - Starting date (YYYY-MM-DD format)
 * @param weeks - Number of weeks to generate (default: 4)
 * @returns Array of Monday dates (YYYY-MM-DD format)
 */
export function generateWeekBasedDates(startDate: string, weeks: number = 4): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  
  // Get Monday of the starting week
  const currentWeekStart = new Date(start);
  const dayOfWeek = currentWeekStart.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // Adjust for Sunday = 0
  currentWeekStart.setDate(currentWeekStart.getDate() + daysToMonday);
  
  // Add specified number of weeks (one Monday per week)
  // Each Monday will create a booking that returns slots for that week
  for (let week = 0; week < weeks; week++) {
    const weekDate = new Date(currentWeekStart);
    weekDate.setDate(currentWeekStart.getDate() + (week * 7));
    dates.push(weekDate.toISOString().split('T')[0]);
  }
  
  console.log(`📅 Generated week-based dates for API optimization:`, {
    dates: dates,
    totalWeeks: dates.length,
    weeksRange: `${dates[0]} to ${dates[dates.length - 1]}`,
    note: 'Each Monday creates a booking that returns slots for the entire week'
  });
  
  return dates;
}

/**
 * Get the current week's Monday date
 * @returns Monday date of current week (YYYY-MM-DD format)
 */
export function getCurrentWeekMonday(): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const dayOfWeek = today.getDay();
  const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  
  const monday = new Date(today);
  monday.setDate(today.getDate() + daysToMonday);
  
  return monday.toISOString().split('T')[0];
}

/**
 * Check if a date falls within a specific week
 * @param date - Date to check (YYYY-MM-DD format)
 * @param weekStartDate - Monday of the week (YYYY-MM-DD format)
 * @returns True if date is within the week
 */
export function isDateInWeek(date: string, weekStartDate: string): boolean {
  const checkDate = new Date(date);
  const weekStart = new Date(weekStartDate);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6); // Sunday
  
  checkDate.setHours(0, 0, 0, 0);
  weekStart.setHours(0, 0, 0, 0);
  weekEnd.setHours(23, 59, 59, 999);
  
  return checkDate >= weekStart && checkDate <= weekEnd;
}

/**
 * Get week number for a given date (1-based, starting from the beginning of the year)
 * @param date - Date (YYYY-MM-DD format)
 * @returns Week number (1-52/53)
 */
export function getWeekNumber(date: string): number {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  
  // Set to nearest Thursday: current date + 4 - current day number
  // Make Sunday's day number 7
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  
  // Get first day of year
  const yearStart = new Date(d.getFullYear(), 0, 1);
  
  // Calculate full weeks to nearest Thursday
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  
  return weekNo;
}

/**
 * Calculate the optimal number of weeks needed to cover a date range
 * @param startDate - Start date (YYYY-MM-DD format)
 * @param endDate - End date (YYYY-MM-DD format)
 * @returns Number of weeks needed
 */
export function calculateWeeksForDateRange(startDate: string, endDate: string): number {
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  // Calculate difference in days
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  // Convert to weeks (round up)
  const weeks = Math.ceil(diffDays / 7);
  
  console.log(`📊 Week calculation for date range:`, {
    startDate,
    endDate,
    totalDays: diffDays,
    weeksNeeded: weeks
  });
  
  return Math.max(1, weeks); // Minimum 1 week
}

/**
 * Generate a date range with all days between start and end dates
 * @param startDate - Start date (YYYY-MM-DD format)
 * @param endDate - End date (YYYY-MM-DD format)
 * @returns Array of all dates in the range (YYYY-MM-DD format)
 */
export function generateDateRange(startDate: string, endDate: string): string[] {
  const dates: string[] = [];
  const start = new Date(startDate);
  const end = new Date(endDate);
  
  start.setHours(0, 0, 0, 0);
  end.setHours(0, 0, 0, 0);
  
  const current = new Date(start);
  while (current <= end) {
    dates.push(current.toISOString().split('T')[0]);
    current.setDate(current.getDate() + 1);
  }
  
  return dates;
}

/**
 * Get available booking weeks configuration
 */
export const WEEK_CONFIG = {
  DEFAULT_WEEKS: 4,
  MAX_WEEKS: 12,
  MIN_WEEKS: 1,
  CURRENT_WEEK_PRIORITY: true,
  FUTURE_WEEKS_ONLY: false
} as const;

/**
 * Validate week configuration parameters
 * @param weeks - Number of weeks
 * @returns Validated week count
 */
export function validateWeekConfig(weeks: number): number {
  if (weeks < WEEK_CONFIG.MIN_WEEKS) {
    console.warn(`⚠️ Week count ${weeks} is below minimum, using ${WEEK_CONFIG.MIN_WEEKS}`);
    return WEEK_CONFIG.MIN_WEEKS;
  }
  
  if (weeks > WEEK_CONFIG.MAX_WEEKS) {
    console.warn(`⚠️ Week count ${weeks} exceeds maximum, using ${WEEK_CONFIG.MAX_WEEKS}`);
    return WEEK_CONFIG.MAX_WEEKS;
  }
  
  return weeks;
}
