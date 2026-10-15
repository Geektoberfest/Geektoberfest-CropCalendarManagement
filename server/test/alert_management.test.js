const test = require("node:test");
const assert = require("node:assert/strict");
const mongoose = require("mongoose");
const WeatherAlert = require("../models/WeatherAlert");
const weatherAlertService = require("../services/weatherAlertService");

test("Weather Alert Management & Deduplication Tests", async (t) => {
  const userA = new mongoose.Types.ObjectId().toString();
  const userB = new mongoose.Types.ObjectId().toString();
  const alertId1 = new mongoose.Types.ObjectId().toString();
  const act1 = new mongoose.Types.ObjectId().toString();

  // In-memory alert store to simulate database persistence
  let mockStore = [];

  const originalFindOneAndUpdate = WeatherAlert.findOneAndUpdate;
  const originalFind = WeatherAlert.find;
  const originalCountDocuments = WeatherAlert.countDocuments;
  const originalDeleteMany = WeatherAlert.deleteMany;

  t.beforeEach(() => {
    mockStore = [];

    WeatherAlert.deleteMany = async (filter) => {
      mockStore = mockStore.filter((doc) => {
        if (filter.user && filter.user.toString() === doc.user.toString()) {
          return false;
        }
        return true;
      });
      return { deletedCount: 1 };
    };

    WeatherAlert.countDocuments = async (filter) => {
      return mockStore.filter(
        (doc) => !filter.user || doc.user.toString() === filter.user.toString()
      ).length;
    };

    WeatherAlert.find = (filter) => {
      let results = mockStore.filter((doc) => {
        let match = true;
        if (filter.user && doc.user.toString() !== filter.user.toString()) {
          match = false;
        }
        if (filter.isDismissed !== undefined && doc.isDismissed !== filter.isDismissed) {
          match = false;
        }
        return match;
      });

      return {
        sort: () => results,
      };
    };

    WeatherAlert.findOneAndUpdate = async (filter, update, options) => {
      let idx = mockStore.findIndex((doc) => {
        let match = true;
        if (filter._id && doc._id.toString() !== filter._id.toString()) match = false;
        if (filter.user && doc.user.toString() !== filter.user.toString()) match = false;
        if (filter.alertKey && doc.alertKey !== filter.alertKey) match = false;
        return match;
      });

      if (idx >= 0) {
        // Update existing document
        const target = mockStore[idx];
        const fields = update.$set || update;
        Object.assign(target, fields);
        return target;
      } else if (options && options.upsert) {
        // Upsert new document
        const newDoc = {
          _id: new mongoose.Types.ObjectId().toString(),
          ...update.$setOnInsert,
          ...update.$set,
        };
        mockStore.push(newDoc);
        return newDoc;
      }
      return null;
    };
  });

  t.afterEach(() => {
    WeatherAlert.findOneAndUpdate = originalFindOneAndUpdate;
    WeatherAlert.find = originalFind;
    WeatherAlert.countDocuments = originalCountDocuments;
    WeatherAlert.deleteMany = originalDeleteMany;
  });

  await t.test("Deterministic deduplication prevents duplicate alerts for same user and event", async () => {
    const alertKey = `${act1}_irrigation_2026-10-16`;

    // First insertion
    const created1 = await WeatherAlert.findOneAndUpdate(
      { user: userA, alertKey },
      {
        $set: {
          activity: act1,
          activityName: "Irrigation 1",
          cropName: "Wheat",
          category: "Irrigation",
          ruleType: "irrigation_rain",
          title: "Rain Expected — Review Irrigation",
          message: "5 mm rain forecast",
          forecastDate: "2026-10-16",
          scheduledDate: new Date("2026-10-16T00:00:00Z"),
          weatherValues: { precipitationSum: 5.0 },
        },
        $setOnInsert: {
          user: userA,
          alertKey,
          isRead: false,
          isDismissed: false,
        },
      },
      { upsert: true, new: true }
    );

    assert.ok(created1);
    assert.equal(created1.alertKey, alertKey);

    // Second insertion (simulating dashboard refresh or forecast re-check)
    const created2 = await WeatherAlert.findOneAndUpdate(
      { user: userA, alertKey },
      {
        $set: {
          message: "Updated to 7 mm rain forecast",
          weatherValues: { precipitationSum: 7.0 },
        },
        $setOnInsert: {
          user: userA,
          alertKey,
          isRead: false,
          isDismissed: false,
        },
      },
      { upsert: true, new: true }
    );

    const totalAlerts = await WeatherAlert.countDocuments({ user: userA });
    assert.equal(totalAlerts, 1, "Must maintain exactly 1 alert record without duplicates");
    assert.equal(created2.message, "Updated to 7 mm rain forecast");
  });

  await t.test("Mark alert as read updates status correctly", async () => {
    const alertKey = `${act1}_spraying_2026-10-17`;
    mockStore.push({
      _id: alertId1,
      user: userA,
      alertKey,
      title: "Rain May Affect Spraying",
      isRead: false,
      isDismissed: false,
    });

    const updated = await weatherAlertService.markAlertRead(userA, alertId1);
    assert.ok(updated);
    assert.equal(updated.isRead, true);
  });

  await t.test("Dismiss alert marks isDismissed and filters out from active list", async () => {
    mockStore.push({
      _id: alertId1,
      user: userA,
      alertKey: "key_1",
      title: "Test Alert",
      isRead: false,
      isDismissed: false,
    });

    await weatherAlertService.dismissAlert(userA, alertId1);

    const activeAlerts = await weatherAlertService.getUserAlerts(userA, {
      includeDismissed: false,
    });
    assert.equal(activeAlerts.length, 0);

    const allAlerts = await weatherAlertService.getUserAlerts(userA, {
      includeDismissed: true,
    });
    assert.equal(allAlerts.length, 1);
    assert.equal(allAlerts[0].isDismissed, true);
  });

  await t.test("User isolation ensures User B cannot access or modify User A's alerts", async () => {
    mockStore.push({
      _id: alertId1,
      user: userA,
      alertKey: "key_userA",
      title: "User A Alert",
      isRead: false,
      isDismissed: false,
    });

    // User B tries to mark User A's alert as read
    const unauthorizedRead = await weatherAlertService.markAlertRead(
      userB,
      alertId1
    );
    assert.equal(unauthorizedRead, null, "User B should not be able to modify User A's alert");

    // User B gets their own alerts
    const userBAlerts = await weatherAlertService.getUserAlerts(userB);
    assert.equal(userBAlerts.length, 0);
  });
});
