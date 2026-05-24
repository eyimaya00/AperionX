const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function restoreMenu() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to DB.');

        // Check Existing
        const [rows] = await connection.query('SELECT * FROM menu_items');
        console.log('Current Menu:', rows.map(r => r.label));

        const required = [
            { label: 'Kategoriler', url: '#', order: 3 },
            { label: 'Hakkında', url: '#', order: 4 }
        ];

        for (const item of required) {
            const exists = rows.find(r => r.label === item.label);
            if (!exists) {
                console.log(`Restoring ${item.label}...`);
                await connection.query('INSERT INTO menu_items (label, url, order_index) VALUES (?, ?, ?)', [item.label, item.url, item.order]);
            } else {
                console.log(`${item.label} already exists.`);
            }
        }
        console.log('Menu restoration complete.');

    } catch (e) {
        console.error('Error:', e);
    } finally {
        if (connection) connection.end();
    }
}

restoreMenu();
