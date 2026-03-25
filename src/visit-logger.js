// src/visit-logger.js
const fs = require('fs');
const path = require('path');

const CSV_PATH = process.env.CSV_PATH || path.join(process.cwd(), 'visits.csv');
if (!fs.existsSync(CSV_PATH)) fs.writeFileSync(CSV_PATH, 'visited_at,ip,path,user_agent\n', 'utf8');

const esc = s => `"${String(s || '').replace(/"/g, '""')}"`;

function appendVisit({ visited_at, ip, path: p, user_agent }) {
  const row = [visited_at, ip, p, user_agent].map(esc).join(',') + '\n';
  fs.appendFileSync(CSV_PATH, row);
}

module.exports = { appendVisit, CSV_PATH };
