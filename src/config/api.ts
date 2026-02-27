// ============================================
// API Configuration
// ============================================

export const API_CONFIG = {
  BASE_URL: import.meta.env.VITE_API_URL || 'http://localhost:3001',
};

// Default headers for all requests
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};
