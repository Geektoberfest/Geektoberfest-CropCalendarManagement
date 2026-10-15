const test = require("node:test");
const assert = require("node:assert/strict");
const request = require("supertest");
const app = require("../server");

test("Weather integration baseline regression tests", async (t) => {
  await t.test("GET / returns 200 with API status message", async () => {
    const res = await request(app).get("/");
    assert.equal(res.status, 200);
    assert.match(res.text, /Crop Calendar API/);
  });

  await t.test("GET /api/health returns success JSON", async () => {
    const res = await request(app).get("/api/health");
    assert.equal(res.status, 200);
    assert.equal(res.body.success, true);
    assert.equal(res.body.message, "Crop Calendar API running");
  });

  await t.test("Unauthenticated requests to protected routes return 401", async () => {
    const res1 = await request(app).get("/api/dashboard");
    assert.equal(res1.status, 401);

    const res2 = await request(app).get("/api/crops");
    assert.equal(res2.status, 401);

    const res3 = await request(app).get("/api/activities");
    assert.equal(res3.status, 401);

    const res4 = await request(app).get("/api/notifications");
    assert.equal(res4.status, 401);
  });
});
