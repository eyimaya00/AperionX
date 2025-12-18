
const fetch = require('node-fetch'); // or global fetch
const API_URL = 'http://localhost:3000/api';

(async () => {
    try {
        const res = await fetch(`${API_URL}/articles`);
        if (!res.ok) {
            console.log('Status:', res.status);
            console.log(await res.text());
            return;
        }
        const users = await res.json();
        console.log('Count:', users.length);
        if (users.length > 0) {
            console.log('First Article:', JSON.stringify(users[0], null, 2));
        }
    } catch (e) {
        console.error(e);
    }
})();
