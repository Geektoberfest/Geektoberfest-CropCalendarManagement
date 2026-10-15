const weatherService = require("../services/weatherService");
const weatherAlertService = require("../services/weatherAlertService");
const User = require("../models/User");

/**
 * Get current conditions and 7-day forecast for user or queried location
 */
exports.getCurrentWeather = async (req, res, next) => {
  try {
    let { location, latitude, longitude } = req.query;

    // Fall back to authenticated user's saved location
    if (!location && (latitude === undefined || longitude === undefined)) {
      location = req.user?.location;
    }

    if (!location && (latitude === undefined || longitude === undefined)) {
      return res.status(400).json({
        success: false,
        message:
          "Farm location is not configured. Please set your farm location in your profile or provide a location query.",
      });
    }

    let coords;
    let locationMeta = {
      name: location || "Custom Coordinates",
      country: "",
      admin1: "",
      latitude: null,
      longitude: null,
      timezone: "auto",
    };

    if (latitude !== undefined && longitude !== undefined) {
      const lat = parseFloat(latitude);
      const lon = parseFloat(longitude);
      if (isNaN(lat) || isNaN(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) {
        return res.status(400).json({
          success: false,
          message: "Invalid latitude or longitude provided (-90..90, -180..180).",
        });
      }
      coords = { latitude: lat, longitude: lon };
      locationMeta.latitude = lat;
      locationMeta.longitude = lon;
    } else {
      try {
        const geo = await weatherService.geocodeLocation(location);
        coords = { latitude: geo.latitude, longitude: geo.longitude };
        locationMeta = geo;
      } catch (geoErr) {
        return res.status(400).json({
          success: false,
          message: geoErr.message || "Failed to resolve location.",
        });
      }
    }

    const forecast = await weatherService.getForecast({
      latitude: coords.latitude,
      longitude: coords.longitude,
      locationName: locationMeta.name,
      country: locationMeta.country,
      admin1: locationMeta.admin1,
      timezone: locationMeta.timezone,
    });

    return res.json({
      success: true,
      data: forecast,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Update farm location for authenticated user
 */
exports.updateLocation = async (req, res, next) => {
  try {
    const { location } = req.body;
    if (!location || typeof location !== "string" || !location.trim()) {
      return res.status(400).json({
        success: false,
        message: "Valid location string is required",
      });
    }

    const trimmed = location.trim();
    try {
      await weatherService.geocodeLocation(trimmed);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: err.message || "Could not validate location",
      });
    }

    const user = await User.findById(req.user._id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found" });
    }

    user.location = trimmed;
    await user.save();

    // Trigger alert re-assessment for the new location
    weatherAlertService.syncWeatherAlerts(user._id, user.location).catch(() => {});

    return res.json({
      success: true,
      message: "Farm location updated successfully",
      data: { location: user.location },
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Get active weather alerts for authenticated user
 */
exports.getAlerts = async (req, res, next) => {
  try {
    const includeDismissed = req.query.includeDismissed === "true";
    const userLocation = req.query.location || req.user.location;

    // Synchronize alerts with current weather if location is available
    if (userLocation) {
      await weatherAlertService.syncWeatherAlerts(req.user._id, userLocation);
    }

    const alerts = await weatherAlertService.getUserAlerts(req.user._id, {
      includeDismissed,
    });

    return res.json({
      success: true,
      data: alerts,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Mark a weather alert as read
 */
exports.markRead = async (req, res, next) => {
  try {
    const alert = await weatherAlertService.markAlertRead(
      req.user._id,
      req.params.id
    );
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found or unauthorized",
      });
    }
    return res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Dismiss a weather alert
 */
exports.dismissAlert = async (req, res, next) => {
  try {
    const alert = await weatherAlertService.dismissAlert(
      req.user._id,
      req.params.id
    );
    if (!alert) {
      return res.status(404).json({
        success: false,
        message: "Alert not found or unauthorized",
      });
    }
    return res.json({
      success: true,
      data: alert,
    });
  } catch (error) {
    return next(error);
  }
};

/**
 * Force on-demand re-sync of weather alerts
 */
exports.refreshAlerts = async (req, res, next) => {
  try {
    const location = req.body?.location || req.user.location;
    const alerts = await weatherAlertService.syncWeatherAlerts(
      req.user._id,
      location
    );
    return res.json({
      success: true,
      message: "Weather alerts refreshed successfully",
      data: alerts,
    });
  } catch (error) {
    return next(error);
  }
};
