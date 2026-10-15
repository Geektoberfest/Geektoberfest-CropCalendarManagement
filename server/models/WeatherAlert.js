const mongoose = require("mongoose");

const weatherAlertSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    activity: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Activity",
      required: true,
      index: true,
    },
    crop: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "UserCrop",
    },
    cropName: {
      type: String,
      default: "Crop",
    },
    activityName: {
      type: String,
      required: true,
    },
    alertKey: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    ruleType: {
      type: String,
      required: true,
    },
    severity: {
      type: String,
      enum: ["info", "warning", "critical"],
      default: "warning",
    },
    title: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
    recommendation: {
      type: String,
    },
    forecastDate: {
      type: String,
      required: true,
    },
    scheduledDate: {
      type: Date,
      required: true,
    },
    weatherValues: {
      precipitationSum: { type: Number, default: 0 },
      precipitationProbability: { type: Number, default: 0 },
      windSpeedMax: { type: Number, default: 0 },
      tempMax: { type: Number, default: null },
      tempMin: { type: Number, default: null },
      condition: { type: String, default: "" },
    },
    isRead: {
      type: Boolean,
      default: false,
    },
    isDismissed: {
      type: Boolean,
      default: false,
    },
  },
  { timestamps: true }
);

// Compound index to ensure deterministic alert deduplication per user and event
weatherAlertSchema.index({ user: 1, alertKey: 1 }, { unique: true });

module.exports = mongoose.model("WeatherAlert", weatherAlertSchema);
