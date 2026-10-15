/**
 * Weather Service integrating with Open-Meteo API.
 * Free, reliable, no API key required, supports geocoding and 7-day agricultural forecasts.
 */

// In-memory cache with TTL (15 minutes)
const cache = new Map();
const CACHE_TTL_MS = 15 * 60 * 1000;

// WMO Weather interpretation codes (WW)
const WMO_CODE_MAP = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  56: "Light freezing drizzle",
  57: "Dense freezing drizzle",
  61: "Slight rain",
  62: "Moderate rain",
  63: "Moderate rain",
  65: "Heavy rain",
  66: "Light freezing rain",
  67: "Heavy freezing rain",
  71: "Slight snowfall",
  73: "Moderate snowfall",
  75: "Heavy snowfall",
  77: "Snow grains",
  80: "Slight rain showers",
  81: "Moderate rain showers",
  82: "Violent rain showers",
  85: "Slight snow showers",
  86: "Heavy snow showers",
  95: "Thunderstorm",
  96: "Thunderstorm with slight hail",
  99: "Thunderstorm with heavy hail",
};

/**
 * Get human-readable condition string from WMO code
 */
function getWeatherCondition(code) {
  if (code === undefined || code === null) return "Unknown";
  return WMO_CODE_MAP[code] || "Variable conditions";
}

/**
 * Parse coordinates from string (e.g. "18.5204,73.8567" or "18.5204, 73.8567")
 */
function parseCoordinateString(str) {
  if (typeof str !== "string") return null;
  const match = str.trim().match(/^(-?\d+(\.\d+)?)\s*,\s*(-?\d+(\.\d+)?)$/);
  if (!match) return null;
  const lat = parseFloat(match[1]);
  const lon = parseFloat(match[3]);
  if (lat >= -90 && lat <= 90 && lon >= -180 && lon <= 180) {
    return { latitude: lat, longitude: lon };
  }
  return null;
}

/**
 * Geocode place name using Open-Meteo Geocoding API
 */
async function geocodeLocation(locationQuery, fetchFn = global.fetch) {
  if (!locationQuery || typeof locationQuery !== "string") {
    throw new Error("Location query is required");
  }

  const trimmed = locationQuery.trim();

  // Check if query is already coordinates "lat,lon"
  const coords = parseCoordinateString(trimmed);
  if (coords) {
    return {
      name: `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`,
      latitude: coords.latitude,
      longitude: coords.longitude,
      country: "",
      admin1: "",
      timezone: "auto",
    };
  }

  const cacheKey = `geo:${trimmed.toLowerCase()}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }

  const url = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(
    trimmed
  )}&count=5&language=en&format=json`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 8000);

  try {
    const res = await fetchFn(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Geocoding provider responded with status ${res.status}`);
    }

    const data = await res.json();
    if (!data || !Array.isArray(data.results) || data.results.length === 0) {
      throw new Error(`Could not resolve location '${trimmed}'. Please specify a recognized city, district, or coordinates.`);
    }

    const first = data.results[0];
    const resolved = {
      name: first.name || trimmed,
      latitude: first.latitude,
      longitude: first.longitude,
      country: first.country || "",
      admin1: first.admin1 || "",
      timezone: first.timezone || "auto",
    };

    cache.set(cacheKey, { data: resolved, timestamp: Date.now() });
    return resolved;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Geocoding request timed out");
    }
    throw err;
  }
}

/**
 * Fetch forecast from Open-Meteo and normalize
 */
async function getForecast({ latitude, longitude, locationName, country, admin1, timezone = "auto" }, fetchFn = global.fetch) {
  if (latitude === undefined || longitude === undefined || isNaN(latitude) || isNaN(longitude)) {
    throw new Error("Valid latitude and longitude are required");
  }

  const latNum = parseFloat(latitude);
  const lonNum = parseFloat(longitude);

  if (latNum < -90 || latNum > 90 || lonNum < -180 || lonNum > 180) {
    throw new Error("Coordinates out of range (-90..90, -180..180)");
  }

  const cacheKey = `forecast:${latNum.toFixed(2)},${lonNum.toFixed(2)}`;
  const cached = cache.get(cacheKey);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return { ...cached.data, fromCache: true };
  }

  const url = `https://api.open-meteo.com/v1/forecast?latitude=${latNum}&longitude=${lonNum}&current=temperature_2m,relative_humidity_2m,weather_code,precipitation,wind_speed_10m&hourly=temperature_2m,relative_humidity_2m,precipitation_probability,precipitation,weather_code,wind_speed_10m&daily=weather_code,temperature_2m_max,temperature_2m_min,precipitation_sum,precipitation_probability_max,wind_speed_10m_max&timezone=${encodeURIComponent(
    timezone || "auto"
  )}&forecast_days=7`;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 10000);

  try {
    const res = await fetchFn(url, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      throw new Error(`Weather service responded with status ${res.status}`);
    }

    const raw = await res.json();
    const normalized = normalizeWeatherResponse(raw, {
      name: locationName || `${latNum.toFixed(2)}, ${lonNum.toFixed(2)}`,
      latitude: latNum,
      longitude: lonNum,
      country: country || "",
      admin1: admin1 || "",
    });

    cache.set(cacheKey, { data: normalized, timestamp: Date.now() });
    return normalized;
  } catch (err) {
    clearTimeout(timeoutId);
    if (err.name === "AbortError") {
      throw new Error("Weather forecast request timed out");
    }
    throw err;
  }
}

/**
 * Normalize Open-Meteo raw payload into consistent internal format
 */
function normalizeWeatherResponse(raw, locationMeta) {
  const currentRaw = raw.current || {};
  const dailyRaw = raw.daily || {};
  const hourlyRaw = raw.hourly || {};

  const current = {
    time: currentRaw.time || new Date().toISOString(),
    temperature: currentRaw.temperature_2m ?? null,
    humidity: currentRaw.relative_humidity_2m ?? null,
    precipitation: currentRaw.precipitation ?? 0,
    windSpeed: currentRaw.wind_speed_10m ?? null,
    weatherCode: currentRaw.weather_code ?? 0,
    condition: getWeatherCondition(currentRaw.weather_code),
  };

  const daily = [];
  const dates = dailyRaw.time || [];
  for (let i = 0; i < dates.length; i++) {
    const code = dailyRaw.weather_code ? dailyRaw.weather_code[i] : null;
    daily.push({
      date: dates[i],
      tempMax: dailyRaw.temperature_2m_max ? dailyRaw.temperature_2m_max[i] : null,
      tempMin: dailyRaw.temperature_2m_min ? dailyRaw.temperature_2m_min[i] : null,
      precipitationSum: dailyRaw.precipitation_sum ? dailyRaw.precipitation_sum[i] : 0,
      precipitationProbability: dailyRaw.precipitation_probability_max
        ? dailyRaw.precipitation_probability_max[i]
        : 0,
      windSpeedMax: dailyRaw.wind_speed_10m_max ? dailyRaw.wind_speed_10m_max[i] : null,
      weatherCode: code,
      condition: getWeatherCondition(code),
    });
  }

  // Sample hourly records (limit to 48 hours for short-term spraying/irrigation decision support)
  const hourly = [];
  const hourlyTimes = hourlyRaw.time || [];
  const maxHourly = Math.min(hourlyTimes.length, 48);
  for (let i = 0; i < maxHourly; i++) {
    const code = hourlyRaw.weather_code ? hourlyRaw.weather_code[i] : null;
    hourly.push({
      time: hourlyTimes[i],
      temperature: hourlyRaw.temperature_2m ? hourlyRaw.temperature_2m[i] : null,
      humidity: hourlyRaw.relative_humidity_2m ? hourlyRaw.relative_humidity_2m[i] : null,
      precipitation: hourlyRaw.precipitation ? hourlyRaw.precipitation[i] : 0,
      precipitationProbability: hourlyRaw.precipitation_probability
        ? hourlyRaw.precipitation_probability[i]
        : 0,
      windSpeed: hourlyRaw.wind_speed_10m ? hourlyRaw.wind_speed_10m[i] : null,
      weatherCode: code,
      condition: getWeatherCondition(code),
    });
  }

  return {
    location: {
      name: locationMeta.name,
      country: locationMeta.country,
      admin1: locationMeta.admin1,
      latitude: locationMeta.latitude,
      longitude: locationMeta.longitude,
      timezone: raw.timezone || "auto",
    },
    current,
    daily,
    hourly,
    retrievedAt: new Date().toISOString(),
    provider: "Open-Meteo",
  };
}

/**
 * Helper to clear cache (useful for testing)
 */
function clearCache() {
  cache.clear();
}

module.exports = {
  geocodeLocation,
  getForecast,
  normalizeWeatherResponse,
  getWeatherCondition,
  parseCoordinateString,
  clearCache,
  WMO_CODE_MAP,
};
