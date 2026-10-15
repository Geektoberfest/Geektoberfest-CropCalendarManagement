const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const alertEngine = require("../services/alertRuleEngine");
const weatherService = require("../services/weatherService");

test("End-to-End Weather Alert Rules and Crop Calendar Integration", async (t) => {
  const userId = new mongoose.Types.ObjectId().toString();
  const cropId = new mongoose.Types.ObjectId().toString();

  const mock7DayForecast = {
    timezone: "Asia/Kolkata",
    daily: [
      {
        date: "2026-10-15",
        weatherCode: 0,
        condition: "Clear sky",
        tempMax: 31.0,
        tempMin: 20.0,
        precipitationSum: 0.0,
        precipitationProbability: 5,
        windSpeedMax: 9.0,
      },
      {
        date: "2026-10-16",
        weatherCode: 61,
        condition: "Slight rain",
        tempMax: 27.5,
        tempMin: 19.0,
        precipitationSum: 8.0,
        precipitationProbability: 85,
        windSpeedMax: 22.0,
      },
      {
        date: "2026-10-17",
        weatherCode: 65,
        condition: "Heavy rain",
        tempMax: 24.0,
        tempMin: 18.0,
        precipitationSum: 28.0,
        precipitationProbability: 95,
        windSpeedMax: 18.0,
      },
      {
        date: "2026-10-18",
        weatherCode: 0,
        condition: "Clear sky",
        tempMax: 39.5,
        tempMin: 23.0,
        precipitationSum: 0.0,
        precipitationProbability: 0,
        windSpeedMax: 10.0,
      },
      {
        date: "2026-10-19",
        weatherCode: 1,
        condition: "Mainly clear",
        tempMax: 32.0,
        tempMin: 21.0,
        precipitationSum: 0.0,
        precipitationProbability: 10,
        windSpeedMax: 11.0,
      },
      {
        date: "2026-10-20",
        weatherCode: 2,
        condition: "Partly cloudy",
        tempMax: 30.0,
        tempMin: 19.5,
        precipitationSum: 0.0,
        precipitationProbability: 15,
        windSpeedMax: 12.0,
      },
      {
        date: "2026-10-21",
        weatherCode: 0,
        condition: "Clear sky",
        tempMax: 33.0,
        tempMin: 20.0,
        precipitationSum: 0.0,
        precipitationProbability: 0,
        windSpeedMax: 8.0,
      },
    ],
  };

  const sampleActivities = [
    {
      _id: "act_irr_oct16",
      user: userId,
      crop: { _id: cropId, cropName: "Wheat" },
      name: "Second Border Irrigation",
      category: "Irrigation",
      scheduledDate: new Date("2026-10-16T08:00:00.000Z"),
      status: "Pending",
    },
    {
      _id: "act_spray_oct16",
      user: userId,
      crop: { _id: cropId, cropName: "Cotton" },
      name: "Bollworm Pest Spraying",
      category: "Spraying",
      scheduledDate: new Date("2026-10-16T10:00:00.000Z"),
      status: "Pending",
    },
    {
      _id: "act_fert_oct16",
      user: userId,
      crop: { _id: cropId, cropName: "Rice" },
      name: "Urea Top Dressing",
      category: "Fertilizer",
      scheduledDate: new Date("2026-10-16T11:00:00.000Z"),
      status: "Pending",
    },
    {
      _id: "act_plant_oct17",
      user: userId,
      crop: { _id: cropId, cropName: "Tomato" },
      name: "Bed Planting",
      category: "Planting",
      scheduledDate: new Date("2026-10-17T07:00:00.000Z"),
      status: "Pending",
    },
    {
      _id: "act_plant_oct18",
      user: userId,
      crop: { _id: cropId, cropName: "Soybean" },
      name: "Direct Seeding",
      category: "Planting",
      scheduledDate: new Date("2026-10-18T07:00:00.000Z"),
      status: "Pending",
    },
    {
      _id: "act_harv_oct16",
      user: userId,
      crop: { _id: cropId, cropName: "Maize" },
      name: "Cob Harvesting",
      category: "Harvesting",
      scheduledDate: new Date("2026-10-16T14:00:00.000Z"),
      status: "Pending",
    },
    {
      _id: "act_safe_oct15",
      user: userId,
      crop: { _id: cropId, cropName: "Chickpea" },
      name: "Weeding",
      category: "Weeding",
      scheduledDate: new Date("2026-10-15T09:00:00.000Z"),
      status: "Pending",
    },
  ];

  await t.test("Batch evaluation flags all affected activities and generates comprehensive advisories", () => {
    const alerts = alertEngine.evaluateActivities(sampleActivities, mock7DayForecast);

    // 1 Irrigation alert
    const irrigAlerts = alerts.filter((a) => a.category === "Irrigation");
    assert.equal(irrigAlerts.length, 1);
    assert.match(irrigAlerts[0].title, /Rain Expected/);

    // 2 Spraying alerts (rain + wind)
    const sprayAlerts = alerts.filter((a) => a.category === "Spraying");
    assert.equal(sprayAlerts.length, 2);

    // 1 Fertilizer alert (runoff)
    const fertAlerts = alerts.filter((a) => a.category === "Fertilizer");
    assert.equal(fertAlerts.length, 1);

    // 2 Planting alerts (heavy rain on 17th, extreme heat on 18th)
    const plantAlerts = alerts.filter((a) => a.category === "Planting");
    assert.equal(plantAlerts.length, 2);

    // 1 Harvesting alert
    const harvAlerts = alerts.filter((a) => a.category === "Harvesting");
    assert.equal(harvAlerts.length, 1);

    // Total alerts should be 7
    assert.equal(alerts.length, 7);
  });

  await t.test("Edge case: activity with missing category falls back safely to name matching", () => {
    const actNoCategory = {
      _id: "act_untyped",
      name: "Drip irrigation maintenance",
      scheduledDate: new Date("2026-10-16T08:00:00.000Z"),
      status: "Pending",
    };

    const alerts = alertEngine.evaluateActivity(actNoCategory, mock7DayForecast);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].category, "Irrigation");
  });

  await t.test("Edge case: activity scheduled with missing or invalid date returns no alerts", () => {
    const invalidAct1 = {
      _id: "act_no_date",
      name: "Pesticide spray",
      category: "Spraying",
      scheduledDate: null,
      status: "Pending",
    };
    assert.equal(alertEngine.evaluateActivity(invalidAct1, mock7DayForecast).length, 0);

    const invalidAct2 = {
      _id: "act_bad_date",
      name: "Pesticide spray",
      category: "Spraying",
      scheduledDate: "not-a-valid-date",
      status: "Pending",
    };
    assert.equal(alertEngine.evaluateActivity(invalidAct2, mock7DayForecast).length, 0);
  });

  await t.test("Edge case: missing optional weather fields does not throw", () => {
    const incompleteForecast = {
      timezone: "auto",
      daily: [
        {
          date: "2026-10-16",
          // weatherCode missing
          // precipitationSum missing
          // precipitationProbability missing
        },
      ],
    };

    const alerts = alertEngine.evaluateActivities(sampleActivities, incompleteForecast);
    assert.equal(Array.isArray(alerts), true);
    assert.equal(alerts.length, 0, "No false alerts generated when data is missing");
  });
});
