const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function checkDB() {
    try {
        const connection = await mysql.createConnection(dbConfig);

        // Check tables
        const [tables] = await connection.query('SHOW TABLES');
        const tableNames = tables.map(t => Object.values(t)[0]);
        console.log('Tables:', tableNames);

        if (tableNames.includes('categories')) {
            console.log('Categories table exists.');
            const [rows] = await connection.query('SELECT * FROM categories');
            console.log('Categories count:', rows.length);
            console.log('Categories:', rows);
        } else {
            console.log('Categories table MISSING.');
        }

        // Check articles columns
        const [columns] = await connection.query('SHOW COLUMNS FROM articles');
        const columnNames = columns.map(c => c.Field);
        console.log('Article Columns:', columnNames);

        if (columnNames.includes('category')) {
            const [cats] = await connection.query('SELECT DISTINCT category FROM articles');
            console.log('Distinct Categories in Articles:', cats.map(c => c.category));
        }

        await connection.end();
    } catch (e) {
        console.error(e);
    }
}

checkDB();
