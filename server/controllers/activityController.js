const Activity = require("../models/Activity"),
  Notification = require("../models/Notification");
const { isValidObjectId, isValidDate, isNonEmptyString } = require("../utils/validator");
const statusOf = (a) =>
  a.status === "Completed"
    ? "Completed"
    : new Date(a.scheduledDate) < new Date(new Date().setHours(0, 0, 0, 0))
      ? "Overdue"
      : "Pending";
exports.list = async (req, res, next) => {
  try {
    const q = { user: req.user._id };
    if (req.query.search) q.name = { $regex: req.query.search, $options: "i" };
    let a = await Activity.find(q).populate("crop").sort({ scheduledDate: 1 });
    if (req.query.status) a = a.filter((x) => statusOf(x) === req.query.status);
    a = a.map((x) => ({ ...x.toObject(), status: statusOf(x) }));
    res.json({ success: true, data: a });
  } catch (e) {
    next(e);
  }
};
exports.get = async (req, res, next) => {
  try {
    const a = await Activity.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).populate("crop");
    if (!a)
      return res
        .status(404)
        .json({ success: false, message: "Activity not found" });
    res.json({ success: true, data: { ...a.toObject(), status: statusOf(a) } });
  } catch (e) {
    next(e);
  }
};
exports.create = async (req, res, next) => {
  try {
    const { name, crop, scheduledDate, reminderDate, ...data } = req.body;

    if (!isNonEmptyString(name)) {
      return res
        .status(400)
        .json({ success: false, message: "Activity name is required" });
    }

    if (!isValidObjectId(crop)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid crop reference is required" });
    }

    if (!isValidDate(scheduledDate)) {
      return res
        .status(400)
        .json({ success: false, message: "Valid scheduled date is required" });
    }

    if (reminderDate) {
      if (!isValidDate(reminderDate)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid reminder date" });
      }
      if (new Date(reminderDate) > new Date(scheduledDate)) {
        return res.status(400).json({
          success: false,
          message: "Reminder date cannot be after scheduled date",
        });
      }
    }

    const a = await Activity.create({
      ...data,
      name: name.trim(),
      crop,
      scheduledDate,
      reminderDate: reminderDate || null,
      user: req.user._id,
    });
    res.status(201).json({ success: true, data: a });
  } catch (e) {
    next(e);
  }
};
exports.update = async (req, res, next) => {
  try {
    const { name, crop, scheduledDate, reminderDate } = req.body;

    if (name !== undefined && !isNonEmptyString(name)) {
      return res
        .status(400)
        .json({ success: false, message: "Activity name cannot be empty" });
    }

    if (crop !== undefined && !isValidObjectId(crop)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid crop reference" });
    }

    if (scheduledDate !== undefined && !isValidDate(scheduledDate)) {
      return res
        .status(400)
        .json({ success: false, message: "Invalid scheduled date" });
    }

    if (reminderDate !== undefined && reminderDate !== null && reminderDate !== "") {
      if (!isValidDate(reminderDate)) {
        return res
          .status(400)
          .json({ success: false, message: "Invalid reminder date" });
      }
    }

    const a = await Activity.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      req.body,
      { new: true },
    );
    if (!a)
      return res
        .status(404)
        .json({ success: false, message: "Activity not found" });
    res.json({ success: true, data: a });
  } catch (e) {
    next(e);
  }
};
exports.remove = async (req, res, next) => {
  try {
    await Activity.findOneAndDelete({ _id: req.params.id, user: req.user._id });
    res.json({ success: true, message: "Activity deleted" });
  } catch (e) {
    next(e);
  }
};
exports.complete = async (req, res, next) => {
  try {
    const a = await Activity.findOneAndUpdate(
      { _id: req.params.id, user: req.user._id },
      {
        status: "Completed",
        completedDate: new Date(),
        completionNotes: req.body.completionNotes || "",
      },
      { new: true },
    );
    if (!a)
      return res
        .status(404)
        .json({ success: false, message: "Activity not found" });
    await Notification.create({
      user: req.user._id,
      activity: a._id,
      title: "Activity completed",
      message: `${a.name} was marked complete.`,
      type: "completed",
    });
    res.json({ success: true, data: a });
  } catch (e) {
    next(e);
  }
};
