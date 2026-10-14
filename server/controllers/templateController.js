const Template = require("../models/CropTemplate");
const { isNonEmptyString, isValidNumber } = require("../utils/validator");
exports.list = async (req, res, next) => {
  try {
    res.json({ success: true, data: await Template.find().sort({ name: 1 }) });
  } catch (e) {
    next(e);
  }
};
exports.get = async (req, res, next) => {
  try {
    const x = await Template.findById(req.params.id);
    if (!x)
      return res
        .status(404)
        .json({ success: false, message: "Template not found" });
    res.json({ success: true, data: x });
  } catch (e) {
    next(e);
  }
};
exports.create = async (req, res, next) => {
  try {
    const { name, typicalDuration } = req.body;
    if (!isNonEmptyString(name)) {
      return res
        .status(400)
        .json({ success: false, message: "Template name is required" });
    }
    if (typicalDuration !== undefined && typicalDuration !== "" && !isValidNumber(typicalDuration, 1)) {
      return res.status(400).json({
        success: false,
        message: "Typical growing duration must be a positive number of days",
      });
    }
    res
      .status(201)
      .json({ success: true, data: await Template.create(req.body) });
  } catch (e) {
    next(e);
  }
};
exports.update = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await Template.findByIdAndUpdate(req.params.id, req.body, {
        new: true,
      }),
    });
  } catch (e) {
    next(e);
  }
};
exports.remove = async (req, res, next) => {
  try {
    await Template.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: "Template deleted" });
  } catch (e) {
    next(e);
  }
};
