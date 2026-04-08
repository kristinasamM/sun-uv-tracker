// ============================================================
// script.js — SolarGuard Client Logic v3
// ============================================================

document.addEventListener("DOMContentLoaded", () => {
  const searchForm = document.getElementById("search-form");
  const cityInput = document.getElementById("city-input");
  const searchBtn = document.getElementById("search-btn");
  const errorToast = document.getElementById("error-toast");
  const errorMsg = document.getElementById("error-message");
  const results = document.getElementById("results");

  // Quick tags
  document.querySelectorAll(".tag").forEach((btn) => {
    btn.addEventListener("click", () => {
      cityInput.value = btn.dataset.city;
      searchForm.dispatchEvent(new Event("submit"));
    });
  });

  // Search
  searchForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const city = cityInput.value.trim();
    if (!city) return;

    searchBtn.classList.add("loading");
    errorToast.style.display = "none";
    results.style.display = "none";

    try {
      const res = await fetch(`/api/uv?city=${encodeURIComponent(city)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to fetch UV data");
      renderResults(data);
    } catch (err) {
      errorMsg.textContent = err.message;
      errorToast.style.display = "flex";
    } finally {
      searchBtn.classList.remove("loading");
    }
  });
});

// ============================================================
// Render
// ============================================================
function renderResults(data) {
  const { city, lat, lng, result } = data;
  const results = document.getElementById("results");

  // Location
  document.getElementById("city-name").textContent = city;
  document.getElementById("coords").textContent = `${lat.toFixed(4)}°, ${lng.toFixed(4)}°`;

  // UV Index
  const uv = result.uv;
  const uvMax = result.uv_max;

  document.getElementById("uv-number").textContent = uv.toFixed(1);
  document.getElementById("uv-current").textContent = uv.toFixed(2);
  document.getElementById("uv-peak").textContent = uvMax.toFixed(2);
  document.getElementById("uv-peak-time").textContent = fmtTime(result.uv_max_time);
  document.getElementById("uv-time").textContent = fmtTime(result.uv_time);

  // UV Risk
  const risk = getUVRisk(uv);
  document.getElementById("uv-risk").textContent = risk.label;
  document.getElementById("uv-risk").style.color = risk.color;

  // Gauge fill
  const maxUV = 15;
  const pct = Math.min(uv / maxUV, 1);
  const circ = 2 * Math.PI * 68;
  document.getElementById("gauge-fill").style.strokeDashoffset = circ * (1 - pct);

  // UV Scale marker
  const markerPct = Math.min(uv / 14, 1) * 100;
  document.getElementById("uv-marker").style.left = `${markerPct}%`;

  // Ozone
  document.getElementById("ozone-value").textContent = result.ozone ? result.ozone.toFixed(1) : "--";
  document.getElementById("ozone-time").textContent = result.ozone_time
    ? `Updated: ${fmtDate(result.ozone_time)}`
    : "--";

  // Sun Position
  if (result.sun_info?.sun_position) {
    const { azimuth, altitude } = result.sun_info.sun_position;
    const azDeg = rad2deg(azimuth);
    const altDeg = rad2deg(altitude);
    document.getElementById("azimuth").textContent = `${azDeg.toFixed(2)}°`;
    document.getElementById("altitude").textContent = `${altDeg.toFixed(2)}°`;
    const compassDeg = azDeg + 180;
    document.getElementById("compass-ptr").style.transform = `translate(-50%, -100%) rotate(${compassDeg}deg)`;
  }

  // Skin types
  renderSkin(result.safe_exposure_time);

  // Sun times
  if (result.sun_info?.sun_times) {
    renderTimeline(result.sun_info.sun_times);
  }

  // JSON
  document.getElementById("json-content").textContent = JSON.stringify(data, null, 2);

  results.style.display = "block";
  results.scrollIntoView({ behavior: "smooth", block: "start" });
}

// ============================================================
// UV Risk
// ============================================================
function getUVRisk(uv) {
  if (uv < 3)  return { label: "LOW", color: "#3DDC84" };
  if (uv < 6)  return { label: "MODERATE", color: "#FFD700" };
  if (uv < 8)  return { label: "HIGH", color: "#FF8C32" };
  if (uv < 11) return { label: "VERY HIGH", color: "#FF4D6A" };
  return { label: "EXTREME", color: "#A78BFA" };
}

// ============================================================
// Skin Types
// ============================================================
function renderSkin(exp) {
  const grid = document.getElementById("skin-grid");
  const skins = [
    { k: "st1", t: "Type I",  e: "👩🏻", d: "Very fair, always burns" },
    { k: "st2", t: "Type II", e: "👩🏼", d: "Fair, usually burns" },
    { k: "st3", t: "Type III",e: "👩🏽", d: "Medium, sometimes burns" },
    { k: "st4", t: "Type IV", e: "👨🏽", d: "Olive, rarely burns" },
    { k: "st5", t: "Type V",  e: "👨🏾", d: "Brown, very rarely burns" },
    { k: "st6", t: "Type VI", e: "👨🏿", d: "Dark, never burns" },
  ];

  grid.innerHTML = skins.map(s => `
    <div class="skin-tile ${s.k}">
      <span class="s-emoji">${s.e}</span>
      <div class="s-type">${s.t}</div>
      <div class="s-mins">${exp[s.k] ?? "--"}</div>
      <div class="s-unit">min</div>
      <div class="s-desc">${s.d}</div>
    </div>
  `).join("");
}

// ============================================================
// Sun Timeline
// ============================================================
function renderTimeline(times) {
  const grid = document.getElementById("timeline-grid");
  const events = [
    { k: "dawn",          i: "🌄", n: "Dawn" },
    { k: "nauticalDawn",  i: "🌊", n: "Nautical Dawn" },
    { k: "sunrise",       i: "🌅", n: "Sunrise" },
    { k: "sunriseEnd",    i: "🌤️", n: "Sunrise End" },
    { k: "goldenHourEnd", i: "✨", n: "Golden Hour End" },
    { k: "solarNoon",     i: "☀️", n: "Solar Noon" },
    { k: "goldenHour",    i: "🌇", n: "Golden Hour" },
    { k: "sunsetStart",   i: "🌆", n: "Sunset Start" },
    { k: "sunset",        i: "🌅", n: "Sunset" },
    { k: "dusk",          i: "🌑", n: "Dusk" },
    { k: "nauticalDusk",  i: "🌊", n: "Nautical Dusk" },
    { k: "night",         i: "🌙", n: "Night" },
    { k: "nadir",         i: "⬇️", n: "Nadir" },
    { k: "nightEnd",      i: "🌌", n: "Night End" },
  ];

  grid.innerHTML = events
    .filter(e => times[e.k])
    .map(e => `
      <div class="tl-item">
        <span class="tl-icon">${e.i}</span>
        <div class="tl-info">
          <span class="tl-name">${e.n}</span>
          <span class="tl-time">${fmtTime(times[e.k])}</span>
        </div>
      </div>
    `).join("");
}

// ============================================================
// Helpers
// ============================================================
function fmtTime(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
}

function fmtDate(iso) {
  if (!iso) return "--";
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function rad2deg(r) { return (r * 180) / Math.PI; }
