const mysql = require('mysql2/promise');
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

(async () => {
    try {
        const conn = await mysql.createConnection(dbConfig);
        const [rows] = await conn.query("SHOW VARIABLES LIKE 'max_allowed_packet'");
        console.log('Global/Session max_allowed_packet:', rows);

        const [globalRows] = await conn.query("SHOW GLOBAL VARIABLES LIKE 'max_allowed_packet'");
        console.log('Global max_allowed_packet:', globalRows);

        await conn.end();
    } catch (e) {
        console.error(e);
    }
})();
