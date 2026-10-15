# 🌾 Crop Calendar Management Platform

A contributor-friendly MERN application for farmers to plan crop activities, generate crop calendars, set in-app reminders, track completion, and monitor progress.

## Features
- JWT authentication and farmer/admin roles
- Weather forecasts (current conditions & 7-day outlook) and weather-based farming alerts
- Crop templates for Wheat, Rice, Cotton, Soybean, Maize, Tomato, Potato, Onion, Sugarcane and Chickpea
- Automatic calendar generation from planting date + activity offsets
- Personalized activities with priority, reminders and notes
- Calendar/list views, search and filters
- Dashboard statistics and crop progress
- In-app notifications
- Simple admin crop-template management
- Responsive UI

## Stack
React + Vite, React Router, Axios, CSS, Node.js, Express, MongoDB/Mongoose, JWT, bcryptjs.

## Structure
`client/` contains the React app. `server/` contains the Express API and MongoDB models.

## Setup
1. Install Node.js 18+ and MongoDB Atlas.
2. Copy `server/.env.example` to `server/.env`.
3. Copy `client/.env.example` to `client/.env`.
4. Run `cd server && npm install && npm run seed && npm run dev`.
5. In another terminal run `cd client && npm install && npm run dev`.
6. Open http://localhost:5173.

## Testing
- Backend tests: `cd server && npm test`
- Frontend tests: `cd client && npm test`

## Environment
Server: `PORT=5000`, `MONGO_URI=...`, `JWT_SECRET=...`, `CLIENT_URL=http://localhost:5173`.
Client: `VITE_API_URL=http://localhost:5000/api`.

## Seed
`npm run seed` inserts crop templates and an admin account. The seeded admin credentials are documented in the seed output; change the password after first login in a real deployment.

## API
Auth: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
Users: `GET/PUT /api/users/profile`
Weather: `GET /api/weather/current`, `PUT /api/weather/location`, `GET /api/weather/alerts`, `PATCH /api/weather/alerts/:id/read`, `PATCH /api/weather/alerts/:id/dismiss`, `POST /api/weather/alerts/refresh`
Templates: `GET/GET:id/POST/PUT/DELETE /api/crop-templates`
Crops: `GET/GET:id/POST/PUT/DELETE /api/crops`
Activities: `GET/GET:id/POST/PUT/DELETE /api/activities`, `PATCH /api/activities/:id/complete`
Notifications: `GET /api/notifications`, `PATCH /api/notifications/:id/read`, `PATCH /api/notifications/read-all`
Dashboard: `GET /api/dashboard`

Frontend routes include `/dashboard`, `/crops`, `/crops/add`, `/crops/:id`, `/calendar`, `/activities`, `/notifications`, `/statistics`, `/profile`, and `/admin`.

## 🌦️ Weather Forecasts & Farming Alerts

### Provider & Architecture
- **Provider**: Open-Meteo Weather API & Geocoding API (free, reliable, non-commercial/commercial friendly, no API key required).
- **Location Resolution**: Supports city/district/place names (resolved via Open-Meteo Geocoding) and direct latitude/longitude coordinate pairs (`"lat,lon"`). Persisted to farmer profile and editable directly from the dashboard weather widget.
- **Caching**: 15-minute in-memory TTL caching on geocoding and forecast queries to optimize performance and prevent rate limiting.
- **Resilience**: Graceful fallbacks for network errors, missing location, or unavailable fields without disrupting dashboard core operations.

### Advisory Alert Rules & Decision Support
The agricultural alert rule engine evaluates forecast conditions against scheduled crop activities:
1. **Irrigation**: Flags scheduled watering when rainfall >= 3 mm or rain probability >= 50% is forecast on the scheduled date, preventing over-irrigation.
2. **Spraying**: Flags pesticide/herbicide application when rainfall >= 1 mm / rain probability >= 40% is forecast within 24–48h (preventing chemical wash-off) or maximum wind speeds exceed 20 km/h (drift risk).
3. **Fertilizer**: Flags applications when substantial rainfall (>= 5 mm, critical >= 12 mm) is expected to prevent nutrient surface runoff and leaching.
4. **Planting**: Flags heavy rainfall (>= 20 mm) that causes waterlogging/seed rot or extreme temperatures (>= 38°C) causing seedling heat stress.
5. **Harvesting**: Flags rainfall (>= 4 mm, critical >= 15 mm) during harvest window to prevent mold and produce spoilage.
6. **Alert Lifecycle**: Alerts can be viewed in a dedicated dashboard section, marked as read, or dismissed. Calendar activities display inline warning badges with expandable advisories. Duplicate alerts are deterministically prevented using unique `alertKey` composite indexing.

## MongoDB Atlas
Create a cluster, database user and network access rule. Put the Atlas connection string in `MONGO_URI`.

## Deployment
Frontend can be deployed to Vercel with `VITE_API_URL` set to the deployed Render API URL. Deploy the backend to Render with `npm start` and the MongoDB Atlas URI. Configure CORS using `CLIENT_URL`.

## Contribution Opportunities
These are intentionally isolated medium-difficulty tasks:
1. **Weather-aware reminders** – add a service under `server/services/` and a dashboard card; do not change core crop/calendar APIs.
2. **Email reminders** – add an optional mail service and settings UI; keep in-app reminders working without it.
3. **Advanced statistics** – add a dedicated statistics chart module using the existing dashboard/activity APIs.
4. **Multilingual UI** – add a simple translation layer under `client/src/utils/` without changing backend contracts.

See `CONTRIBUTING.md` for workflow and issue ideas.
