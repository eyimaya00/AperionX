const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function searchNeurofeedback() {
    const pool = mysql.createPool(dbConfig);
    try {
        console.log('Searching for Neurofeedback...');
        const [rows] = await pool.query(`
            SELECT a.id, a.title, a.author_id, u.fullname, u.avatar_url 
            FROM articles a 
            LEFT JOIN users u ON a.author_id = u.id 
            WHERE a.title LIKE '%Neurofeedback%'
        `);
        console.log('Result:', rows);
    } catch (e) {
        console.error(e);
    } finally {
        await pool.end();
    }
}

searchNeurofeedback();
