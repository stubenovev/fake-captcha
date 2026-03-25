// index.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');

const app = express();
app.set('trust proxy', true);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static('public'));

const CSV_PATH = process.env.CSV_PATH || path.join(__dirname, 'visits.csv');
const DOWNLOAD_KEY = process.env.DOWNLOAD_KEY || 'change-me';

// ensure CSV exists with header
if (!fs.existsSync(CSV_PATH)) {
  try {
    fs.writeFileSync(CSV_PATH, 'visited_at,ip,path,user_agent,client_ts\n', { flag: 'wx', encoding: 'utf8' });
  } catch (e) { /* ignore race */ }
}

function esc(s) {
  return `"${String(s || '').replace(/"/g, '""')}"`;
}

// helper: get client IP accounting for proxies
function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  if (xfwd) {
    return xfwd.split(',')[0].trim();
  }
  return req.ip || req.connection?.remoteAddress || '';
}

// append a visit row to CSV (synchronous to avoid concurrency issues on simple deploys)
function appendVisitRow({ visited_at, ip, path: p, user_agent, client_ts }) {
  const row = [visited_at, ip, p, user_agent, client_ts].map(esc).join(',') + '\n';
  try {
    fs.appendFileSync(CSV_PATH, row, 'utf8');
  } catch (err) {
    console.error('Failed to append visit row:', err);
  }
}

// Email setup for Duck.com
const transporter = nodemailer.createTransport({
  host: 'smtp.duck.com',
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

function sendCsvEmail() {
  const csv = fs.readFileSync(CSV_PATH, 'utf8');
  transporter.sendMail({
    from: process.env.EMAIL_USER,
    to: process.env.EMAIL_TO,
    subject: 'Daily Fake CAPTCHA Visits',
    text: 'See attached CSV',
    attachments: [{ filename: 'visits.csv', content: csv }]
  }, (err) => {
    if (err) console.error('Email failed:', err);
    else console.log('Email sent');
  });
}

// Check every minute if it's time to send
setInterval(() => {
  const now = new Date();
  if (now.getHours() === parseInt(process.env.DAILY_EMAIL_HOUR || 9) && now.getMinutes() === 0) {
    sendCsvEmail();
  }
}, 60000);

// API endpoint for client-side logging (used by client fetch/sendBeacon)
app.post('/api/visit', (req, res) => {
  try {
    const ip = getClientIp(req);
    const visited_at = new Date().toISOString();
    const p = req.body.path || req.headers.referer || req.originalUrl || '/fake-captcha';
    const ua = req.get('user-agent') || '';
    const client_ts = req.body.client_ts || '';
    appendVisitRow({ visited_at, ip, path: p, user_agent: ua, client_ts });
    res.status(204).end();
  } catch (err) {
    console.error('Error in /api/visit:', err);
    res.status(500).json({ error: 'logging failed' });
  }
});

// Protected CSV download
app.get('/download-visits', (req, res) => {
  const key = req.query.key || req.headers['x-download-key'];
  if (!key || key !== DOWNLOAD_KEY) return res.status(401).send('Unauthorized');
  res.download(CSV_PATH, 'visits.csv', err => { if (err) console.error('download error', err); });
});

// --- Existing fake-captcha logic (preserved) ---
let currentProblem = {
  equation: '2x + 10x',
  correctAnswer: '12x',
  correctImage: 'image1'
};

function logVisit(req) {
  // keep backward-compatible simple logging (also write same CSV row format)
  const ip = getClientIp(req);
  const visited_at = new Date().toISOString();
  const p = req.originalUrl || '/';
  const ua = req.get('user-agent') || '';
  // client_ts not available here
  appendVisitRow({ visited_at, ip, path: p, user_agent: ua, client_ts: '' });
}

app.get('/', (req, res) => {
  logVisit(req);
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.post('/check-answer', (req, res) => {
  const userAnswer = req.body.selectedImage;
  const isCorrect = userAnswer === currentProblem.correctImage;

  res.json({
    success: isCorrect,
    message: isCorrect ? '✓ You passed!' : '✗ Wrong! Try again, human.'
  });
});

// start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Fake CAPTCHA running on port ${PORT}`);
  console.log(`Email scheduler started. Will send daily at ${process.env.DAILY_EMAIL_HOUR || 9}:00`);
});
