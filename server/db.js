import 'dotenv/config';
import mysql from 'mysql2/promise';

export const pool = mysql.createPool(process.env.DATABASE_URL || { host: 'localhost', user: 'root', password: '', database: 'ivyjournal', waitForConnections: true, connectionLimit: 10 });
