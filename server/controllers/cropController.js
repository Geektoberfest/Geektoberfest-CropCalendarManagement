const Crop = require("../models/UserCrop"),
  Template = require("../models/CropTemplate"),
  Activity = require("../models/Activity"),
  calendar = require("../services/calendarService");
const { isValidObjectId, isValidDate, isNonEmptyString } = require("../utils/validator");
exports.list = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: await Crop.find({ user: req.user._id }).populate("cropTemplate"),
    });
  } catch (e) {
    next(e);
  }
};
exports.get = async (req, res, next) => {
  try {
    const crop = await Crop.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("cropTemplate");
    if (!crop)
      return res
        .status(404)
        .json({ success: false, message: "Crop not found" });
    const activities = await Activity.find({
      crop: crop._id,
      user: req.user._id,
    }).sort({ scheduledDate: 1 });
    const done = activities.filter((a) => a.status === "Completed").length;
    res.json({
      success: true,
      data: {
        crop,
        activities,
        progress: activities.length
          ? Math.round((done / activities.length) * 100)
          : 0,
      },
    });
  } catch (e) {
    next(e);
  }
};
exports.create = async (req, res, next) => {
  try {
    const { cropTemplate, cropName, plantingDate, expectedHarvestDate, ...data } = req.body;

    if (!isValidObjectId(cropTemplate)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid crop template is required" });
    }

    if (!isNonEmptyString(cropName)) {
      return res
        .status(400)
        .json({ success: false, message: "Crop name is required" });
    }

    if (!isValidDate(plantingDate)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid planting date is required" });
    }

    if (expectedHarvestDate) {
      if (!isValidDate(expectedHarvestDate)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid expected harvest date" });
      }
      if (new Date(expectedHarvestDate) < new Date(plantingDate)) {
        return res.status(400).json({
          success: false,
          message: "Expected harvest date cannot be earlier than planting date",
        });
      }
    }

    const t = await Template.findById(cropTemplate);
    if (!t)
      return res
        .status(400)
        .json({ success: false, message: "Invalid crop template" });
    const c = await Crop.create({
      ...data,
      cropName: cropName.trim(),
      plantingDate,
      expectedHarvestDate: expectedHarvestDate || null,
      cropTemplate,
      user: req.user._id,
    });
    await calendar.generate(req.user._id, c, t);
    res
      .status(201)
      .json({ success: true, message: "Crop and calendar created", data: c });
  } catch (e) {
    next(e);
  }
};
exports.update = async (req, res, next) => {
  try {
    const { cropName, plantingDate, expectedHarvestDate } = req.body;

    if (cropName !== undefined && !isNonEmptyString(cropName)) {
      return res
        .status(400)
        .json({ success: false, message: "Crop name cannot be empty" });
    }

    if (plantingDate !== undefined && !isValidDate(plantingDate)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid planting date" });
    }

    if (expectedHarvestDate !== undefined && expectedHarvestDate !== null && expectedHarvestDate !== "") {
      if (!isValidDate(expectedHarvestDate)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid expected harvest date" });
      }
    }

    const c = await Crop.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true },
    );
    if (!c)
      return res
        .status(404)
        .json({ success: false, message: "Crop not found" });
    res.json({ success: true, data: c });
  } catch (e) {
    next(e);
  }
};
exports.remove = async (req, res, next) => {
  try {
    const c = await Crop.findOneAndDelete({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!c)
      return res
        .status(404)
        .json({ success: false, message: "Crop not found" });
    await Activity.deleteMany({ crop: c._id, user: req.user._id });
    res.json({ success: true, message: "Crop deleted" });
  } catch (e) {
    next(e);
  }
};
