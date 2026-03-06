# MJ NxtGen Lead Backend Setup

This project now includes a backend API that stores contact form submissions in SQLite.

## 1. Install dependencies

```bash
npm install
```

## 2. Set admin token (required for dashboard)

PowerShell:

```powershell
$env:ADMIN_TOKEN="replace-with-strong-secret"
```

## 3. Start server

```bash
npm start
```

The app runs on `http://localhost:3000`.

## 4. Use the website

Open `http://localhost:3000` and submit the form.

## 5. View leads

Open `http://localhost:3000/admin.html`, enter your `ADMIN_TOKEN`, and click **Load Leads**.

## What gets stored

- Name
- Phone
- Email
- Service selected
- Project details
- Client time (ISO)
- Client timezone
- IP address
- User agent
- Server timestamp (`created_at`, UTC)

Database file path: `data/leads.db`
