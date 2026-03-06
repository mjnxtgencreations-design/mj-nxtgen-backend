const express = require('express');
const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const cors = require("cors");

app.use(cors());

const app = express();
const PORT = process.env.PORT || 3000;
const ADMIN_TOKEN = process.env.ADMIN_TOKEN || 'change-this-admin-token';

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'leads.db');
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

app.use(express.json({ limit: '100kb' }));
app.use(express.static(__dirname));

function isValidEmail(value) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
}

function normalizeText(value, maxLen) {
  const text = (value || '').toString().trim();
  return text.length > maxLen ? text.slice(0, maxLen) : text;
}

app.get('/api/health', (_req, res) => {
  res.json({ ok: true, service: 'mj-nxtgen-contact-api' });
});

app.post('/api/contact', (req, res) => {
  const gotcha = normalizeText(req.body._gotcha, 100);
  const name = normalizeText(req.body.name, 120);
  const phone = normalizeText(req.body.phone, 40);
  const email = normalizeText(req.body.email, 160);
  const service = normalizeText(req.body.service, 120);
  const details = normalizeText(req.body.details, 4000);
  const clientTime = normalizeText(req.body.client_time, 100);
  const clientTimezone = normalizeText(req.body.client_timezone, 100);
  const ipAddress = normalizeText((req.headers['x-forwarded-for'] || req.socket.remoteAddress || '').toString().split(',')[0], 100);
  const userAgent = normalizeText(req.headers['user-agent'], 500);

  // Honeypot trap: if bots fill this hidden field, accept without storing
  if (gotcha) {
    return res.status(201).json({ ok: true, skipped: true });
  }

  if (!name || !phone || !email || !service || !details) {
    return res.status(400).json({ ok: false, error: 'All fields are required.' });
  }

  if (!isValidEmail(email)) {
    return res.status(400).json({ ok: false, error: 'Invalid email address.' });
  }

  const sql = `
    INSERT INTO leads (name, phone, email, service, details, client_time, client_timezone, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `;

  db.run(sql, [name, phone, email, service, details, clientTime, clientTimezone, ipAddress, userAgent], function insertCallback(err) {
    if (err) {
      return res.status(500).json({ ok: false, error: 'Could not store lead.' });
    }

    return res.status(201).json({ ok: true, id: this.lastID });
  });
});

function adminAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const token = bearerToken || req.headers['x-admin-token'] || req.query.token || '';

  if (!token || token !== ADMIN_TOKEN) {
    return res.status(401).json({ ok: false, error: 'Unauthorized' });
  }

  return next();
}

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

app.get('/', (_req, res) => {
  res.sendFile(path.join(__dirname, 'index.html'));
});

app.get('/portal', (_req, res) => {
  res.sendFile(path.join(__dirname, 'portal.html'));
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
