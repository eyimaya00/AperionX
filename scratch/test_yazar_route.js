const express = require('express');
const path = require('path');

console.log('Testing route logic...');
const app = express();

app.get(['/yazar/:identifier', '/en/yazar/:identifier'], (req, res) => {
    res.send('Served author-profile.html for ' + req.params.identifier);
});

app.get(['/author-profile', '/author-profile.html'], (req, res) => {
    const u = req.query.u;
    if (u) {
        return res.redirect(301, `/yazar/${u}`);
    }
    res.send('Served raw author-profile.html');
});

const server = app.listen(9876, async () => {
    const fetch = (await import('node-fetch')).default;
    
    // Test clean route
    const res1 = await fetch('http://localhost:9876/yazar/test-user');
    const text1 = await res1.text();
    console.log('Test 1 (/yazar/test-user):', text1);

    // Test 301 redirect with .html
    const res2 = await fetch('http://localhost:9876/author-profile.html?u=test-user', { redirect: 'manual' });
    console.log('Test 2 301 Redirect status (.html):', res2.status, 'Location header:', res2.headers.get('location'));

    // Test 301 redirect without .html
    const res3 = await fetch('http://localhost:9876/author-profile?u=386', { redirect: 'manual' });
    console.log('Test 3 301 Redirect status (no extension):', res3.status, 'Location header:', res3.headers.get('location'));

    server.close();
    process.exit(0);
});
