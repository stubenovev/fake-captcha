const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

let currentProblem = {
  equation: '2x + 10x',
  correctAnswer: '12x',
  correctImage: 'image1'
};

// helper: get client IP accounting for proxies
function getClientIp(req) {
  const xfwd = req.headers['x-forwarded-for'];
  if (xfwd) {
    // x-forwarded-for can be a comma-separated list; take the first
    return xfwd.split(',')[0].trim();
  }
  // req.ip will include scope if behind proxy; fallback to connection remoteAddress
  return req.ip || req.connection?.remoteAddress || '';
}

function logVisit(req) {
  const ip = getClientIp(req);
  const timestamp = new Date().toISOString(); // UTC ISO format
  const line = `${ip},${timestamp}\n`;
  const file = path.join(__dirname, 'visits.csv');

  // ensure file exists with header (only on first write)
  if (!fs.existsSync(file)) {
    try {
      fs.writeFileSync(file, 'ip,timestamp\n', { flag: 'wx' });
    } catch (e) { /* ignore if race created file */ }
  }

  fs.appendFile(file, line, (err) => {
    if (err) console.error('Failed to log visit:', err);
  });
}

app.get('/', (req, res) => {
  logVisit(req);
  res.sendFile(__dirname + '/public/index.html');
});

app.post('/check-answer', (req, res) => {
  const userAnswer = req.body.selectedImage;
  const isCorrect = userAnswer === currentProblem.correctImage;
  
  res.json({
    success: isCorrect,
    message: isCorrect ? '✓ You passed!' : '✗ Wrong! Try again, human.'
  });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Fake CAPTCHA running on port ${PORT}`);
});
