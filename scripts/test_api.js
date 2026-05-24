
const API_URL = 'http://localhost:3000/api';

(async () => {
    try {
        console.log('Fetching articles...');
        const res = await fetch(`${API_URL}/articles`);
        if (!res.ok) {
            console.error('Error Status:', res.status);
            const text = await res.text();
            console.error('Error Body:', text.slice(0, 500)); // Show start of error
        } else {
            const json = await res.json();
            console.log('Success! Items:', json.length);
            const size = JSON.stringify(json).length;
            console.log('JSON size (chars):', size);
        }
    } catch (e) {
        console.error('Fetch Failed:', e);
    }
})();
