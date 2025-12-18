const mysql = require('mysql2/promise');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function checkIndexes() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        const [rows] = await connection.query("SHOW INDEX FROM site_settings");
        console.log('Indexes:', rows);

        const [create] = await connection.query("SHOW CREATE TABLE site_settings");
        console.log('Create Statement:', create[0]['Create Table']);

        await connection.end();
    } catch (e) {
        console.error(e);
    }
}
checkIndexes();
