const mysql = require('mysql2/promise');

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function resetColors() {
    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        const settingsToReset = [
            'homepage_hero_title_color',
            'articles_hero_title_color',
            'about_hero_title_color'
        ];

        for (const key of settingsToReset) {
            await connection.execute(
                'INSERT INTO site_settings (setting_key, setting_value) VALUES (?, ?) ON DUPLICATE KEY UPDATE setting_value = ?',
                [key, '#ffffff', '#ffffff']
            );
            console.log(`Reset ${key} to #ffffff`);
        }

        console.log('All colors reset successfully.');

    } catch (error) {
        console.error('Error resetting colors:', error);
    } finally {
        if (connection) await connection.end();
    }
}

resetColors();
