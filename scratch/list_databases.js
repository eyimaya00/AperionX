const mysql = require('mysql2/promise');

async function list() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: ''
        });
        
        const [dbs] = await conn.query('SHOW DATABASES');
        console.log("=== DATABASES ===");
        console.log(dbs.map(d => d.Database));

        for (let db of dbs) {
            const dbName = db.Database;
            if (['information_schema', 'mysql', 'performance_schema', 'sys'].includes(dbName)) continue;
            console.log(`\n=== TABLES IN ${dbName} ===`);
            const [tables] = await conn.query(`SHOW TABLES FROM ${dbName}`);
            console.log(tables.map(t => Object.values(t)[0]));
        }

    } catch (e) {
        console.error(e);
    } finally {
        if (conn) conn.end();
    }
}

list();
