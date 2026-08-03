const mysql = require('mysql2/promise');

async function search() {
    let conn;
    try {
        conn = await mysql.createConnection({
            host: '127.0.0.1',
            user: 'root',
            password: '',
            database: 'sitem_db'
        });

        const [cols] = await conn.query('DESCRIBE kullanicilar');
        console.log("kullanicilar columns:", cols.map(c => c.Field));

        const [users] = await conn.query("SELECT * FROM kullanicilar");
        console.log("kullanicilar rows:", users);

    } catch (e) {
        console.error(e);
    } finally {
        if (conn) conn.end();
    }
}

search();
