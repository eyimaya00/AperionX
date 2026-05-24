const mysql = require('mysql2/promise');

const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
});

async function checkPendingArticles() {
    try {
        // We know ID 11 is an editor. 
        // The API Logic:
        /*
        app.get('/api/editor/pending-articles', authenticateToken, async (req, res) => {
            if (req.user.role !== 'editor' && req.user.role !== 'admin') return res.sendStatus(403);
            try {
                const [rows] = await pool.query(`
                    SELECT a.*, u.fullname as author_name 
                    FROM articles a 
                    JOIN users u ON a.author_id = u.id 
                    WHERE a.status = 'pending' 
                    ORDER BY a.created_at ASC
                `);
                res.json(rows);
        */

        // Simulating the query directly
        const [rows] = await pool.query(`
            SELECT a.id, a.title, a.status, u.fullname as author_name 
            FROM articles a 
            JOIN users u ON a.author_id = u.id 
            WHERE a.status = 'pending' 
            ORDER BY a.created_at ASC
        `);

        console.log('Pending Articles in DB (Simulating Editor View):');
        console.table(rows);
        process.exit();
    } catch (e) {
        console.error(e);
        process.exit(1);
    }
}

checkPendingArticles();
