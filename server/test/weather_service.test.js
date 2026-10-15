const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");
const weatherService = require("../services/weatherService");

test("Weather Service & Integration Unit Tests", async (t) => {
  t.beforeEach(() => {
    weatherService.clearCache();
  });

  await t.test("parseCoordinateString correctly parses valid coordinates", () => {
    const res1 = weatherService.parseCoordinateString("18.5204, 73.8567");
    assert.deepEqual(res1, { latitude: 18.5204, longitude: 73.8567 });

    const res2 = weatherService.parseCoordinateString("-33.8688,151.2093");
    assert.deepEqual(res2, { latitude: -33.8688, longitude: 151.2093 });

    const invalid1 = weatherService.parseCoordinateString("invalid-place");
    assert.equal(invalid1, null);

    const outOfBounds = weatherService.parseCoordinateString("190.0, 73.0");
    assert.equal(outOfBounds, null);
  });

  await t.test("getWeatherCondition maps WMO codes correctly", () => {
    assert.equal(weatherService.getWeatherCondition(0), "Clear sky");
    assert.equal(weatherService.getWeatherCondition(1), "Mainly clear");
    assert.equal(weatherService.getWeatherCondition(3), "Overcast");
    assert.equal(weatherService.getWeatherCondition(61), "Slight rain");
    assert.equal(weatherService.getWeatherCondition(65), "Heavy rain");
    assert.equal(weatherService.getWeatherCondition(95), "Thunderstorm");
    assert.equal(weatherService.getWeatherCondition(999), "Variable conditions");
  });

  await t.test("geocodeLocation resolves place name using mock fetch", async () => {
    const mockFetch = async (url) => {
      assert.match(url, /geocoding-api\.open-meteo\.com/);
      return {
        ok: true,
        json: async () => ({
          results: [
            {
              id: 1,
              name: "Pune",
              latitude: 18.5204,
              longitude: 73.8567,
              country: "India",
              admin1: "Maharashtra",
              timezone: "Asia/Kolkata",
            },
          ],
        }),
      };
    };

    const res = await weatherService.geocodeLocation("Pune", mockFetch);
    assert.equal(res.name, "Pune");
    assert.equal(res.latitude, 18.5204);
    assert.equal(res.longitude, 73.8567);
    assert.equal(res.country, "India");
  });

  await t.test("geocodeLocation throws on unknown place", async () => {
    const mockFetch = async () => ({
      ok: true,
      json: async () => ({ results: [] }),
    });

    await assert.rejects(
      async () => {
        await weatherService.geocodeLocation("UnknownCityXYZ", mockFetch);
      },
      /Could not resolve location/
    );
  });

  await t.test("getForecast fetches and normalizes weather forecast payload", async () => {
    const mockRawForecast = {
      timezone: "Asia/Kolkata",
      current: {
        time: "2026-10-15T08:00",
        temperature_2m: 29.4,
        relative_humidity_2m: 65,
        precipitation: 0.0,
        weather_code: 1,
        wind_speed_10m: 11.2,
      },
      daily: {
        time: ["2026-10-15", "2026-10-16", "2026-10-17"],
        weather_code: [1, 61, 0],
        temperature_2m_max: [32.0, 28.5, 33.1],
        temperature_2m_min: [22.0, 21.0, 20.5],
        precipitation_sum: [0.0, 6.2, 0.0],
        precipitation_probability_max: [10, 80, 5],
        wind_speed_10m_max: [14.0, 18.5, 12.0],
      },
      hourly: {
        time: ["2026-10-15T00:00", "2026-10-15T01:00"],
        temperature_2m: [24.0, 23.5],
        relative_humidity_2m: [80, 82],
        precipitation: [0, 0],
        precipitation_probability: [0, 0],
        weather_code: [1, 1],
        wind_speed_10m: [5, 6],
      },
    };

    const mockFetch = async (url) => {
      assert.match(url, /api\.open-meteo\.com\/v1\/forecast/);
      return {
        ok: true,
        json: async () => mockRawForecast,
      };
    };

    const forecast = await weatherService.getForecast(
      {
        latitude: 18.5204,
        longitude: 73.8567,
        locationName: "Pune",
        country: "India",
        admin1: "Maharashtra",
      },
      mockFetch
    );

    assert.equal(forecast.location.name, "Pune");
    assert.equal(forecast.current.temperature, 29.4);
    assert.equal(forecast.current.humidity, 65);
    assert.equal(forecast.current.condition, "Mainly clear");
    assert.equal(forecast.daily.length, 3);
    assert.equal(forecast.daily[1].condition, "Slight rain");
    assert.equal(forecast.daily[1].precipitationSum, 6.2);
    assert.equal(forecast.daily[1].precipitationProbability, 80);
    assert.equal(forecast.provider, "Open-Meteo");
  });

  await t.test("getForecast handles provider network/timeout failures gracefully", async () => {
    const failingFetch = async () => ({
      ok: false,
      status: 503,
    });

    await assert.rejects(
      async () => {
        await weatherService.getForecast(
          { latitude: 18.52, longitude: 73.85 },
          failingFetch
        );
      },
      /Weather service responded with status 503/
    );
  });

  await t.test("GET /api/weather/current requires authentication", async () => {
    const res = await request(app).get("/api/weather/current?location=Pune");
    assert.equal(res.status, 401);
  });
});
