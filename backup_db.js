/**
 * AperionX Veritabanı Yedekleme Scripti
 * Kullanım: node backup_db.js
 * Çıktı: backup_TARIH.sql dosyası oluşturur
 */
const mysql = require('mysql2/promise');
const fs = require('fs');
const path = require('path');
require('dotenv').config();

(async () => {
    const dbName = process.env.DB_NAME || 'aperionx';
    const timestamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const outputFile = path.join(__dirname, `backup_${timestamp}.sql`);

    console.log('=== AperionX Veritabanı Yedekleme ===');
    console.log(`Veritabanı: ${dbName}`);
    console.log(`Çıktı dosyası: ${outputFile}`);
    console.log('');

    const pool = mysql.createPool({
        host: process.env.DB_HOST || '127.0.0.1',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: dbName
    });

    let sql = '';

    try {
        // Header
        sql += `-- AperionX Veritabanı Yedeği\n`;
        sql += `-- Tarih: ${new Date().toISOString()}\n`;
        sql += `-- Veritabanı: ${dbName}\n\n`;
        sql += `SET FOREIGN_KEY_CHECKS=0;\n`;
        sql += `SET SQL_MODE="NO_AUTO_VALUE_ON_ZERO";\n\n`;

        // Tabloları al
        const [tables] = await pool.query('SHOW TABLES');
        const tableKey = `Tables_in_${dbName}`;

        console.log(`${tables.length} tablo bulundu.\n`);

        for (const tableRow of tables) {
            const tableName = tableRow[tableKey];
            console.log(`Yedekleniyor: ${tableName}...`);

            // CREATE TABLE ifadesi
            const [createResult] = await pool.query(`SHOW CREATE TABLE \`${tableName}\``);
            const createSQL = createResult[0]['Create Table'];
            sql += `-- ----------------------------\n`;
            sql += `-- Tablo: ${tableName}\n`;
            sql += `-- ----------------------------\n`;
            sql += `DROP TABLE IF EXISTS \`${tableName}\`;\n`;
            sql += `${createSQL};\n\n`;

            // Verileri al
            const [rows] = await pool.query(`SELECT * FROM \`${tableName}\``);

            if (rows.length > 0) {
                const columns = Object.keys(rows[0]);
                const colList = columns.map(c => `\`${c}\``).join(', ');

                // Her 100 satırda bir INSERT yaz (performans için)
                for (let i = 0; i < rows.length; i += 100) {
                    const batch = rows.slice(i, i + 100);
                    const values = batch.map(row => {
                        const vals = columns.map(col => {
                            const val = row[col];
                            if (val === null) return 'NULL';
                            if (val instanceof Date) return `'${val.toISOString().slice(0, 19).replace('T', ' ')}'`;
                            if (typeof val === 'number') return val;
                            // Escape string
                            const escaped = String(val)
                                .replace(/\\/g, '\\\\')
                                .replace(/'/g, "\\'")
                                .replace(/\n/g, '\\n')
                                .replace(/\r/g, '\\r')
                                .replace(/\t/g, '\\t');
                            return `'${escaped}'`;
                        });
                        return `(${vals.join(', ')})`;
                    }).join(',\n');

                    sql += `INSERT INTO \`${tableName}\` (${colList}) VALUES\n${values};\n\n`;
                }

                console.log(`  ✅ ${rows.length} satır yedeklendi`);
            } else {
                console.log(`  ⚪ Boş tablo`);
            }
        }

        sql += `SET FOREIGN_KEY_CHECKS=1;\n`;

        // Dosyaya yaz
        fs.writeFileSync(outputFile, sql, 'utf8');

        const sizeKB = (fs.statSync(outputFile).size / 1024).toFixed(1);
        console.log(`\n=== YEDEKLEME TAMAMLANDI ===`);
        console.log(`Dosya: ${outputFile}`);
        console.log(`Boyut: ${sizeKB} KB`);

    } catch (e) {
        console.error('HATA:', e.message);
    } finally {
        await pool.end();
    }
})();
