const express = require('express');
const app = express();

app.use(express.static('public'));
app.use(express.urlencoded({ extended: true }));

let currentProblem = {
  equation: '2x + 10x',
  correctAnswer: '12x',
  correctImage: 'image1'
};

app.get('/', (req, res) => {
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
