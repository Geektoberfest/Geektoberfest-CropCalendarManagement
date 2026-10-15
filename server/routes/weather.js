const express = require("express");
const router = express.Router();
const weatherController = require("../controllers/weatherController");
const { protect } = require("../middleware/auth");

router.get("/current", protect, weatherController.getCurrentWeather);
router.put("/location", protect, weatherController.updateLocation);

module.exports = router;
