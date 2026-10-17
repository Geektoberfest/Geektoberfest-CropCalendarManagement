const mongoose = require("mongoose");
const activity = new mongoose.Schema(
  {
    activityName: String,
    description: String,
    category: String,
    dayOffset: Number,
    priority: { type: String, default: "Medium" },
    defaultReminderDays: { type: Number, default: 1 },
  },
  { _id: true },
);
const s = new mongoose.Schema(
  {
    name: { type: String, required: true, unique: true },
    category: String,
    description: String,
    typicalDuration: Number,
    sowingSeason: { type: String, default: "" },
    image: { type: String, default: "" },
    activities: [activity],
  },
  { timestamps: true },
);
module.exports = mongoose.model("CropTemplate", s);
