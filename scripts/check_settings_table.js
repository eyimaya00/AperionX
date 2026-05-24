const mysql = require('mysql2/promise');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function checkTable() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SHOW TABLES LIKE 'site_settings'");
        if (rows.length > 0) {
            console.log('Table site_settings exists.');
            // Check columns
            const [cols] = await connection.query("DESCRIBE site_settings");
            console.log('Columns:', cols.map(c => c.Field));
        } else {
            console.log('Table site_settings DOES NOT EXIST.');
        }
        await connection.end();
    } catch (e) {
        console.error(e);
    }
}
checkTable();
