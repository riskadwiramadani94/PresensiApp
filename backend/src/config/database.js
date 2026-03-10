const mysql = require('mysql2/promise');
require('dotenv').config();

const dbConfig = {
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'hadirin_db',
  charset: 'utf8mb4',
  connectionLimit: 10,
  queueLimit: 0,
  idleTimeout: 60000,
  acquireTimeout: 60000,
  timezone: '+07:00'
};

let pool;

const connectDB = async () => {
  try {
    console.log('🔄 Creating database connection pool...');
    console.log('📍 Host:', dbConfig.host);
    console.log('👤 User:', dbConfig.user);
    console.log('🗄️  Database:', dbConfig.database);
    
    pool = mysql.createPool(dbConfig);
    
    // Test connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();
    
    console.log('✅ Database pool created successfully for hadirin_db');
    return pool;
  } catch (error) {
    console.error('❌ Database connection failed:');
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'ECONNREFUSED') {
      console.error('\n🚨 SOLUTION: Make sure XAMPP MySQL is running!');
      console.error('1. Open XAMPP Control Panel');
      console.error('2. Start MySQL service');
      console.error('3. Make sure database "hadirin_db" exists\n');
    }
    
    throw error;
  }
};

const getConnection = async () => {
  if (!pool) {
    await connectDB();
  }
  return pool;
};

module.exports = { connectDB, getConnection };