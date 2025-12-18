const mysql = require('mysql2/promise');
const dotenv = require('dotenv');

dotenv.config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function migrate() {
    try {
        const connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Add avatar_url
        try {
            await connection.query("ALTER TABLE users ADD COLUMN avatar_url VARCHAR(255) DEFAULT NULL");
            console.log('Added avatar_url column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('avatar_url already exists.');
            else console.error(e.message);
        }

        // Add bio
        try {
            await connection.query("ALTER TABLE users ADD COLUMN bio TEXT DEFAULT NULL");
            console.log('Added bio column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('bio already exists.');
            else console.error(e.message);
        }

        // Add job_title
        try {
            await connection.query("ALTER TABLE users ADD COLUMN job_title VARCHAR(100) DEFAULT NULL");
            console.log('Added job_title column.');
        } catch (e) {
            if (e.code === 'ER_DUP_FIELDNAME') console.log('job_title already exists.');
            else console.error(e.message);
        }

        await connection.end();
        process.exit(0);
    } catch (error) {
        console.error('Migration Error:', error.message);
        process.exit(1);
    }
}

migrate();
