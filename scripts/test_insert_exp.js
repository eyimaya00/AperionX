const mysql = require('mysql2/promise');
require('dotenv').config();

(async () => {
    try {
        const pool = mysql.createPool({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'aperionx'
        });

        // Insert a test experiment
        const [insert] = await pool.query(
            `INSERT INTO experiments (title, slug, category, objective, materials, procedure_steps, results, conclusion, author_id, status) 
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
            ['Test Exper', 'test-exper-123', 'Biyoloji', 'Objective TEST', 'Materials TEST', '<p>Procedure TEST</p>', '<p>Results TEST</p>', 'Conclusion TEST', 1, 'draft']
        );
        console.log('Inserted ID:', insert.insertId);
        
        const [rows] = await pool.query('SELECT * FROM experiments WHERE id = ?', [insert.insertId]);
        console.log('Read back objective:', rows[0].objective);
        console.log('Read back procedure:', rows[0].procedure_steps);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
})();
