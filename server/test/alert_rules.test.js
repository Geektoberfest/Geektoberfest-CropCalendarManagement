const test = require("node:test");
const assert = require("node:assert/strict");
const alertEngine = require("../services/alertRuleEngine");

const mockForecast = {
  timezone: "Asia/Kolkata",
  daily: [
    {
      date: "2026-10-15",
      weatherCode: 0,
      condition: "Clear sky",
      tempMax: 30.0,
      tempMin: 20.0,
      precipitationSum: 0.0,
      precipitationProbability: 5,
      windSpeedMax: 10.0,
    },
    {
      date: "2026-10-16",
      weatherCode: 61,
      condition: "Slight rain",
      tempMax: 28.0,
      tempMin: 19.0,
      precipitationSum: 6.5,
      precipitationProbability: 80,
      windSpeedMax: 24.0, // High wind
    },
    {
      date: "2026-10-17",
      weatherCode: 65,
      condition: "Heavy rain",
      tempMax: 26.0,
      tempMin: 18.0,
      precipitationSum: 25.0, // Very heavy rain
      precipitationProbability: 95,
      windSpeedMax: 15.0,
    },
    {
      date: "2026-10-18",
      weatherCode: 0,
      condition: "Clear sky",
      tempMax: 41.0, // Extreme heat
      tempMin: 24.0,
      precipitationSum: 0.0,
      precipitationProbability: 0,
      windSpeedMax: 8.0,
    },
    {
      date: "2026-10-19",
      weatherCode: 1,
      condition: "Mainly clear",
      tempMax: 32.0,
      tempMin: 21.0,
      precipitationSum: 0.0,
      precipitationProbability: 10,
      windSpeedMax: 12.0,
    },
  ],
};

test("Alert Rule Engine Unit Tests", async (t) => {
  await t.test("normalizeCategory properly detects categories", () => {
    assert.equal(alertEngine.normalizeCategory("Irrigation"), "irrigation");
    assert.equal(alertEngine.normalizeCategory("", "Drip watering"), "irrigation");
    assert.equal(alertEngine.normalizeCategory("Protection", "Neem oil spraying"), "spraying");
    assert.equal(alertEngine.normalizeCategory("Nutrition", "Urea top dressing"), "fertilizer");
    assert.equal(alertEngine.normalizeCategory("Sowing", "Direct seed planting"), "planting");
    assert.equal(alertEngine.normalizeCategory("", "Wheat harvesting"), "harvesting");
    assert.equal(alertEngine.normalizeCategory("Weeding"), "general");
  });

  await t.test("Irrigation rule flags scheduled irrigation when rainfall is forecast", () => {
    // Activity on rainy day (2026-10-16, 6.5mm)
    const act = {
      _id: "act_irrig_1",
      name: "Second Irrigation",
      category: "Irrigation",
      crop: { cropName: "Wheat" },
      scheduledDate: "2026-10-16T10:00:00.000Z",
      status: "Pending",
    };

    const alerts = alertEngine.evaluateActivity(act, mockForecast);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].category, "Irrigation");
    assert.equal(alerts[0].title, "Rain Expected — Review Irrigation");
    assert.equal(alerts[0].weatherValues.precipitationSum, 6.5);
    assert.equal(alerts[0].forecastDate, "2026-10-16");
  });

  await t.test("Irrigation rule does not flag when weather is dry", () => {
    // Activity on clear day (2026-10-15, 0mm)
    const act = {
      _id: "act_irrig_dry",
      name: "First Irrigation",
      category: "Irrigation",
      scheduledDate: "2026-10-15T08:00:00.000Z",
      status: "Pending",
    };

    const alerts = alertEngine.evaluateActivity(act, mockForecast);
    assert.equal(alerts.length, 0);
  });

  await t.test("Spraying rule flags rain and high wind conditions", () => {
    const act = {
      _id: "act_spray_1",
      name: "Insecticide Spray",
      category: "Spraying",
      crop: { cropName: "Cotton" },
      scheduledDate: "2026-10-16T09:00:00.000Z",
      status: "Pending",
    };

    const alerts = alertEngine.evaluateActivity(act, mockForecast);
    // Expects both rain warning and high wind warning (wind is 24 km/h > 20 km/h)
    assert.equal(alerts.length, 2);
    const titles = alerts.map((a) => a.title);
    assert.ok(titles.includes("Rain May Affect Spraying"));
    assert.ok(titles.includes("High Wind Speed — Spray Drift Risk"));
  });

  await t.test("Fertilizer rule flags runoff risk on substantial rainfall", () => {
    const act = {
      _id: "act_fert_1",
      name: "DAP Application",
      category: "Fertilizer",
      crop: { cropName: "Rice" },
      scheduledDate: "2026-10-16T11:00:00.000Z",
      status: "Pending",
    };

    const alerts = alertEngine.evaluateActivity(act, mockForecast);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].category, "Fertilizer");
    assert.equal(alerts[0].ruleType, "fertilizer_runoff");
    assert.match(alerts[0].message, /Substantial rainfall/);
  });

  await t.test("Planting rule flags heavy rain and extreme heat", () => {
    // Heavy rain day: 2026-10-17 (25mm > 20mm)
    const actRain = {
      _id: "act_plant_rain",
      name: "Transplanting",
      category: "Planting",
      crop: { cropName: "Tomato" },
      scheduledDate: "2026-10-17T08:00:00.000Z",
      status: "Pending",
    };
    const rainAlerts = alertEngine.evaluateActivity(actRain, mockForecast);
    assert.equal(rainAlerts.length, 1);
    assert.equal(rainAlerts[0].title, "Heavy Rainfall Forecast — Review Planting Plans");

    // Extreme heat day: 2026-10-18 (41°C > 38°C)
    const actHeat = {
      _id: "act_plant_heat",
      name: "Sowing",
      category: "Planting",
      crop: { cropName: "Chickpea" },
      scheduledDate: "2026-10-18T07:00:00.000Z",
      status: "Pending",
    };
    const heatAlerts = alertEngine.evaluateActivity(actHeat, mockForecast);
    assert.equal(heatAlerts.length, 1);
    assert.equal(heatAlerts[0].title, "Extreme Temperature Forecast — Review Planned Activity");
  });

  await t.test("Harvesting rule flags rain during planned harvest", () => {
    const act = {
      _id: "act_harvest_1",
      name: "Pod Picking",
      category: "Harvesting",
      crop: { cropName: "Soybean" },
      scheduledDate: "2026-10-16T14:00:00.000Z",
      status: "Pending",
    };

    const alerts = alertEngine.evaluateActivity(act, mockForecast);
    assert.equal(alerts.length, 1);
    assert.equal(alerts[0].title, "Rain Expected — Harvest Risk");
  });

  await t.test("No alerts generated for completed activities or activities outside forecast window", () => {
    const completedAct = {
      _id: "act_done",
      name: "Irrigation",
      category: "Irrigation",
      scheduledDate: "2026-10-16T10:00:00.000Z",
      status: "Completed",
    };
    assert.equal(alertEngine.evaluateActivity(completedAct, mockForecast).length, 0);

    const farFutureAct = {
      _id: "act_future",
      name: "Irrigation",
      category: "Irrigation",
      scheduledDate: "2026-11-20T10:00:00.000Z",
      status: "Pending",
    };
    assert.equal(alertEngine.evaluateActivity(farFutureAct, mockForecast).length, 0);
  });
});
