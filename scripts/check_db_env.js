require('dotenv').config();

console.log('--- Database Login Info ---');
console.log('DB_HOST:', process.env.DB_HOST || 'Not set (defaults to localhost)');
console.log('DB_USER:', process.env.DB_USER || 'Not set (defaults to root)');
console.log('DB_NAME:', process.env.DB_NAME || 'Not set');
console.log('DB_PASS:', process.env.DB_PASS ? '******' : 'Not set');
console.log('---------------------------');
