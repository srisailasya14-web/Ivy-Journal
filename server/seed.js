import 'dotenv/config';
import bcrypt from 'bcryptjs';
import { pool } from './db.js';

const run = async () => {
  const password = await bcrypt.hash('IvyJournal2026!', 12);
  const [result] = await pool.query('INSERT INTO users (full_name, username, email, password_hash, goals, interests) VALUES (?, ?, ?, ?, ?, ?)', ['Sahasra Rao', 'sahasra', 'demo@ivyjournal.app', password, JSON.stringify(['Learn design', 'Build a calm routine']), JSON.stringify(['Design', 'Writing', 'Wellness'])]);
  const userId = result.insertId;
  await pool.query('INSERT INTO tasks (user_id, title, description, due_date, priority, category) VALUES (?, ?, ?, CURDATE(), ?, ?), (?, ?, ?, CURDATE(), ?, ?)', [userId, 'Finish portfolio moodboard', 'Choose three references for the homepage refresh.', 'High', 'Creative', userId, 'Read 20 pages', 'A quiet reset before the day gets loud.', 'Medium', 'Wellbeing']);
  await pool.query('INSERT INTO journal_entries (user_id, title, content, mood, tags) VALUES (?, ?, ?, ?, ?)', [userId, 'A softer start', 'I made space for the work that matters instead of rushing into everything at once.', 'Good', JSON.stringify(['reflection', 'focus'])]);
  await pool.query('INSERT INTO moods (user_id, mood, score, note, recorded_on) VALUES (?, ?, ?, ?, CURDATE())', [userId, 'Good', 4, 'A steady, hopeful day.']);
  await pool.query('INSERT INTO streaks (user_id, current_count, longest_count, last_active) VALUES (?, 6, 12, CURDATE())', [userId]);
  await pool.query('INSERT IGNORE INTO badges (slug, title, description, icon) VALUES (\'first-step\', \'First Step\', \'Complete your first task\', \'🌱\'), (\'7-day-streak\', \'7-Day Streak\', \'Maintain a seven-day streak\', \'🔥\'), (\'story-keeper\', \'Story Keeper\', \'Write 10 journal entries\', \'📖\'), (\'consistent\', \'Consistent\', \'Show up for 30 days\', \'✦\')');
  console.log('Seeded demo@ivyjournal.app / IvyJournal2026!');
  await pool.end();
};
run().catch(async (error) => { console.error(error); await pool.end(); process.exit(1); });
