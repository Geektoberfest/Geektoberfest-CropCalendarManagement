import api from "./api";

/**
 * Fetch current weather and 7-day forecast.
 * @param {Object} params - { location, latitude, longitude }
 */
export const getWeather = (params = {}) => api.get("/weather/current", { params });

/**
 * Update authenticated user's farm location.
 * @param {string} location
 */
export const updateFarmLocation = (location) =>
  api.put("/weather/location", { location });

/**
 * Fetch weather-based farming alerts for authenticated user.
 * @param {Object} params - { includeDismissed, location }
 */
export const getWeatherAlerts = (params = {}) =>
  api.get("/weather/alerts", { params });

/**
 * Mark a specific alert as read.
 * @param {string} id
 */
export const markAlertRead = (id) =>
  api.patch(`/weather/alerts/${id}/read`);

/**
 * Dismiss a specific alert.
 * @param {string} id
 */
export const dismissAlert = (id) =>
  api.patch(`/weather/alerts/${id}/dismiss`);

/**
 * Force on-demand re-sync of weather alerts.
 * @param {string} location
 */
export const refreshWeatherAlerts = (location) =>
  api.post("/weather/alerts/refresh", { location });
