const mysql = require('mysql2/promise');
const dotenv = require('dotenv');
dotenv.config(); // Ensure we load env vars if present

const dbConfig = {
    host: process.env.DB_HOST || '127.0.0.1',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || '',
    database: process.env.DB_NAME || 'aperionx_db'
};

function slugify(text) {
    const trMap = {
        'ç': 'c', 'Ç': 'c',
        'ğ': 'g', 'Ğ': 'g',
        'ş': 's', 'Ş': 's',
        'ü': 'u', 'Ü': 'u',
        'ı': 'i', 'İ': 'i',
        'ö': 'o', 'Ö': 'o'
    };
    return text
        .split('')
        .map(c => trMap[c] || c)
        .join('')
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '') // Remove non-alphanumeric chars
        .trim()
        .replace(/\s+/g, '-') // Replace spaces with dashes
        .replace(/-+/g, '-'); // Remove duplicate dashes
}

async function migrate() {
    console.log('Starting Slug Migration...');
    const pool = mysql.createPool(dbConfig);

    try {
        // 1. Check if slug column exists
        try {
            await pool.query("SELECT slug FROM articles LIMIT 1");
            console.log("Column 'slug' already exists.");
        } catch (err) {
            if (err.code === 'ER_BAD_FIELD_ERROR') {
                console.log("Adding 'slug' column...");
                await pool.query("ALTER TABLE articles ADD COLUMN slug VARCHAR(255) UNIQUE DEFAULT NULL");
                // Add index for performance
                try { await pool.query("CREATE INDEX idx_slug ON articles(slug)"); } catch (e) { }
            } else {
                throw err;
            }
        }

        // 2. Fetch all articles with empty slugs
        const [articles] = await pool.query("SELECT id, title, slug FROM articles");

        let updateCount = 0;
        for (const article of articles) {
            if (!article.slug) {
                let baseSlug = slugify(article.title);
                // Ensure uniqueness (simple append id logic if conflict, though we iterate one by one)
                let finalSlug = baseSlug;

                // Check if this slug exists (to be safe against duplicates from same titles)
                const [existing] = await pool.query("SELECT id FROM articles WHERE slug = ? AND id != ?", [finalSlug, article.id]);
                if (existing.length > 0) {
                    finalSlug = `${baseSlug}-${article.id}`;
                }

                console.log(`Updating ID ${article.id}: ${article.title} -> ${finalSlug}`);
                await pool.query("UPDATE articles SET slug = ? WHERE id = ?", [finalSlug, article.id]);
                updateCount++;
            }
        }

        console.log(`Migration Complete. Updated ${updateCount} articles.`);

    } catch (e) {
        console.error('Migration Failed:', e);
    } finally {
        await pool.end();
    }
}

migrate();
