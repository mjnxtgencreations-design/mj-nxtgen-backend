const express = require("express");
const path = require("path");
const fs = require("fs");
const sqlite3 = require("sqlite3").verbose();
const cors = require("cors");

const app = express();
const PORT = process.env.PORT || 3000;

// Allow requests from your Vercel frontend
app.use(cors({
  origin: "https://mj-creations.vercel.app"
}));

app.use(express.json({ limit: "100kb" }));

// Create data folder automatically
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

// Create database
const dbPath = path.join(dataDir, "leads.db");
const db = new sqlite3.Database(dbPath);

db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS leads (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      phone TEXT NOT NULL,
      email TEXT NOT NULL,
      service TEXT NOT NULL,
      details TEXT NOT NULL,
      client_time TEXT,
      client_timezone TEXT,
      ip_address TEXT,
      user_agent TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
});

// Helper functions
function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeText(value, maxLen) {
  const text = (value || "").toString().trim();
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

// Health check
app.get("/", (req, res) => {
  res.send("MJ NxtGen Backend API running");
});

app.get("/api/health", (req, res) => {
  res.json({ ok: true });
});

// Contact form API
app.post("/api/contact", (req, res) => {

  const gotcha = normalizeText(req.body._gotcha, 100);
  const name = normalizeText(req.body.name, 120);
  const phone = normalizeText(req.body.phone, 40);
  const email = normalizeText(req.body.email, 160);
  const service = normalizeText(req.body.service, 120);
  const details = normalizeText(req.body.details, 4000);
  const clientTime = normalizeText(req.body.client_time, 100);
  const clientTimezone = normalizeText(req.body.client_timezone, 100);

  const ipAddress = normalizeText(
    (req.headers["x-forwarded-for"] || req.socket.remoteAddress || "")
      .toString().split(",")[0],
    100
  );

  const userAgent = normalizeText(req.headers["user-agent"], 500);

  // Honeypot spam protection
  if (gotcha) {
    return res.status(201).json({ ok: true, skipped: true });
  }

  if (!name || !phone || !email || !service || !details) {
    return res.status(400).json({ ok: false, error: "All fields are required." });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: "Invalid email address." });
  }

  const sql = `
    INSERT INTO leads
    (name, phone, email, service, details, client_time, client_timezone, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(
    sql,
    [name, phone, email, service, details, clientTime, clientTimezone, ipAddress, userAgent],
    function (err) {
      if (err) {
        return res.status(500).json({ ok: false, error: "Could not store lead." });
      }

      return res.status(201).json({ ok: true, id: this.lastID });
    }
  );
});

// Admin dashboard API
app.get("/api/leads", (req, res) => {

  const token = req.query.token;

  if (token !== "9901") {
    return res.json({ ok: false, error: "Unauthorized" });
  }

  db.all("SELECT * FROM leads ORDER BY id DESC", [], (err, rows) => {

    if (err) {
      return res.json({ ok: false, error: "Database error" });
    }

    res.json({ ok: true, leads: rows });

  });

});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});