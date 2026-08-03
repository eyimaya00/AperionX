const mysql = require('mysql2/promise');
(async () => {
    const pool = mysql.createPool({host: '127.0.0.1', user: 'root', password: 's6fIwymToqEnBLcl', database: 'aperionx'});
    try {
        const [rows] = await pool.query("SELECT * FROM site_settings WHERE setting_key LIKE 'social_%'");
        console.log("DB Social Settings:", rows);
    } catch(e){ console.error(e); }
    await pool.end();
})();
