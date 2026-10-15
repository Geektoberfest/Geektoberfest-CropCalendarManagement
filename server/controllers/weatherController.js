const weatherService = require("../services/weatherService");
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
      // Geocode place name or coordinate string
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

    // Retrieve 7-day forecast from Open-Meteo
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
    // Validate that location can be resolved or is valid coords
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

    return res.json({
      success: true,
      message: "Farm location updated successfully",
      data: { location: user.location },
    });
  } catch (error) {
    return next(error);
  }
};
