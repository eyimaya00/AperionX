const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

async function checkSchema() {
    console.log('--- DIAGNOSTIC START ---');
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('DB Connected.');

        console.log('\n[CHECK 1] USERS Table Schema:');
        const [rows] = await connection.query("DESCRIBE users");
        console.table(rows);

        console.log('\n[CHECK 2] Role Column Check:');
        const roleCol = rows.find(r => r.Field === 'role');
        if (roleCol) {
            console.log(`Role Type: ${roleCol.Type}`);
            if (roleCol.Type.includes('varchar') && parseInt(roleCol.Type.match(/\d+/)[0]) >= 50) {
                console.log('✅ Role column looks CORRECT (VARCHAR >= 50).');
            } else {
                console.log('❌ Role column looks WRONG (Too small or ENUM).');
            }
        } else {
            console.log('❌ Role column MISSING!');
        }

        console.log('\n[CHECK 3] Reset Token Check:');
        const tokenCol = rows.find(r => r.Field === 'reset_token');
        if (tokenCol) console.log('✅ reset_token exists.');
        else console.log('❌ reset_token MISSING.');

        console.log('--- DIAGNOSTIC END ---');

    } catch (e) {
        console.error('DIAGNOSTIC FAILED:', e);
    } finally {
        if (connection) await connection.end();
    }
}

checkSchema();
