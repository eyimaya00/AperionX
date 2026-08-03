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

        const [tables] = await conn.query('SHOW TABLES');
        console.log("Tables in sitem_db:", tables.map(t => Object.values(t)[0]));

        const [users] = await conn.query("SELECT * FROM kullanicilar WHERE fullname LIKE '%Fırat%' OR fullname LIKE '%Avcı%' OR ad_soyad LIKE '%Fırat%'");
        console.log("Users in sitem_db:", users);

        const [articles] = await conn.query("SELECT * FROM makaleler WHERE baslik LIKE '%Vitro%' OR baslik LIKE '%Hücre%'");
        console.log("Articles in sitem_db:", articles);

    } catch (e) {
        console.error(e);
    } finally {
        if (conn) conn.end();
    }
}

search();
