const User = require("../models/User");
const bcrypt = require("bcryptjs");
const token = require("../utils/token");

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

exports.register = async (req, res, next) => {
  try {
    if (!req.body || typeof req.body !== "object") {
      return res.status(400).json({
        success: false,
        message: "Request body is required",
      });
    }

    const {
      name,
      email,
      password,
      phone,
      location,
      role = "farmer",
    } = req.body;

    // Required fields check (types & non-empty strings)
    if (
      typeof name !== "string" ||
      !name.trim() ||
      typeof email !== "string" ||
      !email.trim() ||
      typeof password !== "string" ||
      !password
    ) {
      return res.status(400).json({
        success: false,
        message: "Name, email and password are required",
      });
    }

    // Email format validation
    const trimmedEmail = email.trim();
    if (!EMAIL_REGEX.test(trimmedEmail)) {
      return res.status(400).json({
        success: false,
        message: "Please provide a valid email address",
      });
    }

    // Password validation (do NOT silently alter password)
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    // Normalize email consistently
    const normalizedEmail = trimmedEmail.toLowerCase();

    // Check if email already exists
    const existingUser = await User.findOne({
      email: normalizedEmail,
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Trim string fields
    const trimmedName = name.trim();
    const trimmedPhone = typeof phone === "string" ? phone.trim() : phone;
    const trimmedLocation =
      typeof location === "string" ? location.trim() : location;

    // Create user
    const user = await User.create({
      name: trimmedName,
      email: normalizedEmail,
      password: await bcrypt.hash(password, 10),
      phone: trimmedPhone,
      location: trimmedLocation,

      // Never allow public registration as admin
      role: role === "admin" ? "farmer" : role,
    });

    return res.status(201).json({
      success: true,
      message: "Registration successful",
      data: {
        id: user._id,
      },
    });
  } catch (error) {
    // Handle MongoDB duplicate key error (race conditions on unique index)
    if (
      error.code === 11000 ||
      (error.name === "MongoServerError" && error.code === 11000)
    ) {
      return res.status(400).json({
        success: false,
        message: "Email already registered",
      });
    }

    // Handle Mongoose validation errors
    if (error.name === "ValidationError") {
      const messages = Object.values(error.errors).map((e) => e.message);
      return res.status(400).json({
        success: false,
        message: messages.join(", ") || "Validation error",
      });
    }

    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const email = req.body.email?.trim().toLowerCase();
    const password = req.body.password || "";

    const user = await User.findOne({
      email,
    });

    if (!user || !(await bcrypt.compare(password, user.password))) {
      return res.status(401).json({
        success: false,
        message: "Invalid email or password",
      });
    }

    return res.json({
      success: true,
      data: {
        token: token(user._id),
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role,
          phone: user.phone,
          location: user.location,
          farmSize: user.farmSize,
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

exports.me = async (req, res) => {
  res.json({
    success: true,
    data: req.user,
  });
};