import 'dotenv/config';
import mysql from 'mysql2/promise';

const databaseUrl = process.env.DATABASE_URL;
let pool;

if (databaseUrl) {
  const url = new URL(databaseUrl);
  url.searchParams.delete('ssl-mode');

  pool = mysql.createPool({
    uri: url.toString(),
    ssl: { rejectUnauthorized: false },
  });
} else {
  pool = mysql.createPool({ host: 'localhost', user: 'root', password: '', database: 'ivyjournal', waitForConnections: true, connectionLimit: 10 });
}

export { pool };
