const express = require("express");
const router = express.Router();
const weatherController = require("../controllers/weatherController");
const { protect } = require("../middleware/auth");

router.get("/current", protect, weatherController.getCurrentWeather);
router.put("/location", protect, weatherController.updateLocation);

// Alert endpoints
router.get("/alerts", protect, weatherController.getAlerts);
router.patch("/alerts/:id/read", protect, weatherController.markRead);
router.patch("/alerts/:id/dismiss", protect, weatherController.dismissAlert);
router.post("/alerts/refresh", protect, weatherController.refreshAlerts);

module.exports = router;
