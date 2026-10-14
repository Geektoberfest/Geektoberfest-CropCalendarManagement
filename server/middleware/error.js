module.exports = (err, req, res, next) => {
  console.error(err);

  // MongoDB duplicate key error (race condition safeguard)
  if (
    err.code === 11000 ||
    (err.name === "MongoServerError" && err.code === 11000)
  ) {
    return res.status(400).json({
      success: false,
      message: "Email already registered",
    });
  }

  // Mongoose validation error
  if (err.name === "ValidationError") {
    const messages = Object.values(err.errors || {}).map((e) => e.message);
    return res.status(400).json({
      success: false,
      message: messages.join(", ") || "Validation error",
    });
  }

  // MongoDB connection or persistence failure
  if (
    err.name === "MongoServerSelectionError" ||
    err.name === "MongooseServerSelectionError" ||
    err.name === "MongoNetworkError" ||
    (typeof err.message === "string" &&
      err.message.includes("buffering timed out"))
  ) {
    return res.status(503).json({
      success: false,
      message: "Database service is unavailable. Please try again later.",
    });
  }

  const statusCode = err.status || err.statusCode || 500;
  const safeMessage =
    statusCode < 500
      ? err.message
      : "An unexpected server error occurred. Please try again later.";

  res.status(statusCode).json({
    success: false,
    message: safeMessage,
  });
};
