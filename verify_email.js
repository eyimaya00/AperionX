const mysql = require('mysql2/promise');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function verifyEmail() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SELECT * FROM site_settings WHERE setting_key = 'contact_email'");
        console.log(JSON.stringify(rows, null, 2));
        await connection.end();
    } catch (e) {
        console.error(e);
    }
}
verifyEmail();
