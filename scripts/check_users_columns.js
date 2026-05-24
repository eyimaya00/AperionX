const mysql = require('mysql2');
require('dotenv').config();

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to database.');

    const query = `SHOW COLUMNS FROM users`;
    db.query(query, (err, results) => {
        if (err) {
            console.error('Error fetching columns:', err);
        } else {
            console.log('Users Table Columns:', results.map(col => col.Field));
        }
        db.end();
    });
});
