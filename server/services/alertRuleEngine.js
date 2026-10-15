/**
 * Agricultural Alert Rule Engine
 * Evaluates weather forecasts against scheduled crop calendar activities.
 * Provides decision-support alerts without automatically modifying or cancelling activities.
 */

const DEFAULT_THRESHOLDS = {
  irrigation: {
    minRainfallMm: 3.0,
    minPrecipitationProbability: 50,
  },
  spraying: {
    minRainfallMm: 1.0,
    minPrecipitationProbability: 40,
    maxWindSpeedKmh: 20,
  },
  fertilizer: {
    minRainfallMm: 5.0,
    minPrecipitationProbability: 50,
    heavyRainfallMm: 12.0,
  },
  planting: {
    heavyRainfallMm: 20.0,
    minPrecipitationProbability: 60,
    extremeHeatC: 38.0,
    extremeColdC: 5.0,
  },
  harvesting: {
    minRainfallMm: 4.0,
    minPrecipitationProbability: 50,
    heavyRainfallMm: 15.0,
  },
};

/**
 * Safely classify activity category from explicit field or name
 */
function normalizeCategory(category, activityName = "") {
  const text = `${category || ""} ${activityName || ""}`.toLowerCase();

  if (text.match(/irrigat|water|moisture/)) return "irrigation";
  if (text.match(/spray|pesticide|fungicide|insecticide|herbicide|chemical/)) return "spraying";
  if (text.match(/fertiliz|nutrient|manure|compost|urea|potash|nitrogen|dap/)) return "fertilizer";
  if (text.match(/plant|sow|transplant|seeding/)) return "planting";
  if (text.match(/harvest|picking|cutting|thresh/)) return "harvesting";

  return "general";
}

/**
 * Format a Date object or string to YYYY-MM-DD
 */
function formatDateKey(dateInput) {
  if (!dateInput) return null;
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

/**
 * Compare an activity against weather forecast days
 */
function evaluateActivity(activity, forecast, customThresholds = {}) {
  if (!activity || !activity.scheduledDate || !forecast || !Array.isArray(forecast.daily)) {
    return [];
  }

  // Do not generate alerts for already completed activities
  if (activity.status === "Completed") {
    return [];
  }

  const actDateKey = formatDateKey(activity.scheduledDate);
  if (!actDateKey) return [];

  const dailyForecasts = forecast.daily;
  // Locate matching forecast day
  const matchIndex = dailyForecasts.findIndex((f) => f.date === actDateKey);
  if (matchIndex === -1) {
    // Activity is outside the 7-day forecast window
    return [];
  }

  const dayForecast = dailyForecasts[matchIndex];
  const nextDayForecast = dailyForecasts[matchIndex + 1] || null;

  const thresholds = {
    ...DEFAULT_THRESHOLDS,
    ...customThresholds,
  };

  const category = normalizeCategory(activity.category, activity.name);
  const cropName =
    activity.crop?.cropName ||
    activity.crop?.name ||
    (typeof activity.crop === "string" ? "Crop" : "Crop");
  const actName = activity.name || "Scheduled Activity";
  const alerts = [];

  // 1. IRRIGATION RULES
  if (category === "irrigation") {
    const rainMm = dayForecast.precipitationSum || 0;
    const rainProb = dayForecast.precipitationProbability || 0;

    if (
      rainMm >= thresholds.irrigation.minRainfallMm ||
      rainProb >= thresholds.irrigation.minPrecipitationProbability
    ) {
      alerts.push({
        alertKey: `${activity._id}_irrigation_${actDateKey}`,
        activityId: activity._id,
        activityName: actName,
        cropName,
        category: "Irrigation",
        ruleType: "irrigation_rain",
        severity: rainMm >= 10 || rainProb >= 80 ? "critical" : "warning",
        title: "Rain Expected — Review Irrigation",
        message: `Rainfall of ${rainMm} mm (${rainProb}% probability) is forecast on ${actDateKey}. Natural rainfall may fulfill soil moisture requirements.`,
        recommendation:
          "Consider pausing or reducing irrigation to avoid waterlogging and conserve water resources.",
        forecastDate: actDateKey,
        weatherValues: {
          precipitationSum: rainMm,
          precipitationProbability: rainProb,
          condition: dayForecast.condition,
          tempMax: dayForecast.tempMax,
          tempMin: dayForecast.tempMin,
        },
      });
    }
  }

  // 2. SPRAYING / PESTICIDE RULES
  else if (category === "spraying") {
    const rainMmToday = dayForecast.precipitationSum || 0;
    const rainProbToday = dayForecast.precipitationProbability || 0;
    const windSpeedToday = dayForecast.windSpeedMax || 0;

    const rainMmTomorrow = nextDayForecast ? nextDayForecast.precipitationSum || 0 : 0;
    const rainProbTomorrow = nextDayForecast ? nextDayForecast.precipitationProbability || 0 : 0;

    // Check rain on spraying day or within 24h wash-off window
    if (
      rainMmToday >= thresholds.spraying.minRainfallMm ||
      rainProbToday >= thresholds.spraying.minPrecipitationProbability ||
      rainMmTomorrow >= thresholds.spraying.minRainfallMm ||
      rainProbTomorrow >= thresholds.spraying.minPrecipitationProbability
    ) {
      const highestRain = Math.max(rainMmToday, rainMmTomorrow);
      const highestProb = Math.max(rainProbToday, rainProbTomorrow);
      alerts.push({
        alertKey: `${activity._id}_spraying_rain_${actDateKey}`,
        activityId: activity._id,
        activityName: actName,
        cropName,
        category: "Spraying",
        ruleType: "spraying_rain",
        severity: "warning",
        title: "Rain May Affect Spraying",
        message: `Rain is forecast around ${actDateKey} (up to ${highestRain} mm, ${highestProb}% chance). Foliar chemicals require a rain-fast drying window to prevent wash-off.`,
        recommendation:
          "Ensure an adequate rain-fast period according to chemical label instructions, or postpone spraying until dry weather.",
        forecastDate: actDateKey,
        weatherValues: {
          precipitationSum: highestRain,
          precipitationProbability: highestProb,
          condition: dayForecast.condition,
          windSpeedMax: windSpeedToday,
        },
      });
    }

    // Check high wind speed drift risk
    if (windSpeedToday >= thresholds.spraying.maxWindSpeedKmh) {
      alerts.push({
        alertKey: `${activity._id}_spraying_wind_${actDateKey}`,
        activityId: activity._id,
        activityName: actName,
        cropName,
        category: "Spraying",
        ruleType: "spraying_wind",
        severity: "warning",
        title: "High Wind Speed — Spray Drift Risk",
        message: `Maximum wind speeds of ${windSpeedToday} km/h are expected on ${actDateKey}, exceeding the recommended ${thresholds.spraying.maxWindSpeedKmh} km/h threshold.`,
        recommendation:
          "Calm morning or late afternoon conditions are recommended to prevent spray drift onto non-target crops and maintain uniform coverage.",
        forecastDate: actDateKey,
        weatherValues: {
          windSpeedMax: windSpeedToday,
          condition: dayForecast.condition,
        },
      });
    }
  }

  // 3. FERTILIZER APPLICATION RULES
  else if (category === "fertilizer") {
    const rainMmToday = dayForecast.precipitationSum || 0;
    const rainProbToday = dayForecast.precipitationProbability || 0;
    const rainMmTomorrow = nextDayForecast ? nextDayForecast.precipitationSum || 0 : 0;
    const totalRain = rainMmToday + rainMmTomorrow;

    if (
      totalRain >= thresholds.fertilizer.minRainfallMm ||
      rainProbToday >= thresholds.fertilizer.minPrecipitationProbability
    ) {
      alerts.push({
        alertKey: `${activity._id}_fertilizer_${actDateKey}`,
        activityId: activity._id,
        activityName: actName,
        cropName,
        category: "Fertilizer",
        ruleType: "fertilizer_runoff",
        severity: totalRain >= thresholds.fertilizer.heavyRainfallMm ? "critical" : "warning",
        title: "Heavy Rain Forecast — Check Fertilizer Plan",
        message: `Substantial rainfall (${totalRain.toFixed(1)} mm combined) is expected on and following ${actDateKey}. Heavy downpours cause surface runoff and nutrient leaching.`,
        recommendation:
          "Consider splitting dosages or waiting until soil conditions stabilize to ensure nutrients reach plant root zones efficiently.",
        forecastDate: actDateKey,
        weatherValues: {
          precipitationSum: totalRain,
          precipitationProbability: rainProbToday,
          condition: dayForecast.condition,
        },
      });
    }
  }

  // 4. PLANTING / SOWING RULES
  else if (category === "planting") {
    const rainMm = dayForecast.precipitationSum || 0;
    const maxTemp = dayForecast.tempMax;
    const minTemp = dayForecast.tempMin;

    if (rainMm >= thresholds.planting.heavyRainfallMm) {
      alerts.push({
        alertKey: `${activity._id}_planting_rain_${actDateKey}`,
        activityId: activity._id,
        activityName: actName,
        cropName,
        category: "Planting",
        ruleType: "planting_heavy_rain",
        severity: "critical",
        title: "Heavy Rainfall Forecast — Review Planting Plans",
        message: `Heavy rainfall of ${rainMm} mm is forecast on ${actDateKey}. Saturated seedbeds risk seed rot, soil compaction, and poor emergence.`,
        recommendation:
          "Check seedbed drainage and monitor soil moisture before proceeding with mechanical planting or transplanting.",
        forecastDate: actDateKey,
        weatherValues: {
          precipitationSum: rainMm,
          condition: dayForecast.condition,
        },
      });
    }

    if (maxTemp !== null && maxTemp >= thresholds.planting.extremeHeatC) {
      alerts.push({
        alertKey: `${activity._id}_planting_heat_${actDateKey}`,
        activityId: activity._id,
        activityName: actName,
        cropName,
        category: "Planting",
        ruleType: "planting_extreme_temp",
        severity: "warning",
        title: "Extreme Temperature Forecast — Review Planned Activity",
        message: `High temperatures reaching ${maxTemp}°C are expected on ${actDateKey}. Young seedlings and germinating seeds are vulnerable to heat stress.`,
        recommendation:
          "Provide nursery shading, ensure adequate pre-irrigation, or plant during cooler morning hours.",
        forecastDate: actDateKey,
        weatherValues: {
          tempMax: maxTemp,
          condition: dayForecast.condition,
        },
      });
    }
  }

  // 5. HARVESTING RULES
  else if (category === "harvesting") {
    const rainMm = dayForecast.precipitationSum || 0;
    const rainProb = dayForecast.precipitationProbability || 0;

    if (
      rainMm >= thresholds.harvesting.minRainfallMm ||
      rainProb >= thresholds.harvesting.minPrecipitationProbability
    ) {
      alerts.push({
        alertKey: `${activity._id}_harvesting_rain_${actDateKey}`,
        activityId: activity._id,
        activityName: actName,
        cropName,
        category: "Harvesting",
        ruleType: "harvesting_rain",
        severity: rainMm >= thresholds.harvesting.heavyRainfallMm ? "critical" : "warning",
        title: "Rain Expected — Harvest Risk",
        message: `Rainfall of ${rainMm} mm (${rainProb}% probability) is forecast on ${actDateKey}. Wet grain or produce can lead to mold and post-harvest spoilage.`,
        recommendation:
          "Consider advancing the harvest if mature, or prepare dry storage and tarpaulins to protect harvested yields.",
        forecastDate: actDateKey,
        weatherValues: {
          precipitationSum: rainMm,
          precipitationProbability: rainProb,
          condition: dayForecast.condition,
        },
      });
    }
  }

  return alerts;
}

/**
 * Evaluate all scheduled activities against a forecast
 */
function evaluateActivities(activities, forecast, customThresholds = {}) {
  if (!Array.isArray(activities) || !forecast) return [];

  const allAlerts = [];
  for (const act of activities) {
    const actAlerts = evaluateActivity(act, forecast, customThresholds);
    allAlerts.push(...actAlerts);
  }

  return allAlerts;
}

module.exports = {
  DEFAULT_THRESHOLDS,
  normalizeCategory,
  formatDateKey,
  evaluateActivity,
  evaluateActivities,
};
