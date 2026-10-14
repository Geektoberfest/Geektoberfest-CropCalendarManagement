const mongoose = require("mongoose");
const s = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    phone: String,
    location: String,
    farmSize: String,
    role: { type: String, enum: ["farmer", "admin"], default: "farmer" },
  },
  { timestamps: true },
);
module.exports = mongoose.model("User", s);
