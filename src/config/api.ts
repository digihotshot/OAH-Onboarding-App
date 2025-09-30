/**
 * API Configuration
 * Centralized configuration for API endpoints
 */

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api',
} as const;

// Helper function to get full API URL
export const getApiUrl = (path: string): string => {
  const baseUrl = API_CONFIG.BASE_URL;
  const cleanPath = path.startsWith('/') ? path.slice(1) : path;
  return `${baseUrl}/${cleanPath}`;
};
