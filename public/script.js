async function generateText() {
    const prompt = document.getElementById('prompt').value;

    const response = await fetch('/generate-text', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({ prompt: prompt }),
    });

    const data = await response.json();
    document.getElementById('result').innerText = data.text;
}

