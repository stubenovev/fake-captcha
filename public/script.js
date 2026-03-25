async function submitAnswer() {
  const selectedImage = document.querySelector('input[name="answer"]:checked');
  
  if (!selectedImage) {
    document.getElementById('result').textContent = 'Please select an answer!';
    return;
  }

  const response = await fetch('/check-answer', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `selectedImage=${selectedImage.value}`
  });

  const data = await response.json();
  const resultDiv = document.getElementById('result');
  resultDiv.textContent = data.message;
  resultDiv.className = data.success ? 'success' : 'error';
}
