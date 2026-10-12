(() => {
  const DATA = window.__FORECAST__;
  if (!DATA || !DATA.locations) {
    document.body.innerHTML = "<p style='padding:2rem;font-family:system-ui;color:#e8f1ff;background:#0a1628'>Missing forecast data. Run build.py.</p>";
    return;
  }

  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];

  const STORE_KEY = "nws-annapolis-loc-v1";
  let locId = localStorage.getItem(STORE_KEY) || DATA.meta.primary || "annapolis";
  if (!DATA.locations.find((l) => l.id === locId)) locId = DATA.locations[0].id;

  function escapeHtml(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function loc() {
    return DATA.locations.find((l) => l.id === locId) || DATA.locations[0];
  }

  function fmtTime(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
        month: "short",
        day: "numeric",
        hour: "numeric",
        minute: "2-digit",
      }) + " ET";
    } catch {
      return iso;
    }
  }

  function fmtHour(iso) {
    if (!iso) return "—";
    try {
      const d = new Date(iso);
      return d.toLocaleString("en-US", {
        timeZone: "America/New_York",
        weekday: "short",
        hour: "numeric",
      });
    } catch {
      return iso;
    }
  }

  function pop(v) {
    return v == null ? "—" : `${v}%`;
  }

  function setHash(view) {
    if (location.hash.slice(1) !== view) history.replaceState(null, "", "#" + view);
  }

  function showView(view) {
    $$(".tab").forEach((t) => {
      const on = t.dataset.view === view;
      t.classList.toggle("active", on);
      t.setAttribute("aria-selected", on ? "true" : "false");
    });
    $$(".view").forEach((v) => v.classList.toggle("active", v.id === "view-" + view));
    setHash(view);
    render();
  }

  function exampleBanner() {
    if (!DATA.meta.isExample) return "";
    return `<div class="banner-example">EXAMPLE snapshot — live NWS fetch failed at build time. Do not treat these numbers as current weather.</div>`;
  }

  function renderNow() {
    const L = loc();
    const h0 = (L.hourly || [])[0];
    const p0 = (L.periods || [])[0];
    const temp = h0 ? h0.temperature : p0 ? p0.temperature : "—";
    const unit = (h0 && h0.temperatureUnit) || (p0 && p0.temperatureUnit) || "F";
    const short = (h0 && h0.shortForecast) || (p0 && p0.shortForecast) || "—";
    const wind = (h0 && h0.windSpeed) || (p0 && p0.windSpeed) || "—";
    const wdir = (h0 && h0.windDirection) || (p0 && p0.windDirection) || "";
    const popv = h0 ? h0.probabilityOfPrecipitation : p0 ? p0.probabilityOfPrecipitation : null;
    const humid = h0 && h0.humidity != null ? `${h0.humidity}%` : "—";

    const next = (L.periods || []).slice(0, 4).map((p) => `
      <div class="next-card">
        <div class="n">${escapeHtml(p.name || "")}</div>
        <div class="t">${escapeHtml(String(p.temperature))}°${escapeHtml(p.temperatureUnit || "F")}</div>
        <div class="s">${escapeHtml(p.shortForecast || "")}</div>
      </div>`).join("");

    const alertN = (L.alerts || []).length;
    const alertChip = alertN
      ? `<span class="pill alert">${alertN} active alert${alertN > 1 ? "s" : ""}</span>`
      : `<span class="pill soft">No active alerts in snapshot</span>`;

    $("#view-now").innerHTML = `
      ${exampleBanner()}
      <div class="panel">
        <div class="now-hero">
          <div>
            <p class="eyebrow">${escapeHtml(L.label)} · ${escapeHtml(L.cityNote || "")}</p>
            <div class="temp-big">${escapeHtml(String(temp))}<span class="temp-unit">°${escapeHtml(unit)}</span></div>
            <p class="short">${escapeHtml(short)}</p>
            <div class="meta-row">
              <div class="chip"><strong>Wind</strong>${escapeHtml(wdir)} ${escapeHtml(wind)}</div>
              <div class="chip"><strong>Precip</strong>${escapeHtml(pop(popv))}</div>
              <div class="chip"><strong>Humidity</strong>${escapeHtml(humid)}</div>
              <div class="chip"><strong>Grid</strong>${escapeHtml(L.gridId)} ${L.gridX},${L.gridY}</div>
            </div>
            <div style="margin-top:0.85rem">${alertChip}</div>
          </div>
          <div>
            <p class="eyebrow">Next periods</p>
            <div class="next-strip">${next || "<p class='lede'>No periods in snapshot.</p>"}</div>
          </div>
        </div>
      </div>
      <div class="panel">
        <p class="eyebrow">Station / office</p>
        <p class="lede" style="margin:0">${escapeHtml((DATA.meta.office && DATA.meta.office.name) || "NWS")} · updated ${escapeHtml(fmtTime(L.updated || L.generatedAt))}</p>
      </div>`;
  }

  function renderHourly() {
    const L = loc();
    const rows = (L.hourly || []).map((h) => `
      <tr>
        <td>${escapeHtml(fmtHour(h.startTime))}</td>
        <td><strong>${escapeHtml(String(h.temperature))}°</strong></td>
        <td>${escapeHtml(h.shortForecast || "")}</td>
        <td>${escapeHtml(pop(h.probabilityOfPrecipitation))}</td>
        <td>${escapeHtml((h.windDirection || "") + " " + (h.windSpeed || ""))}</td>
        <td>${h.humidity != null ? escapeHtml(h.humidity + "%") : "—"}</td>
      </tr>`).join("");

    $("#view-hourly").innerHTML = `
      ${exampleBanner()}
      <div class="panel">
        <h2 class="view-title">Hourly · ${escapeHtml(L.label)}</h2>
        <p class="lede">Next ${L.hourly ? L.hourly.length : 0} hours from NWS gridpoint forecast (snapshot).</p>
        <div class="hour-scroll">
          <table class="hour-table">
            <thead><tr><th>Time</th><th>Temp</th><th>Conditions</th><th>Precip</th><th>Wind</th><th>RH</th></tr></thead>
            <tbody>${rows || "<tr><td colspan='6'>No hourly data.</td></tr>"}</tbody>
          </table>
        </div>
      </div>`;
  }

  function renderWeek() {
    const L = loc();
    const periods = L.periods || [];
    // Pair day/night when possible
    const cards = periods.map((p) => `
      <div class="day-row">
        <div class="day-name">${escapeHtml(p.name || "")}</div>
        <div class="day-detail">
          <strong>${escapeHtml(p.shortForecast || "")}</strong>
          <div style="margin-top:0.25rem">${escapeHtml(p.detailedForecast || "")}</div>
          <div style="margin-top:0.35rem;font-size:0.8rem;color:var(--muted)">Wind ${escapeHtml((p.windDirection || "") + " " + (p.windSpeed || ""))} · Precip ${escapeHtml(pop(p.probabilityOfPrecipitation))}</div>
        </div>
        <div class="day-temps">${escapeHtml(String(p.temperature))}°${escapeHtml(p.temperatureUnit || "F")}</div>
      </div>`).join("");

    $("#view-week").innerHTML = `
      ${exampleBanner()}
      <div class="panel">
        <h2 class="view-title">7-day · ${escapeHtml(L.label)}</h2>
        <p class="lede">${periods.length} forecast periods from NWS (day + night).</p>
        <div class="day-grid">${cards || "<p>No periods.</p>"}</div>
      </div>`;
  }

  function renderAlerts() {
    const L = loc();
    const alerts = L.alerts || [];
    let body;
    if (!alerts.length) {
      body = `<div class="empty-ok">No active alerts in this snapshot for ${escapeHtml(L.label)}.</div>`;
    } else {
      body = alerts.map((a) => `
        <article class="alert-card">
          <h3>${escapeHtml(a.event || "Alert")}</h3>
          <div class="hl">${escapeHtml(a.headline || "")}</div>
          <div class="meta-row">
            <div class="chip"><strong>Urgency</strong>${escapeHtml(a.urgency || "—")}</div>
            <div class="chip"><strong>Certainty</strong>${escapeHtml(a.certainty || "—")}</div>
            <div class="chip"><strong>Ends</strong>${escapeHtml(fmtTime(a.ends))}</div>
          </div>
          ${a.areaDesc ? `<p class="fine" style="margin-top:0.5rem">${escapeHtml(a.areaDesc)}</p>` : ""}
          ${a.description ? `<pre>${escapeHtml(a.description)}</pre>` : ""}
          ${a.instruction ? `<pre style="margin-top:0.5rem;color:#fcd34d">${escapeHtml(a.instruction)}</pre>` : ""}
        </article>`).join("");
    }

    $("#view-alerts").innerHTML = `
      ${exampleBanner()}
      <div class="panel">
        <h2 class="view-title">Alerts · ${escapeHtml(L.label)}</h2>
        <p class="lede">Active alerts from api.weather.gov at snapshot time — not live-polled in the browser.</p>
        ${body}
      </div>`;
  }

  function render() {
    const hash = (location.hash || "#now").slice(1) || "now";
    const view = ["now", "hourly", "week", "alerts", "about"].includes(hash) ? hash : "now";
    if (!$("#view-" + view).classList.contains("active")) {
      // keep sync without recursion
    }
    renderNow();
    renderHourly();
    renderWeek();
    renderAlerts();
  }

  // header
  const officeName = (DATA.meta.office && DATA.meta.office.name) || "NWS LWX";
  $("#officePill").textContent = officeName;
  const snapLabel = DATA.meta.snapshotAtLabel || DATA.meta.snapshotAt || "unknown";
  if (DATA.meta.isExample) {
    $("#snapPill").textContent = "EXAMPLE · " + snapLabel;
    $("#snapPill").classList.add("example");
  } else {
    $("#snapPill").textContent = "Snapshot · " + snapLabel;
  }
  $("#footSnap").textContent = "snapshot at " + snapLabel + (DATA.meta.isExample ? " (EXAMPLE)" : "");

  const sel = $("#locSelect");
  sel.value = locId;
  sel.addEventListener("change", () => {
    locId = sel.value;
    localStorage.setItem(STORE_KEY, locId);
    render();
  });

  $$(".tab").forEach((t) => t.addEventListener("click", () => showView(t.dataset.view)));
  window.addEventListener("hashchange", () => {
    const v = (location.hash || "#now").slice(1) || "now";
    if (["now", "hourly", "week", "alerts", "about"].includes(v)) showView(v);
  });

  const initial = (location.hash || "#now").slice(1) || "now";
  showView(["now", "hourly", "week", "alerts", "about"].includes(initial) ? initial : "now");
})();
