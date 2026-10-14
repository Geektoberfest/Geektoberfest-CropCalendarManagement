const test = require("node:test");
const assert = require("node:assert");
const {
  isValidEmail,
  isValidDate,
  isValidObjectId,
  isNonEmptyString,
  isValidNumber,
} = require("../utils/validator");

test("isValidEmail validates correct emails and rejects invalid ones", () => {
  assert.strictEqual(isValidEmail("farmer@example.com"), true);
  assert.strictEqual(isValidEmail("user.name+tag@domain.co.in"), true);
  assert.strictEqual(isValidEmail(""), false);
  assert.strictEqual(isValidEmail("notanemail"), false);
  assert.strictEqual(isValidEmail("missing@domain"), false);
  assert.strictEqual(isValidEmail("@nodomain.com"), false);
  assert.strictEqual(isValidEmail(null), false);
  assert.strictEqual(isValidEmail(undefined), false);
});

test("isValidDate validates correct dates and rejects invalid ones", () => {
  assert.strictEqual(isValidDate("2026-10-15"), true);
  assert.strictEqual(isValidDate(new Date()), true);
  assert.strictEqual(isValidDate("invalid-date-string"), false);
  assert.strictEqual(isValidDate(""), false);
  assert.strictEqual(isValidDate(null), false);
  assert.strictEqual(isValidDate(undefined), false);
});

test("isValidObjectId validates MongoDB ObjectIds", () => {
  assert.strictEqual(isValidObjectId("507f1f77bcf86cd799439011"), true);
  assert.strictEqual(isValidObjectId("invalid-id"), false);
  assert.strictEqual(isValidObjectId("123"), false);
  assert.strictEqual(isValidObjectId(""), false);
  assert.strictEqual(isValidObjectId(null), false);
});

test("isNonEmptyString identifies valid non-empty trimmed strings", () => {
  assert.strictEqual(isNonEmptyString("Wheat"), true);
  assert.strictEqual(isNonEmptyString("  Rice  "), true);
  assert.strictEqual(isNonEmptyString(""), false);
  assert.strictEqual(isNonEmptyString("   "), false);
  assert.strictEqual(isNonEmptyString(null), false);
  assert.strictEqual(isNonEmptyString(123), false);
});

test("isValidNumber validates numbers and bounds correctly", () => {
  assert.strictEqual(isValidNumber(10, 1, 100), true);
  assert.strictEqual(isValidNumber("50", 1, 100), true);
  assert.strictEqual(isValidNumber(0, 1), false);
  assert.strictEqual(isValidNumber(-5, 0), false);
  assert.strictEqual(isValidNumber("abc"), false);
  assert.strictEqual(isValidNumber(""), true); // empty is optional
  assert.strictEqual(isValidNumber(null), true); // optional
});

test("Crop harvest date logic validates order correctly", () => {
  const planting = "2026-10-15";
  const validHarvest = "2027-02-15";
  const invalidHarvest = "2026-09-01";

  assert.strictEqual(new Date(validHarvest) >= new Date(planting), true);
  assert.strictEqual(new Date(invalidHarvest) >= new Date(planting), false);
});

test("Activity reminder date logic validates order correctly", () => {
  const scheduled = "2026-10-20";
  const validReminder = "2026-10-18";
  const invalidReminder = "2026-10-22";

  assert.strictEqual(new Date(validReminder) <= new Date(scheduled), true);
  assert.strictEqual(new Date(invalidReminder) <= new Date(scheduled), false);
});
