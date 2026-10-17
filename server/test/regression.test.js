const test = require("node:test");
const assert = require("node:assert/strict");
const express = require("express");
const request = require("supertest");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

const User = require("../models/User");
const authRoutes = require("../routes/auth");
const errorMiddleware = require("../middleware/error");
const { protect, adminOnly } = require("../middleware/auth");

process.env.JWT_SECRET = process.env.JWT_SECRET || "test_jwt_secret_key_123456789";

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use("/api/auth", authRoutes);

  // Admin test endpoint
  app.get("/api/admin-test", protect, adminOnly, (req, res) => {
    res.json({ success: true, message: "Welcome admin" });
  });

  app.use(errorMiddleware);
  return app;
}

test("Authentication and Authorization Regression Tests", async (t) => {
  const app = createTestApp();

  const originalFindOne = User.findOne;
  const originalCreate = User.create;
  const originalFindById = User.findById;

  t.afterEach(() => {
    User.findOne = originalFindOne;
    User.create = originalCreate;
    User.findById = originalFindById;
  });

  const hashedExistingPassword = await bcrypt.hash("ExistingSecret@123", 10);
  const mockExistingUser = {
    _id: "user_12345",
    name: "Existing Farmer",
    email: "existing@cropcalendar.local",
    password: hashedExistingPassword,
    role: "farmer",
    phone: "9876543210",
    location: "Punjab",
    farmSize: "5 acres",
  };

  await t.test("existing user can successfully login with correct credentials", async () => {
    User.findOne = async ({ email }) => {
      if (email === "existing@cropcalendar.local") return mockExistingUser;
      return null;
    };

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "EXISTING@cropcalendar.local", password: "ExistingSecret@123" });

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.ok(res.body.data.token);
    assert.equal(res.body.data.user.email, "existing@cropcalendar.local");
    assert.equal(res.body.data.user.role, "farmer");
    assert.equal(res.body.data.user.password, undefined); // Never return password
  });

  await t.test("login fails with incorrect password", async () => {
    User.findOne = async () => mockExistingUser;

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "existing@cropcalendar.local", password: "WrongPassword" });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /invalid email or password/i);
  });

  await t.test("login fails with non-existent user", async () => {
    User.findOne = async () => null;

    const res = await request(app)
      .post("/api/auth/login")
      .send({ email: "ghost@cropcalendar.local", password: "password123" });

    assert.equal(res.status, 401);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /invalid email or password/i);
  });

  await t.test("/api/auth/me succeeds with valid token", async () => {
    const validToken = jwt.sign({ id: "user_12345" }, process.env.JWT_SECRET);
    User.findById = (id) => ({
      select: async (fields) => {
        if (fields === "-password") {
          const { password, ...safeUser } = mockExistingUser;
          return safeUser;
        }
        return mockExistingUser;
      },
    });

    const res = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${validToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.data.id || res.body.data._id, "user_12345");
    assert.equal(res.body.data.email, "existing@cropcalendar.local");
  });

  await t.test("/api/auth/me rejects missing or malformed token", async () => {
    const resNoToken = await request(app).get("/api/auth/me");
    assert.equal(resNoToken.status, 401);
    assert.match(resNoToken.body.message, /authentication required/i);

    const resBadToken = await request(app)
      .get("/api/auth/me")
      .set("Authorization", "Bearer invalid-token-signature");
    assert.equal(resBadToken.status, 401);
    assert.match(resBadToken.body.message, /invalid token/i);
  });

  await t.test("role-based access: farmer cannot access admin-only endpoint", async () => {
    const validToken = jwt.sign({ id: "user_12345" }, process.env.JWT_SECRET);
    User.findById = () => ({
      select: async () => ({ ...mockExistingUser, role: "farmer" }),
    });

    const res = await request(app)
      .get("/api/admin-test")
      .set("Authorization", `Bearer ${validToken}`);

    assert.equal(res.status, 403);
    assert.equal(res.body.success, false);
    assert.match(res.body.message, /admin access required/i);
  });

  await t.test("role-based access: admin can access admin-only endpoint", async () => {
    const adminToken = jwt.sign({ id: "admin_999" }, process.env.JWT_SECRET);
    User.findById = () => ({
      select: async () => ({
        _id: "admin_999",
        name: "Admin",
        email: "admin@cropcalendar.local",
        role: "admin",
      }),
    });

    const res = await request(app)
      .get("/api/admin-test")
      .set("Authorization", `Bearer ${adminToken}`);

    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Welcome admin");
  });

  await t.test("full end-to-end integration: register user, login, and verify /api/auth/me", async () => {
    let savedUser = null;

    User.findOne = async ({ email }) => {
      if (savedUser && savedUser.email === email) return savedUser;
      return null;
    };

    User.create = async (doc) => {
      savedUser = {
        _id: "newly_created_user_id",
        ...doc,
      };
      return savedUser;
    };

    User.findById = (id) => ({
      select: async () => {
        if (savedUser && savedUser._id === id) {
          const { password, ...safeUser } = savedUser;
          return safeUser;
        }
        return null;
      },
    });

    // 1. Register
    const regRes = await request(app)
      .post("/api/auth/register")
      .send({
        name: "New Registered Farmer",
        email: "newfarmer@cropcalendar.local",
        password: "securePassword2026",
        phone: "1234567890",
        location: "Green Valley",
      });

    assert.equal(regRes.status, 201);
    assert.equal(regRes.body.success, true);
    assert.equal(regRes.body.data.id, "newly_created_user_id");

    // 2. Login with registered credentials
    const loginRes = await request(app)
      .post("/api/auth/login")
      .send({
        email: "NEWFARMER@cropcalendar.local", // test case-insensitive login
        password: "securePassword2026",
      });

    assert.equal(loginRes.status, 200);
    assert.equal(loginRes.body.success, true);
    assert.ok(loginRes.body.data.token);
    assert.equal(loginRes.body.data.user.email, "newfarmer@cropcalendar.local");

    // 3. Query /api/auth/me using returned token
    const meRes = await request(app)
      .get("/api/auth/me")
      .set("Authorization", `Bearer ${loginRes.body.data.token}`);

    assert.equal(meRes.status, 200);
    assert.equal(meRes.body.success, true);
    assert.equal(meRes.body.data.name, "New Registered Farmer");
    assert.equal(meRes.body.data.role, "farmer");
  });
});
