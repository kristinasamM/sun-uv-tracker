// ============================================================
// server.js - Express.js Server with OpenUV API Integration
// Uses Axios HTTP client to fetch UV Index data
// ============================================================

const express = require("express");
const axios = require("axios");
const path = require("path");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;
const OPENUV_API_KEY = process.env.OPENUV_API_KEY;

// --- Middleware ---
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// --- Logging Helper ---
function logAPICall(method, url, status, duration) {
  const timestamp = new Date().toISOString();
  const statusColor =
    status >= 200 && status < 300 ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";
  const cyan = "\x1b[36m";
  const yellow = "\x1b[33m";
  const magenta = "\x1b[35m";

  console.log(
    `${cyan}[${timestamp}]${reset} ${yellow}${method}${reset} ${url} → ${statusColor}${status}${reset} ${magenta}(${duration}ms)${reset}`
  );
}

// ============================================================
// ROUTE: GET /api/uv
// Accepts query params: city
// 1. Geocodes the city using OpenStreetMap Nominatim
// 2. Fetches UV data from OpenUV API using Axios
// ============================================================
app.get("/api/uv", async (req, res) => {
  const { city } = req.query;

  if (!city) {
    return res.status(400).json({ error: "City name is required" });
  }

  try {
    // ---- Step 1: Geocode city to lat/lng using Nominatim ----
    const geoStart = Date.now();
    console.log(`\n${"=".repeat(60)}`);
    console.log(`🌍  Geocoding city: "${city}"`);
    console.log(`${"=".repeat(60)}`);

    const geoURL = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(city)}&limit=1`;

    const geoResponse = await axios.get(geoURL, {
      headers: {
        "User-Agent": "SunUVTracker/1.0",
      },
    });

    const geoDuration = Date.now() - geoStart;
    logAPICall("GET", geoURL, geoResponse.status, geoDuration);

    if (!geoResponse.data || geoResponse.data.length === 0) {
      console.log(`\x1b[31m❌  City "${city}" not found!\x1b[0m`);
      return res.status(404).json({ error: `City "${city}" not found. Please try another city name.` });
    }

    const { lat, lon, display_name } = geoResponse.data[0];
    console.log(`\x1b[32m✅  Found: ${display_name}\x1b[0m`);
    console.log(`    📍  Latitude: ${lat}, Longitude: ${lon}`);

    // ---- Step 2: Fetch UV data from OpenUV API using Axios ----
    const uvStart = Date.now();
    const uvURL = `https://api.openuv.io/api/v1/uv?lat=${lat}&lng=${lon}`;

    console.log(`\n☀️   Fetching UV data from OpenUV API...`);
    console.log(`    URL: ${uvURL}`);

    const uvResponse = await axios.get(uvURL, {
      headers: {
        "x-access-token": OPENUV_API_KEY,
        "Content-Type": "application/json",
      },
    });

    const uvDuration = Date.now() - uvStart;
    logAPICall("GET", uvURL, uvResponse.status, uvDuration);

    const uvData = uvResponse.data.result;

    console.log(`\x1b[32m✅  UV Data received successfully!\x1b[0m`);
    console.log(`    🔆  Current UV Index: ${uvData.uv}`);
    console.log(`    🔆  Max UV Index: ${uvData.uv_max}`);
    console.log(`    🌫️   Ozone: ${uvData.ozone} DU`);
    console.log(`${"=".repeat(60)}\n`);

    // ---- Step 3: Send response to client ----
    res.json({
      city: display_name,
      lat: parseFloat(lat),
      lng: parseFloat(lon),
      result: uvData,
    });
  } catch (error) {
    console.error(`\x1b[31m❌  API Error:\x1b[0m`, error.message);

    if (error.response) {
      console.error(`    Status: ${error.response.status}`);
      console.error(`    Data:`, error.response.data);
      logAPICall(
        "GET",
        error.config?.url || "unknown",
        error.response.status,
        0
      );
    }

    res.status(error.response?.status || 500).json({
      error: error.response?.data?.error || "Failed to fetch UV data. Please try again.",
    });
  }
});

// --- Serve the frontend ---
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- Start Server ---
app.listen(PORT, () => {
  console.log(`\n${"=".repeat(60)}`);
  console.log(`☀️   Sun UV Tracker Server`);
  console.log(`${"=".repeat(60)}`);
  console.log(`🚀  Server running at: http://localhost:${PORT}`);
  console.log(`🔑  API Key loaded: ${OPENUV_API_KEY ? "Yes ✅" : "No ❌"}`);
  console.log(`${"=".repeat(60)}\n`);
});
