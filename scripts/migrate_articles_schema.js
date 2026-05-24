const mysql = require('mysql2/promise');
require('dotenv').config();

async function migrate() {
    const config = {
        host: process.env.DB_HOST || 'localhost',
        user: process.env.DB_USER || 'root',
        password: process.env.DB_PASS || '',
        database: process.env.DB_NAME || 'aperionx_db',
        port: process.env.DB_PORT || 3306,
        waitForConnections: true,
        connectionLimit: 10,
        queueLimit: 0
    };

    console.log(`Connecting to ${config.host} as ${config.user}...`);

    console.log('Connecting to database...', config.database);
    let connection;
    try {
        connection = await mysql.createConnection(config);

        const queries = [
            "ALTER TABLE articles ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Genel';",
            "ALTER TABLE articles ADD COLUMN IF NOT EXISTS tags TEXT;",
            "ALTER TABLE articles ADD COLUMN IF NOT EXISTS references_list TEXT;",
            "ALTER TABLE articles ADD COLUMN IF NOT EXISTS pdf_url VARCHAR(255);"
        ];

        for (const query of queries) {
            console.log('Executing:', query);
            await connection.query(query);
        }

        console.log('Migration completed successfully.');

    } catch (error) {
        console.error('Migration failed:', error);
    } finally {
        if (connection) await connection.end();
    }
}

migrate();
