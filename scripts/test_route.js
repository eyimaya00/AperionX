const express = require('express');
const app = express();
app.get('/api/auth/google/callback', (req, res) => {
    res.send('HIT');
});
app.use((req, res) => {
    res.status(404).json({ message: `Endpoint bulunamadı: ${req.method} ${req.originalUrl}` });
});
const request = require('supertest');
request(app)
    .get('/api/auth/google/callback?iss=https%3A%2F%2Faccounts.google.com&code=4%2F0AeoWuM8OTQJ5dfIJwn4xXdT7njw8TrDeegZHhw1XW0rjScSSSG8LiDYGZYFH5808Rw1fZg&scope=email+profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.profile+https%3A%2F%2Fwww.googleapis.com%2Fauth%2Fuserinfo.email+openid&authuser=6&prompt=consent')
    .expect(200)
    .end((err, res) => {
        if (err) console.error(err);
        console.log(res.text || res.body);
    });
