const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const User = require("../models/User");
const authRoutes = require("../routes/auth");
const errorMiddleware = require("../middleware/error");

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);
  app.use(errorMiddleware);
  return app;
}

test("Registration API Tests", async (t) => {
  const app = createTestApp();

  // Save original methods
  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  const originalFindById = User.findById;

  t.afterEach(() => {
    User.findOne = originalFindOne;
    User.create = originalCreate;
    User.findById = originalFindById;
  });

  await t.test("rejection of missing required fields (name, email, password)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ email: "farmer@test.local", password: "password123" });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /name.*email.*password.*required/i);
  });

  await t.test("rejection of whitespace-only name", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "   ", email: "farmer@test.local", password: "password123" });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
  });

  await t.test("rejection of invalid email format", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Farmer Joe", email: "not-an-email", password: "password123" });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /valid email/i);
  });

  await t.test("rejection of short password (< 6 chars)", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Farmer Joe", email: "farmer@test.local", password: "123" });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /at least 6 characters/i);
  });

  await t.test("rejection of duplicate email via findOne check", async () => {
    User.findOne = async () => ({
      _id: "existing_user_id",
      email: "farmer@test.local",
    });

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Farmer Joe", email: "Farmer@Test.Local", password: "password123" });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already registered/i);
  });

  await t.test("handling MongoDB duplicate-key error (E11000 race condition)", async () => {
    User.findOne = async () => null;
    User.create = async () => {
      const err = new Error("E11000 duplicate key error collection");
      err.code = 11000;
      throw err;
    };

    const res = await request(app)
      .post("/api/auth/register")
      .send({ name: "Farmer Joe", email: "farmer@test.local", password: "password123" });

    assert.equal(res.status, 400);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /already registered/i);
  });

  await t.test("successful registration with password hashing, email normalization and farmer role", async () => {
    let createdPayload = null;
    User.findOne = async () => null;
    User.create = async (doc) => {
      createdPayload = doc;
      return {
        _id: "mock_created_id",
        ...doc,
      };
    };

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "  Farmer Joe  ",
        email: "  Farmer.Joe@Test.Local  ",
        password: "secretPassword123",
        phone: " 1234567890 ",
        location: " Farm Valley ",
        role: "admin", // attempt admin escalation
      });

    assert.equal(res.status, 201);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id, "mock_created_id");
    assert.equal(res.body.data.password, undefined); // password hash must never be returned
    assert.equal(res.body.data.hash, undefined);

    // Verify created payload in database
    assert.ok(createdPayload);
    assert.equal(createdPayload.name, "Farmer Joe");
    assert.equal(createdPayload.email, "farmer.joe@test.local");
    assert.equal(createdPayload.phone, "1234567890");
    assert.equal(createdPayload.location, "Farm Valley");
    assert.equal(createdPayload.role, "farmer"); // prevented escalation
    assert.notEqual(createdPayload.password, "secretPassword123"); // must be hashed
    assert.ok(await bcrypt.compare("secretPassword123", createdPayload.password));
  });

  await t.test("gracefully handle database persistence/connection failure without leaking secrets", async () => {
    User.findOne = async () => null;
    User.create = async () => {
      const err = new Error("connection to 10.0.0.1:27017 timed out");
      err.name = "MongoNetworkError";
      throw err;
    };

    const res = await request(app)
      .post("/api/auth/register")
      .send({
        name: "Farmer Joe",
        email: "farmer.joe@test.local",
        password: "secretPassword123",
      });

    assert.equal(res.status, 503);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /database.*unavailable/i);
    assert.ok(!JSON.stringify(res.body).includes("10.0.0.1"));
  });

  await t.test("reject malformed request body", async () => {
    const res = await request(app)
      .post("/api/auth/register")
      .set("Content-Type", "application/json")
      .send("invalid-json");

    assert.ok(res.status >= 400 && res.status < 500);
    assert.equal(res.body.success, false);
  });
});
