fetch('https://api.cobalt.tools/api/json', {
  method: 'POST',
  headers: {
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    url: 'https://www.instagram.com/reel/C7_3z9fI8vE/',
    videoQuality: '1080'
  })
}).then(res => res.json()).then(console.log).catch(console.error);
