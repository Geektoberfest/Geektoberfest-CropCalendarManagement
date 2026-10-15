const WeatherAlert = require("../models/WeatherAlert");
const Notification = require("../models/Notification");
const Activity = require("../models/Activity");
const alertEngine = require("./alertRuleEngine");
const weatherService = require("./weatherService");

/**
 * Synchronize weather alerts for a user based on scheduled activities and current forecast
 */
async function syncWeatherAlerts(userId, location, customForecast = null) {
  if (!userId) return [];

  // Fetch all pending/scheduled activities for the user
  const activities = await Activity.find({
    user: userId,
    status: { $ne: "Completed" },
  }).populate("crop");

  if (!activities || activities.length === 0) {
    // If user has no pending activities, mark any old alerts as dismissed
    await WeatherAlert.updateMany(
      { user: userId, isDismissed: false },
      { isDismissed: true }
    );
    return [];
  }

  // Obtain forecast
  let forecast = customForecast;
  if (!forecast && location) {
    try {
      const geo = await weatherService.geocodeLocation(location);
      forecast = await weatherService.getForecast({
        latitude: geo.latitude,
        longitude: geo.longitude,
        locationName: geo.name,
        country: geo.country,
        admin1: geo.admin1,
        timezone: geo.timezone,
      });
    } catch {
      // If weather fetch fails, return existing persisted alerts without crashing
      return WeatherAlert.find({ user: userId, isDismissed: false }).sort({
        createdAt: -1,
      });
    }
  }

  if (!forecast || !Array.isArray(forecast.daily)) {
    return WeatherAlert.find({ user: userId, isDismissed: false }).sort({
      createdAt: -1,
    });
  }

  // Run alert rules engine across all pending activities
  const generatedAlerts = alertEngine.evaluateActivities(activities, forecast);
  const activeKeys = new Set();

  for (const item of generatedAlerts) {
    activeKeys.add(item.alertKey);

    // Deterministic deduplication via alertKey
    await WeatherAlert.findOneAndUpdate(
      { user: userId, alertKey: item.alertKey },
      {
        $set: {
          activity: item.activityId,
          activityName: item.activityName,
          cropName: item.cropName,
          category: item.category,
          ruleType: item.ruleType,
          severity: item.severity,
          title: item.title,
          message: item.message,
          recommendation: item.recommendation,
          forecastDate: item.forecastDate,
          scheduledDate: item.weatherValues
            ? new Date(item.forecastDate + "T00:00:00.000Z")
            : new Date(),
          weatherValues: item.weatherValues,
        },
        $setOnInsert: {
          user: userId,
          alertKey: item.alertKey,
          isRead: false,
          isDismissed: false,
        },
      },
      { upsert: true, new: true }
    );

    // Also sync to Notification system with type "weather_alert"
    await Notification.updateOne(
      { user: userId, activity: item.activityId, type: "weather_alert" },
      {
        user: userId,
        activity: item.activityId,
        title: item.title,
        message: `${item.activityName} (${item.cropName}): ${item.message}`,
        type: "weather_alert",
      },
      { upsert: true }
    );
  }

  // Return the active, non-dismissed alerts for the user
  return WeatherAlert.find({ user: userId, isDismissed: false }).sort({
    createdAt: -1,
  });
}

/**
 * Get weather alerts for a user
 */
async function getUserAlerts(userId, options = {}) {
  const { includeDismissed = false } = options;
  const filter = { user: userId };
  if (!includeDismissed) {
    filter.isDismissed = false;
  }
  return WeatherAlert.find(filter).sort({ createdAt: -1 });
}

/**
 * Mark a specific alert as read
 */
async function markAlertRead(userId, alertId) {
  return WeatherAlert.findOneAndUpdate(
    { _id: alertId, user: userId },
    { $set: { isRead: true } },
    { new: true }
  );
}

/**
 * Dismiss a specific alert
 */
async function dismissAlert(userId, alertId) {
  return WeatherAlert.findOneAndUpdate(
    { _id: alertId, user: userId },
    { $set: { isDismissed: true } },
    { new: true }
  );
}

module.exports = {
  syncWeatherAlerts,
  getUserAlerts,
  markAlertRead,
  dismissAlert,
};
