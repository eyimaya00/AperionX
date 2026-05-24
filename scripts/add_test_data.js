const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'aperionx_db'
};

async function addData() {
    const conn = await mysql.createConnection(dbConfig);
    try {
        // 1. Insert Article 2
        const [res2] = await conn.query(
            'INSERT INTO articles (title, excerpt, content, image_url) VALUES (?, ?, ?, ?)',
            [
                'Yapay Zeka ve Gelecek',
                'YZ teknolojileri hızla gelişirken, günlük hayatımızı nasıl değiştirecek?',
                'Uzun içerik...',
                'https://images.unsplash.com/photo-1677442136019-21780ecad995?q=80&w=2070&auto=format&fit=crop'
            ]
        );
        const id2 = res2.insertId;

        // 2. Insert Article 3
        const [res3] = await conn.query(
            'INSERT INTO articles (title, excerpt, content, image_url) VALUES (?, ?, ?, ?)',
            [
                'Mars Kolonisi: İlk Adımlar',
                'Kızıl gezegene yolculuk planları hızlanıyor. İşte son gelişmeler.',
                'Uzun içerik...',
                'https://images.unsplash.com/photo-1614728853913-6591d613e113?q=80&w=2070&auto=format&fit=crop'
            ]
        );
        const id3 = res3.insertId;

        // 3. Assign to Showcase Slots 2 and 3
        // Upsert slot 2
        await conn.query(
            'INSERT INTO showcase_items (article_id, position_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE article_id = ?',
            [id2, 2, id2]
        );

        // Upsert slot 3
        await conn.query(
            'INSERT INTO showcase_items (article_id, position_id) VALUES (?, ?) ON DUPLICATE KEY UPDATE article_id = ?',
            [id3, 3, id3]
        );

        console.log('Test articles added and showcased (Slots 2 & 3).');

    } catch (e) {
        console.error(e);
    } finally {
        conn.end();
    }
}

addData();
