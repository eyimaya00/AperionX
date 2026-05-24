require('dotenv').config();
const mysql = require('mysql2/promise');
const bcrypt = require('bcryptjs');

const dbConfig = {
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '', // Default empty for root
    database: process.env.DB_NAME || 'aperionx_db',
    port: process.env.DB_PORT || 3306
};

// Override specifically for the user's environment if needed, mostly defaults work
// Note: Users on server might have different env, so dotenv should handle it.

async function resetPassword() {
    const targetEmail = 'yasin@aperionx.com';
    const newPasswordRaw = '123456'; // Temporary password

    console.log(`--- Password Reset Tool ---`);
    console.log(`Target User: ${targetEmail}`);
    console.log(`New Password: ${newPasswordRaw}`);

    let connection;
    try {
        connection = await mysql.createConnection(dbConfig);
        console.log('Connected to database.');

        // Check if user exists
        const [users] = await connection.execute('SELECT * FROM users WHERE email = ?', [targetEmail]);

        if (users.length === 0) {
            console.error('❌ User not found!');
            process.exit(1);
        }

        const user = users[0];
        console.log(`User found: ${user.username} (ID: ${user.id})`);

        // Hash new password
        const hashedPassword = await bcrypt.hash(newPasswordRaw, 10);

        // Update password
        await connection.execute('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, user.id]);

        console.log('✅ Password successfully updated!');
        console.log(`You can now login with: ${newPasswordRaw}`);

    } catch (error) {
        console.error('❌ Error:', error.message);
    } finally {
        if (connection) await connection.end();
        process.exit();
    }
}

resetPassword();
