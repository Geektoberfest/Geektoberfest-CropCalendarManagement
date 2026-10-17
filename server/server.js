require("dotenv").config();

const express = require("express"),
  cors = require("cors"),
  db = require("./config/db"),
  error = require("./middleware/error");

const app = express();

const allowedOrigins = [
  "http://localhost:5173",
  ...(process.env.CLIENT_URL
    ? process.env.CLIENT_URL.split(",").map((s) => s.trim())
    : []),
]
  .filter(Boolean)
  .map((origin) => origin.replace(/\/+$/, ""));

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const cleanOrigin = origin.replace(/\/+$/, "");
      if (allowedOrigins.includes(cleanOrigin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  })
);

app.use(express.json());
app.get("/", (req, res) => {
  res.send("Crop Calendar API is running successfully!");
});

app.get("/api/health", (req, res) =>
  res.json({ success: true, message: "Crop Calendar API running" }),
);

app.use("/api/auth", require("./routes/auth"));
app.use("/api/users", require("./routes/users"));
app.use("/api/crops", require("./routes/crops"));
app.use("/api/activities", require("./routes/activities"));
app.use("/api/notifications", require("./routes/notifications"));
app.use("/api/crop-templates", require("./routes/templates"));
app.use("/api/dashboard", require("./routes/dashboard"));
app.use(error);

const port = process.env.PORT || 5000;
if (require.main === module) {
  db()
    .then(() => app.listen(port, () => console.log(`API listening on ${port}`)))
    .catch((e) => {
      console.error(e);
      process.exit(1);
    });
}

module.exports = app;
