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
