// Run with: npm run init-db
// Creates the database (if needed) and all tables from schema.sql
const fs = require('fs');
const path = require('path');
const mysql = require('mysql2/promise');
require('dotenv').config();

async function initDb() {
  const connection = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 3306,
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    multipleStatements: true,
  });

  try {
    const schemaPath = path.join(__dirname, 'schema.sql');
    const schema = fs.readFileSync(schemaPath, 'utf8');
    console.log('Running schema.sql ...');
    await connection.query(schema);
    console.log('✅ Database and tables created successfully.');
  } catch (err) {
    console.error('❌ Failed to initialize database:', err.message);
    process.exitCode = 1;
  } finally {
    await connection.end();
  }
}

initDb();
