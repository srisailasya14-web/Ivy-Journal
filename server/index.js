import "dotenv/config";
import express from "express";
import cors from "cors";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import multer from "multer";
import { pool } from "./db.js";
import {
  answerChat,
  generateJournalReflection,
  generateRoadmap,
  generateSuggestions,
  generateVisionIdeas,
} from "./ai.js";

const app = express();
const port = process.env.PORT || 4000;
const uploadDir = path.resolve(process.env.UPLOAD_DIR || "uploads");
fs.mkdirSync(uploadDir, { recursive: true });
const imageUpload = multer({
  storage: multer.diskStorage({
    destination: uploadDir,
    filename: (_, file, callback) =>
      callback(
        null,
        `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`,
      ),
  }),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_, file, callback) =>
    callback(
      null,
      ["image/jpeg", "image/png", "image/webp"].includes(file.mimetype),
    ),
});
pool.query(`CREATE TABLE IF NOT EXISTS goal_tasks (id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY, goal_id BIGINT UNSIGNED NOT NULL, user_id BIGINT UNSIGNED NOT NULL, title VARCHAR(180) NOT NULL, completed BOOLEAN DEFAULT FALSE, completed_at DATETIME NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE, FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE, INDEX idx_goal_tasks_goal (goal_id, completed))`).catch(() => {});
app.use(cors());
app.use(express.json({ limit: "2mb" }));
app.use("/uploads", express.static(uploadDir, { index: false }));
const tokenFor = (user) =>
  jwt.sign({ id: user.id }, process.env.JWT_SECRET || "dev-only-secret", {
    expiresIn: "7d",
  });
const auth = async (req, res, next) => {
  try {
    const token = req.headers.authorization?.replace("Bearer ", "");
    const payload = jwt.verify(
      token,
      process.env.JWT_SECRET || "dev-only-secret",
    );
    const [rows] = await pool.query(
      "SELECT id, full_name, username, email, avatar_url, bio, goals, interests, productivity_style FROM users WHERE id = ?",
      [payload.id],
    );
    if (!rows[0]) return res.status(401).json({ error: "Account not found" });
    req.user = rows[0];
    next();
  } catch {
    res.status(401).json({ error: "Please sign in again" });
  }
};
const toLocalDateKey = (value) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};
const today = () => toLocalDateKey(new Date());
const dateKey = (value) => toLocalDateKey(value);
let collaborationTasksTableReady;
const ensureCollaborationTasksTable = async () => {
  if (!collaborationTasksTableReady) {
    collaborationTasksTableReady = pool
      .query(`CREATE TABLE IF NOT EXISTS collaboration_tasks (
        id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
        collaboration_id BIGINT UNSIGNED NOT NULL,
        created_by BIGINT UNSIGNED NOT NULL,
        completed_by BIGINT UNSIGNED NULL,
        title VARCHAR(180) NOT NULL,
        due_date DATE NULL,
        completed BOOLEAN DEFAULT FALSE,
        completed_at DATETIME NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY(collaboration_id) REFERENCES collaborations(id) ON DELETE CASCADE,
        FOREIGN KEY(created_by) REFERENCES users(id) ON DELETE CASCADE,
        FOREIGN KEY(completed_by) REFERENCES users(id) ON DELETE SET NULL,
        INDEX idx_collaboration_tasks_status (collaboration_id, completed, due_date)
      )`)
      .catch((error) => {
        collaborationTasksTableReady = null;
        throw error;
      });
  }
  await collaborationTasksTableReady;
};
const isActiveCollaborationMember = async (collaborationId, userId) => {
  const [members] = await pool.query(
    "SELECT 1 FROM collaboration_members WHERE collaboration_id = ? AND user_id = ? AND status = 'active'",
    [collaborationId, userId],
  );
  return members.length > 0;
};
const log = async (userId, type, description) =>
  pool.query(
    "INSERT INTO activity_history (user_id, type, description) VALUES (?, ?, ?)",
    [userId, type, description],
  );
const award = async (userId, slug) => {
  const [badges] = await pool.query(
    "SELECT id, title FROM badges WHERE slug = ?",
    [slug],
  );
  if (!badges[0]) return false;
  const [result] = await pool.query(
    "INSERT IGNORE INTO user_badges (user_id, badge_id) VALUES (?, ?)",
    [userId, badges[0].id],
  );
  if (result.affectedRows)
    await pool.query(
      "INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)",
      [
        userId,
        `Badge unlocked: ${badges[0].title}`,
        "A small win worth celebrating.",
      ],
    );
  return Boolean(result.affectedRows);
};
const refreshStreak = async (userId) => {
  const [activityRows] = await pool.query(
    `SELECT DISTINCT day_key FROM (
      SELECT DATE(recorded_on) AS day_key FROM moods WHERE user_id = ?
      UNION ALL
      SELECT DATE(created_at) AS day_key FROM journal_entries WHERE user_id = ?
      UNION ALL
      SELECT DATE(completed_at) AS day_key FROM tasks WHERE user_id = ? AND completed = 1 AND completed_at IS NOT NULL
    ) as activity`,
    [userId, userId, userId],
  );
  const uniqueDays = [...new Set(activityRows.map((row) => row.day_key))].sort((a, b) => new Date(b) - new Date(a));
  const [[existing]] = await pool.query(
    "SELECT current_count, longest_count, last_active FROM streaks WHERE user_id = ?",
    [userId],
  );
  if (!uniqueDays.length) {
    await pool.query(
      "INSERT INTO streaks (user_id, current_count, longest_count, last_active) VALUES (?, 0, ?, NULL) ON DUPLICATE KEY UPDATE current_count = 0, longest_count = GREATEST(COALESCE(longest_count, 0), 0), last_active = NULL",
      [userId, existing?.longest_count ?? 0],
    );
    return;
  }
  const latest = uniqueDays[0];
  const todayKeyValue = today();
  let current = 0;
  let cursor = new Date(latest);
  const daySet = new Set(uniqueDays);
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    current += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  const effectiveCurrent = latest === todayKeyValue ? current : 0;
  const nextLongest = Math.max(existing?.longest_count ?? 0, effectiveCurrent);
  await pool.query(
    "INSERT INTO streaks (user_id, current_count, longest_count, last_active) VALUES (?, ?, ?, ?) ON DUPLICATE KEY UPDATE current_count = VALUES(current_count), longest_count = VALUES(longest_count), last_active = VALUES(last_active)",
    [userId, effectiveCurrent, nextLongest, latest],
  );
  if (effectiveCurrent >= 7) await award(userId, "7-day-streak");
  if (effectiveCurrent >= 3) await award(userId, "first-step");
};

app.get("/api/health", async (_, res) => {
  try {
    await pool.query("SELECT 1");
    res.json({ ok: true, database: "connected" });
  } catch {
    res
      .status(503)
      .json({
        ok: false,
        database: "unavailable",
        message: "Configure MySQL and run server/schema.sql.",
      });
  }
});
app.post("/api/auth/signup", async (req, res) => {
  try {
    const { fullName, username, email, password } = req.body;
    if (!fullName || !username || !email || !password || password.length < 8)
      return res
        .status(400)
        .json({
          error:
            "Name, username, email and an 8+ character password are required.",
        });
    const hash = await bcrypt.hash(password, 12);
    const [result] = await pool.query(
      "INSERT INTO users (full_name, username, email, password_hash) VALUES (?, ?, ?, ?)",
      [fullName.trim(), username.trim(), email.toLowerCase().trim(), hash],
    );
    const user = { id: result.insertId, full_name: fullName, username, email };
    await pool.query("INSERT INTO streaks (user_id) VALUES (?)", [user.id]);
    res.status(201).json({ token: tokenFor(user), user });
  } catch (error) {
    const databaseError = [
      "ECONNREFUSED",
      "ER_BAD_DB_ERROR",
      "ER_NO_SUCH_TABLE",
      "PROTOCOL_CONNECTION_LOST",
    ].includes(error.code);
    res
      .status(error.code === "ER_DUP_ENTRY" ? 409 : 500)
      .json({
        error:
          error.code === "ER_DUP_ENTRY"
            ? "Username or email already exists."
            : databaseError
              ? "MySQL is not ready. Create the ivyjournal database, run server/schema.sql, and check DATABASE_URL in .env."
              : "Unable to create account.",
      });
  }
});
app.post("/api/auth/login", async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM users WHERE email = ? OR username = ?",
      [req.body.email?.toLowerCase(), req.body.email],
    );
    const user = rows[0];
    if (
      !user ||
      !(await bcrypt.compare(req.body.password || "", user.password_hash))
    )
      return res.status(401).json({ error: "Invalid email or password." });
    delete user.password_hash;
    res.json({ token: tokenFor(user), user });
  } catch (error) {
    const databaseError = [
      "ECONNREFUSED",
      "ER_BAD_DB_ERROR",
      "ER_NO_SUCH_TABLE",
      "PROTOCOL_CONNECTION_LOST",
    ].includes(error.code);
    res
      .status(500)
      .json({
        error: databaseError
          ? "MySQL is not ready. Create the ivyjournal database, run server/schema.sql, and check DATABASE_URL in .env."
          : "Unable to sign in.",
      });
  }
});
app.post("/api/auth/forgot-password", async (req, res) => {
  const email = req.body.email?.toLowerCase().trim();
  const [rows] = await pool.query("SELECT id FROM users WHERE email = ?", [
    email,
  ]);
  const response = {
    message:
      "If that email belongs to an IvyJournal account, reset instructions are ready.",
  };
  if (!rows[0]) return res.json(response);
  const rawToken = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  await pool.query(
    "UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = ? AND used_at IS NULL",
    [rows[0].id],
  );
  await pool.query(
    "INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 30 MINUTE))",
    [rows[0].id, tokenHash],
  );
  if (process.env.NODE_ENV !== "production") response.resetToken = rawToken;
  res.json(response);
});
app.post("/api/auth/reset-password", async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password || password.length < 8)
    return res
      .status(400)
      .json({
        error: "A valid token and an 8+ character password are required.",
      });
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const [rows] = await pool.query(
    "SELECT user_id FROM password_reset_tokens WHERE token_hash = ? AND used_at IS NULL AND expires_at > NOW()",
    [tokenHash],
  );
  if (!rows[0])
    return res
      .status(400)
      .json({ error: "That reset link is invalid or expired." });
  const hash = await bcrypt.hash(password, 12);
  await pool.query("UPDATE users SET password_hash = ? WHERE id = ?", [
    hash,
    rows[0].user_id,
  ]);
  await pool.query(
    "UPDATE password_reset_tokens SET used_at = NOW() WHERE token_hash = ?",
    [tokenHash],
  );
  res.json({ message: "Password updated. You can sign in now." });
});
app.get("/api/me", auth, (req, res) => res.json({ user: req.user }));
app.patch("/api/me", auth, async (req, res) => {
  const { fullName, username, bio, goals, interests, productivityStyle } =
    req.body;
  try {
    await pool.query(
      "UPDATE users SET full_name = COALESCE(?, full_name), username = COALESCE(?, username), bio = COALESCE(?, bio), goals = COALESCE(?, goals), interests = COALESCE(?, interests), productivity_style = COALESCE(?, productivity_style) WHERE id = ?",
      [
        fullName?.trim() || null,
        username?.trim() || null,
        bio ?? null,
        goals ? JSON.stringify(goals) : null,
        interests ? JSON.stringify(interests) : null,
        productivityStyle ?? null,
        req.user.id,
      ],
    );
    const [rows] = await pool.query(
      "SELECT id, full_name, username, email, avatar_url, bio, goals, interests, productivity_style FROM users WHERE id = ?",
      [req.user.id],
    );
    res.json({ user: rows[0] });
  } catch (error) {
    res
      .status(error.code === "ER_DUP_ENTRY" ? 409 : 500)
      .json({
        error:
          error.code === "ER_DUP_ENTRY"
            ? "That username is already taken."
            : "Unable to update profile.",
      });
  }
});
app.post(
  "/api/me/avatar",
  auth,
  imageUpload.single("image"),
  async (req, res) => {
    if (!req.file)
      return res
        .status(400)
        .json({ error: "Upload a JPG, PNG, or WebP image under 5 MB." });
    const avatarUrl = `/uploads/${req.file.filename}`;
    await pool.query("UPDATE users SET avatar_url = ? WHERE id = ?", [
      avatarUrl,
      req.user.id,
    ]);
    res.json({ avatarUrl });
  },
);
app.get("/api/dashboard", auth, async (req, res) => {
  const id = req.user.id;
  const [[taskStats]] = await pool.query(
    "SELECT COUNT(*) total, SUM(completed = 1) completed FROM tasks WHERE user_id = ?",
    [id],
  );
  const [[streak]] = await pool.query(
    "SELECT current_count, longest_count FROM streaks WHERE user_id = ?",
    [id],
  );
  const [tasks] = await pool.query(
    "SELECT * FROM tasks WHERE user_id = ? ORDER BY completed, due_date IS NULL, due_date DESC, created_at DESC",
    [id],
  );
  const [moods] = await pool.query(
    "SELECT mood, score, recorded_on FROM moods WHERE user_id = ? ORDER BY recorded_on DESC LIMIT 7",
    [id],
  );
  const [dailyProgress] = await pool.query(
    "SELECT DATE_FORMAT(completed_at, '%Y-%m-%d') AS day, COUNT(*) AS completed FROM tasks WHERE user_id = ? AND completed = 1 AND completed_at >= DATE_SUB(CURDATE(), INTERVAL 6 DAY) GROUP BY DATE(completed_at)",
    [id],
  );
  const [journal] = await pool.query(
    "SELECT * FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [id],
  );
  const [goals] = await pool.query(
    "SELECT * FROM goals WHERE user_id = ? AND status = 'Active' ORDER BY id DESC LIMIT 4",
    [id],
  );
  const [roadmaps] = await pool.query(
    "SELECT * FROM roadmaps WHERE user_id = ? ORDER BY created_at DESC",
    [id],
  );
  const todayKeyValue = today();
  res.json({
    taskStats: {
      total: Number(taskStats.total || 0),
      completed: Number(taskStats.completed || 0),
    },
    streak: streak || { current_count: 0, longest_count: 0 },
    tasks,
    todayTasks: tasks.filter((task) => task.due_date && dateKey(task.due_date) === todayKeyValue),
    dailyProgress: dailyProgress.map((day) => ({
      day: day.day,
      completed: Number(day.completed),
    })),
    moods,
    journal: journal[0] || null,
    goals,
    roadmaps,
  });
});
app.get("/api/inspiration", auth, (req, res) => {
  const items = [
    {
      quote: "Start where you are. Use what you have. Do what you can.",
      author: "Arthur Ashe",
    },
    { quote: "Small steps every day add up to big change.", author: "Ivy" },
    { quote: "You do not have to do everything today.", author: "Ivy" },
    {
      quote: "Progress is still progress, even when it is quiet.",
      author: "Ivy",
    },
    {
      quote: "You are allowed to move gently and still make real progress.",
      author: "Ivy",
    },
    {
      quote: "The next right step is often smaller than your mind makes it seem.",
      author: "Ivy",
    },
  ];
  res.json(items[Math.floor(Math.random() * items.length)]);
});
app.get("/api/tasks", auth, async (req, res) => {
  const q = `%${req.query.search || ""}%`;
  const [rows] = await pool.query(
    "SELECT * FROM tasks WHERE user_id = ? AND title LIKE ? ORDER BY completed, due_date IS NULL, due_date DESC, created_at DESC",
    [req.user.id, q],
  );
  res.json(rows);
});
app.post("/api/tasks", auth, async (req, res) => {
  const {
    title,
    description = "",
    dueDate = null,
    priority = "Medium",
    category = "Personal",
  } = req.body;
  if (!title?.trim())
    return res.status(400).json({ error: "Task title is required." });
  const [result] = await pool.query(
    "INSERT INTO tasks (user_id, title, description, due_date, priority, category) VALUES (?, ?, ?, ?, ?, ?)",
    [
      req.user.id,
      title.trim(),
      description,
      dueDate || null,
      priority,
      category,
    ],
  );
  await log(req.user.id, "task_created", `Added task “${title.trim()}”`);
  res
    .status(201)
    .json({
      id: result.insertId,
      title: title.trim(),
      description,
      due_date: dueDate,
      priority,
      category,
      completed: 0,
    });
});
app.patch("/api/tasks/:id", auth, async (req, res) => {
  const { completed, title, description, dueDate, priority, category } =
    req.body;
  const [result] = await pool.query(
    "UPDATE tasks SET completed = COALESCE(?, completed), completed_at = IF(? = 1, NOW(), NULL), title = COALESCE(?, title), description = COALESCE(?, description), due_date = COALESCE(?, due_date), priority = COALESCE(?, priority), category = COALESCE(?, category) WHERE id = ? AND user_id = ?",
    [
      completed,
      completed,
      title,
      description,
      dueDate,
      priority,
      category,
      req.params.id,
      req.user.id,
    ],
  );
  if (!result.affectedRows)
    return res.status(404).json({ error: "Task not found." });
  if (completed === true)
    await log(req.user.id, "task_completed", `Completed a task`);
  const [rows] = await pool.query("SELECT * FROM tasks WHERE id = ?", [
    req.params.id,
  ]);
  res.json(rows[0]);
});
app.delete("/api/tasks/:id", auth, async (req, res) => {
  await pool.query("DELETE FROM tasks WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  await log(req.user.id, "task_deleted", "Deleted a task");
  res.status(204).end();
});
app.get("/api/journal", auth, async (req, res) => {
  const q = `%${req.query.search || ""}%`;
  const [rows] = await pool.query(
    "SELECT * FROM journal_entries WHERE user_id = ? AND (title LIKE ? OR content LIKE ?) ORDER BY created_at DESC",
    [req.user.id, q, q],
  );
  res.json(rows);
});
app.post("/api/journal", auth, async (req, res) => {
  const { title, content, mood = "Okay", tags = [] } = req.body;
  if (!title?.trim() || !content?.trim())
    return res.status(400).json({ error: "Title and content are required." });
  const [result] = await pool.query(
    "INSERT INTO journal_entries (user_id, title, content, mood, tags) VALUES (?, ?, ?, ?, ?)",
    [req.user.id, title.trim(), content.trim(), mood, JSON.stringify(tags)],
  );
  await log(req.user.id, "journal_created", `Wrote “${title.trim()}”`);
  const [rows] = await pool.query(
    "SELECT * FROM journal_entries WHERE id = ?",
    [result.insertId],
  );
  res.status(201).json(rows[0]);
});
app.post("/api/journal/:id/reflect", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM journal_entries WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );
  if (!rows[0])
    return res.status(404).json({ error: "Journal entry not found." });
  let reflection;
  try {
    reflection = await generateJournalReflection(rows[0]);
  } catch (error) {
    return res
      .status(error.status || 503)
      .json({ error: error.message || "Ivy could not reflect on this entry. Please try again." });
  }
  await log(
    req.user.id,
    "journal_reflection",
    `Reflected on “${rows[0].title}”`,
  );
  res.json({ reflection });
});
app.delete("/api/journal/:id", auth, async (req, res) => {
  await pool.query("DELETE FROM journal_entries WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  res.status(204).end();
});
app.get("/api/moods", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM moods WHERE user_id = ? ORDER BY recorded_on DESC LIMIT 31",
    [req.user.id],
  );
  res.json(rows);
});
app.post("/api/moods", auth, async (req, res) => {
  const scores = { Great: 5, Good: 4, Okay: 3, Low: 2, Stressed: 1 };
  const { mood, note = "" } = req.body;
  if (!scores[mood])
    return res.status(400).json({ error: "Choose a valid mood." });
  await pool.query(
    "INSERT INTO moods (user_id, mood, score, note, recorded_on) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE mood = VALUES(mood), score = VALUES(score), note = VALUES(note)",
    [req.user.id, mood, scores[mood], note, today()],
  );
  await refreshStreak(req.user.id);
  await log(req.user.id, "mood_recorded", `Mood recorded: ${mood}`);
  res.json({ mood, score: scores[mood], recorded_on: today() });
});
app.get("/api/history", auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT id, type, description, created_at FROM activity_history WHERE user_id = ? UNION ALL SELECT id, 'task_completed', CONCAT('Completed a task: ', title), completed_at FROM tasks WHERE user_id = ? AND completed = 1 AND completed_at IS NOT NULL ORDER BY created_at DESC LIMIT 200`,
    [req.user.id, req.user.id],
  );
  const groups = rows.reduce((days, item) => {
    const day = new Date(item.created_at).toISOString().slice(0, 10);
    (days[day] ||= []).push(item);
    return days;
  }, {});
  res.json(Object.entries(groups).map(([date, items]) => ({ date, items })));
});
app.delete("/api/history/:id", auth, async (req, res) => {
  const [activity] = await pool.query(
    "DELETE FROM activity_history WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );
  if (activity.affectedRows) {
    return res.status(204).end();
  }
  const [task] = await pool.query(
    "UPDATE tasks SET completed = 0, completed_at = NULL WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );
  if (!task.affectedRows) {
    return res.status(404).json({ error: "History entry not found." });
  }
  res.status(204).end();
});
app.get("/api/goals", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM goals WHERE user_id = ? ORDER BY status, target_date",
    [req.user.id],
  );
  res.json(rows);
});
app.post("/api/goals", auth, async (req, res) => {
  const { title, description = "", targetDate = null } = req.body;
  if (!title?.trim())
    return res.status(400).json({ error: "Goal title is required." });
  const [result] = await pool.query(
    "INSERT INTO goals (user_id, title, description, target_date) VALUES (?, ?, ?, ?)",
    [req.user.id, title.trim(), description, targetDate],
  );
  res
    .status(201)
    .json({
      id: result.insertId,
      title,
      description,
      target_date: targetDate,
      progress: 0,
      status: "Active",
    });
});
app.get("/api/goals/:id/tasks", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT gt.* FROM goal_tasks gt JOIN goals g ON g.id = gt.goal_id WHERE gt.goal_id = ? AND g.user_id = ? ORDER BY gt.completed, gt.created_at DESC",
    [req.params.id, req.user.id],
  );
  res.json(rows);
});
app.post("/api/goals/:id/tasks", auth, async (req, res) => {
  if (!req.body.title?.trim())
    return res.status(400).json({ error: "Completed task title is required." });
  const [goal] = await pool.query(
    "SELECT id FROM goals WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );
  if (!goal[0]) return res.status(404).json({ error: "Goal not found." });
  const [result] = await pool.query(
    "INSERT INTO goal_tasks (goal_id, user_id, title, completed, completed_at) VALUES (?, ?, ?, 1, NOW())",
    [req.params.id, req.user.id, req.body.title.trim()],
  );
  await pool.query(
    "UPDATE goals SET progress = LEAST(100, progress + 10) WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );
  await log(
    req.user.id,
    "goal_task_completed",
    `Completed goal task: ${req.body.title.trim()}`,
  );
  res
    .status(201)
    .json({ id: result.insertId, title: req.body.title.trim(), completed: 1 });
});
app.get("/api/users/search", auth, async (req, res) => {
  const q = `%${String(req.query.q || "").trim()}%`;
  if (q === "%%") return res.json([]);
  const [rows] = await pool.query(
    "SELECT id, full_name, username, bio FROM users WHERE id <> ? AND (username LIKE ? OR full_name LIKE ?) LIMIT 10",
    [req.user.id, q, q],
  );
  res.json(rows);
});
app.get("/api/collaborations", auth, async (req, res) => {
  const [rows] = await pool.query(
    `SELECT c.id, c.name, c.description, c.combined_goal, c.start_date, c.end_date, cm.status, cm.progress, u.full_name AS owner_name FROM collaborations c JOIN collaboration_members cm ON cm.collaboration_id = c.id JOIN users u ON u.id = c.owner_id WHERE cm.user_id = ? AND cm.status IN ('active','pending') ORDER BY c.created_at DESC`,
    [req.user.id],
  );
  for (const collaboration of rows) {
    const [members] = await pool.query(
      `SELECT cm.user_id, cm.status, cm.progress, u.full_name, u.username FROM collaboration_members cm JOIN users u ON u.id = cm.user_id WHERE cm.collaboration_id = ? AND cm.status IN ('active','pending')`,
      [collaboration.id],
    );
    collaboration.members = members;
  }
  res.json(rows);
});
app.get("/api/collaborations/:id/tasks", auth, async (req, res) => {
  await ensureCollaborationTasksTable();
  if (!(await isActiveCollaborationMember(req.params.id, req.user.id)))
    return res.status(403).json({ error: "Join this collaboration to view its tasks." });
  const [tasks] = await pool.query(
    `SELECT ct.*, u.full_name AS creator_name
    FROM collaboration_tasks ct
    JOIN users u ON u.id = ct.created_by
    WHERE ct.collaboration_id = ?
    ORDER BY ct.completed, ct.due_date IS NULL, ct.due_date, ct.created_at DESC`,
    [req.params.id],
  );
  res.json(tasks);
});
app.post("/api/collaborations/:id/tasks", auth, async (req, res) => {
  await ensureCollaborationTasksTable();
  if (!(await isActiveCollaborationMember(req.params.id, req.user.id)))
    return res.status(403).json({ error: "Join this collaboration to add tasks." });
  const title = String(req.body.title || "").trim();
  const dueDate = req.body.dueDate || null;
  if (!title)
    return res.status(400).json({ error: "Task title is required." });
  if (dueDate && !/^\d{4}-\d{2}-\d{2}$/.test(dueDate))
    return res.status(400).json({ error: "Choose a valid due date." });
  const [created] = await pool.query(
    "INSERT INTO collaboration_tasks (collaboration_id, created_by, title, due_date) VALUES (?, ?, ?, ?)",
    [req.params.id, req.user.id, title, dueDate],
  );
  const [tasks] = await pool.query(
    `SELECT ct.*, u.full_name AS creator_name
    FROM collaboration_tasks ct JOIN users u ON u.id = ct.created_by
    WHERE ct.id = ?`,
    [created.insertId],
  );
  res.status(201).json(tasks[0]);
});
app.patch("/api/collaborations/:id/tasks/:taskId", auth, async (req, res) => {
  await ensureCollaborationTasksTable();
  if (!(await isActiveCollaborationMember(req.params.id, req.user.id)))
    return res.status(403).json({ error: "Join this collaboration to update its tasks." });
  if (typeof req.body.completed !== "boolean")
    return res.status(400).json({ error: "Choose whether the task is complete." });
  const [existing] = await pool.query(
    "SELECT id FROM collaboration_tasks WHERE id = ? AND collaboration_id = ?",
    [req.params.taskId, req.params.id],
  );
  if (!existing[0])
    return res.status(404).json({ error: "Shared task not found." });
  await pool.query(
    `UPDATE collaboration_tasks
    SET completed = ?, completed_by = IF(?, ?, NULL), completed_at = IF(?, NOW(), NULL)
    WHERE id = ? AND collaboration_id = ?`,
    [
      req.body.completed,
      req.body.completed,
      req.user.id,
      req.body.completed,
      req.params.taskId,
      req.params.id,
    ],
  );
  const [tasks] = await pool.query(
    `SELECT ct.*, u.full_name AS creator_name
    FROM collaboration_tasks ct JOIN users u ON u.id = ct.created_by
    WHERE ct.id = ?`,
    [req.params.taskId],
  );
  res.json(tasks[0]);
});
app.delete("/api/collaborations/:id/tasks/:taskId", auth, async (req, res) => {
  await ensureCollaborationTasksTable();
  if (!(await isActiveCollaborationMember(req.params.id, req.user.id)))
    return res.status(403).json({ error: "Join this collaboration to remove its tasks." });
  const [deleted] = await pool.query(
    "DELETE FROM collaboration_tasks WHERE id = ? AND collaboration_id = ?",
    [req.params.taskId, req.params.id],
  );
  if (!deleted.affectedRows)
    return res.status(404).json({ error: "Shared task not found." });
  res.status(204).end();
});
app.post("/api/collaborations", auth, async (req, res) => {
  const {
    name,
    description = "",
    combinedGoal = "",
    startDate = null,
    endDate = null,
  } = req.body;
  if (!name?.trim())
    return res.status(400).json({ error: "Collaboration name is required." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [created] = await connection.query(
      "INSERT INTO collaborations (owner_id, name, description, combined_goal, start_date, end_date) VALUES (?, ?, ?, ?, ?, ?)",
      [req.user.id, name.trim(), description, combinedGoal, startDate, endDate],
    );
    await connection.query(
      "INSERT INTO collaboration_members (collaboration_id, user_id, status, joined_at) VALUES (?, ?, 'active', NOW())",
      [created.insertId, req.user.id],
    );
    await connection.commit();
    res
      .status(201)
      .json({
        id: created.insertId,
        name: name.trim(),
        description,
        combined_goal: combinedGoal,
        status: "active",
        progress: 0,
        members: [
          {
            user_id: req.user.id,
            full_name: req.user.full_name,
            username: req.user.username,
            status: "active",
            progress: 0,
          },
        ],
      });
  } catch {
    await connection.rollback();
    res.status(500).json({ error: "Unable to create collaboration." });
  } finally {
    connection.release();
  }
});
app.post("/api/collaborations/:id/invite", auth, async (req, res) => {
  const [owned] = await pool.query(
    "SELECT id, name FROM collaborations WHERE id = ? AND owner_id = ?",
    [req.params.id, req.user.id],
  );
  if (!owned[0])
    return res
      .status(403)
      .json({ error: "Only the collaboration owner can invite members." });
  const [invitee] = await pool.query(
    "SELECT id FROM users WHERE username = ? OR email = ?",
    [req.body.username, req.body.username],
  );
  if (!invitee[0] || invitee[0].id === req.user.id)
    return res.status(404).json({ error: "User not found." });
  await pool.query(
    "INSERT INTO collaboration_members (collaboration_id, user_id, status) VALUES (?, ?, 'pending') ON DUPLICATE KEY UPDATE status = 'pending'",
    [req.params.id, invitee[0].id],
  );
  await pool.query(
    "INSERT INTO notifications (user_id, title, body) VALUES (?, ?, ?)",
    [
      invitee[0].id,
      "Collaboration invitation",
      `collaboration:${owned[0].id}|You were invited to join “${owned[0].name}”.`,
    ],
  );
  res.status(201).json({ message: "Invitation sent." });
});
app.patch("/api/collaborations/:id/respond", auth, async (req, res) => {
  const status = req.body.status === "active" ? "active" : "declined";
  const [existing] = await pool.query(
    "SELECT status FROM collaboration_members WHERE collaboration_id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );

  if (!existing[0])
    return res.status(404).json({ error: "Invitation not found." });

  if (existing[0].status !== "pending") {
    return res.json({ status: existing[0].status });
  }

  const [result] = await pool.query(
    "UPDATE collaboration_members SET status = ?, joined_at = IF(? = 'active', NOW(), joined_at) WHERE collaboration_id = ? AND user_id = ? AND status = 'pending'",
    [status, status, req.params.id, req.user.id],
  );

  if (!result.affectedRows)
    return res.status(404).json({ error: "Invitation not found." });

  res.json({ status });
});
app.patch("/api/collaborations/:id/progress", auth, async (req, res) => {
  const progress = Math.max(0, Math.min(100, Number(req.body.progress)));
  const [result] = await pool.query(
    `UPDATE collaboration_members cm JOIN collaborations c ON c.id = cm.collaboration_id SET cm.progress = ? WHERE cm.collaboration_id = ? AND cm.user_id = ? AND cm.status = 'active'`,
    [progress, req.params.id, req.user.id],
  );
  if (!result.affectedRows)
    return res.status(404).json({ error: "Active collaboration not found." });
  res.json({ progress });
});
app.post("/api/roadmaps", auth, async (req, res) => {
  if (!req.body.skill?.trim())
    return res.status(400).json({ error: "Tell us what you want to learn." });
  const content = await generateRoadmap(req.body.skill);
  const [result] = await pool.query(
    "INSERT INTO roadmaps (user_id, title, skill_level, duration_weeks, content) VALUES (?, ?, ?, ?, ?)",
    [
      req.user.id,
      content.title,
      content.skillLevel,
      content.durationWeeks,
      JSON.stringify(content),
    ],
  );
  res.status(201).json({ id: result.insertId, ...content, progress: 0 });
});
app.get("/api/roadmaps", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM roadmaps WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id],
  );
  res.json(
    rows.map((row) => ({
      ...row,
      content:
        typeof row.content === "string" ? JSON.parse(row.content) : row.content,
    })),
  );
});
app.patch("/api/roadmaps/:id/progress", auth, async (req, res) => {
  const progress = Math.max(0, Math.min(100, Number(req.body.progress)));
  const [result] = await pool.query(
    "UPDATE roadmaps SET progress = ? WHERE id = ? AND user_id = ?",
    [progress, req.params.id, req.user.id],
  );
  if (!result.affectedRows)
    return res.status(404).json({ error: "Roadmap not found." });
  res.json({ progress });
});
app.get("/api/suggestions", auth, async (req, res) => {
  const [goals] = await pool.query(
    "SELECT title FROM goals WHERE user_id = ? AND status = 'Active' LIMIT 1",
    [req.user.id],
  );
  res.json(await generateSuggestions({ goal: goals[0]?.title }));
});
app.post("/api/suggestions/add", auth, async (req, res) => {
  const {
    title,
    description,
    priority = "Medium",
    category = "AI suggestion",
  } = req.body;
  const [result] = await pool.query(
    "INSERT INTO tasks (user_id, title, description, priority, category, due_date) VALUES (?, ?, ?, ?, ?, ?)",
    [req.user.id, title, description, priority, category, today()],
  );
  await log(req.user.id, "ai_task_added", `Added AI suggestion “${title}”`);
  res
    .status(201)
    .json({
      id: result.insertId,
      title,
      description,
      priority,
      category,
      completed: 0,
    });
});
app.post("/api/vision/ideas", auth, async (req, res) => {
  if (!req.body.title?.trim())
    return res.status(400).json({ error: "Give your vision board a title." });
  res.json(await generateVisionIdeas(req.body.title, req.body.description));
});
app.get("/api/vision", auth, async (req, res) => {
  const [boards] = await pool.query(
    "SELECT * FROM vision_boards WHERE user_id = ? ORDER BY created_at DESC",
    [req.user.id],
  );
  for (const board of boards) {
    const [items] = await pool.query(
      "SELECT * FROM vision_board_items WHERE board_id = ? ORDER BY id",
      [board.id],
    );
    board.items = items;
  }
  res.json(boards);
});
app.post("/api/vision", auth, async (req, res) => {
  const { title, description = "", items = [] } = req.body;
  if (!title?.trim())
    return res.status(400).json({ error: "Vision board title is required." });
  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();
    const [created] = await connection.query(
      "INSERT INTO vision_boards (user_id, title, description) VALUES (?, ?, ?)",
      [req.user.id, title.trim(), description],
    );
    for (const item of items.slice(0, 30))
      await connection.query(
        "INSERT INTO vision_board_items (board_id, kind, content, position_x, position_y) VALUES (?, ?, ?, ?, ?)",
        [
          created.insertId,
          item.kind || "affirmation",
          String(item.content).slice(0, 1000),
          Number(item.position_x || 0),
          Number(item.position_y || 0),
        ],
      );
    await connection.commit();
    await log(req.user.id, "vision_board_created", `Created “${title.trim()}”`);
    res
      .status(201)
      .json({ id: created.insertId, title: title.trim(), description, items });
  } catch (error) {
    await connection.rollback();
    res.status(500).json({ error: "Unable to save vision board." });
  } finally {
    connection.release();
  }
});
app.patch("/api/vision/:id", auth, async (req, res) => {
  const description = req.body.description ?? "";
  const [result] = await pool.query(
    "UPDATE vision_boards SET description = ? WHERE id = ? AND user_id = ?",
    [description.trim(), req.params.id, req.user.id],
  );
  if (!result.affectedRows)
    return res.status(404).json({ error: "Vision board not found." });
  const [rows] = await pool.query(
    "SELECT * FROM vision_boards WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );
  res.json(rows[0]);
});
app.delete("/api/vision/:id", auth, async (req, res) => {
  await pool.query("DELETE FROM vision_boards WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  res.status(204).end();
});
app.post(
  "/api/vision/:id/cover",
  auth,
  imageUpload.single("image"),
  async (req, res) => {
    if (!req.file)
      return res
        .status(400)
        .json({ error: "Upload a JPG, PNG, or WebP image under 5 MB." });
    const [result] = await pool.query(
      "UPDATE vision_boards SET cover_url = ? WHERE id = ? AND user_id = ?",
      [`/uploads/${req.file.filename}`, req.params.id, req.user.id],
    );
    if (!result.affectedRows)
      return res.status(404).json({ error: "Vision board not found." });
    res.json({ coverUrl: `/uploads/${req.file.filename}` });
  },
);
app.get("/api/habits", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT h.*, hc.completed_on IS NOT NULL AS completed_today FROM habits h LEFT JOIN habit_completions hc ON hc.habit_id = h.id AND hc.completed_on = CURDATE() WHERE h.user_id = ? ORDER BY h.created_at",
    [req.user.id],
  );
  res.json(rows);
});
app.post("/api/habits", auth, async (req, res) => {
  if (!req.body.title?.trim())
    return res.status(400).json({ error: "Habit title is required." });
  const [result] = await pool.query(
    "INSERT INTO habits (user_id, title, frequency) VALUES (?, ?, ?)",
    [req.user.id, req.body.title.trim(), req.body.frequency || "Daily"],
  );
  res
    .status(201)
    .json({
      id: result.insertId,
      title: req.body.title.trim(),
      frequency: req.body.frequency || "Daily",
      completed_today: 0,
    });
});
app.post("/api/habits/:id/complete", auth, async (req, res) => {
  const [habits] = await pool.query(
    "SELECT id, title FROM habits WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );
  if (!habits[0]) return res.status(404).json({ error: "Habit not found." });
  await pool.query(
    "INSERT IGNORE INTO habit_completions (habit_id, completed_on) VALUES (?, CURDATE())",
    [req.params.id],
  );
  await refreshStreak(req.user.id);
  await log(
    req.user.id,
    "habit_completed",
    `Completed habit “${habits[0].title}”`,
  );
  res.json({ completed: true });
});
app.delete("/api/habits/:id", auth, async (req, res) => {
  await pool.query("DELETE FROM habits WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  res.status(204).end();
});
app.get("/api/badges", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT b.*, ub.earned_at FROM badges b LEFT JOIN user_badges ub ON ub.badge_id = b.id AND ub.user_id = ? ORDER BY ub.earned_at IS NULL, b.id",
    [req.user.id],
  );
  res.json(rows);
});
app.get("/api/chat", auth, async (req, res) => {
  const [conversations] = await pool.query(
    "SELECT id, title FROM chat_conversations WHERE user_id = ? ORDER BY created_at DESC LIMIT 1",
    [req.user.id],
  );
  if (!conversations[0])
    return res.json({ conversationId: null, messages: [] });
  const [messages] = await pool.query(
    "SELECT id, role, content, created_at FROM chat_messages WHERE conversation_id = ? ORDER BY created_at",
    [conversations[0].id],
  );
  res.json({ conversationId: conversations[0].id, messages });
});
app.post("/api/chat", auth, async (req, res) => {
  const message = typeof req.body.message === "string" ? req.body.message.trim() : "";
  if (!message)
    return res.status(400).json({ error: "Message is required." });
  if (message.length > 4000)
    return res.status(400).json({ error: "Messages must be 4,000 characters or fewer." });
  let conversationId = req.body.conversationId;
  if (conversationId && !/^\d+$/.test(String(conversationId)))
    return res.status(400).json({ error: "Conversation not found." });
  if (!conversationId) {
    const [created] = await pool.query(
      "INSERT INTO chat_conversations (user_id) VALUES (?)",
      [req.user.id],
    );
    conversationId = created.insertId;
  } else {
    const [owned] = await pool.query(
      "SELECT id FROM chat_conversations WHERE id = ? AND user_id = ?",
      [conversationId, req.user.id],
    );
    if (!owned[0])
      return res.status(403).json({ error: "Conversation not found." });
  }
  const [historyRows] = await pool.query(
    "SELECT role, content FROM chat_messages WHERE conversation_id = ? ORDER BY created_at DESC, id DESC LIMIT 20",
    [conversationId],
  );
  await pool.query(
    "INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, 'user', ?)",
    [conversationId, message],
  );
  const query = message.toLowerCase();
  const progressQuestion = /\b(progress|doing|completed|streak|performance)\b/.test(query);
  const context = { history: historyRows.reverse() };
  if (progressQuestion || /\b(goal|goals|plan|planning)\b/.test(query)) {
    const [goals] = await pool.query(
      "SELECT title, description, progress, status FROM goals WHERE user_id = ? AND status = 'Active' ORDER BY id DESC LIMIT 5",
      [req.user.id],
    );
    if (goals.length) context.goals = goals;
  }
  if (progressQuestion || /\b(task|tasks|productivity|today|priorit|organize)\b/.test(query)) {
    const [[taskStats]] = await pool.query(
      "SELECT COUNT(*) AS total, SUM(completed = 1) AS completed FROM tasks WHERE user_id = ?",
      [req.user.id],
    );
    const [tasks] = await pool.query(
      "SELECT title, completed, due_date FROM tasks WHERE user_id = ? ORDER BY completed, due_date IS NULL, due_date, created_at DESC LIMIT 8",
      [req.user.id],
    );
    context.taskProgress = {
      total: Number(taskStats.total || 0),
      completed: Number(taskStats.completed || 0),
      tasks,
    };
  }
  if (progressQuestion || /\b(streak|habit|consisten)\b/.test(query)) {
    const [streaks] = await pool.query(
      "SELECT current_count, longest_count FROM streaks WHERE user_id = ?",
      [req.user.id],
    );
    if (streaks[0]) context.streak = streaks[0];
  }
  if (/\b(mood|feeling|felt|emotion|wellbeing)\b/.test(query)) {
    const [moods] = await pool.query(
      "SELECT mood, score, recorded_on FROM moods WHERE user_id = ? ORDER BY recorded_on DESC LIMIT 3",
      [req.user.id],
    );
    if (moods.length) context.recentMoods = moods;
  }
  if (/\b(journal|entry|entries|reflection|reflect)\b/.test(query)) {
    const [entries] = await pool.query(
      "SELECT title, content, mood, created_at FROM journal_entries WHERE user_id = ? ORDER BY created_at DESC LIMIT 2",
      [req.user.id],
    );
    if (entries.length) {
      context.recentJournalEntries = entries.map((entry) => ({
        ...entry,
        content: entry.content.slice(0, 500),
      }));
    }
  }
  if (/\b(roadmap|learning|learn|study|career|skill)\b/.test(query)) {
    const [roadmaps] = await pool.query(
      "SELECT title, skill_level, duration_weeks, progress FROM roadmaps WHERE user_id = ? ORDER BY created_at DESC LIMIT 3",
      [req.user.id],
    );
    if (roadmaps.length) context.roadmaps = roadmaps;
  }
  let content;
  try {
    content = await answerChat(message, context);
  } catch (error) {
    return res
      .status(error.status || 503)
      .json({ error: error.message || "Ivy could not respond right now. Please try again." });
  }
  await pool.query(
    "INSERT INTO chat_messages (conversation_id, role, content) VALUES (?, 'assistant', ?)",
    [conversationId, content],
  );
  res.json({ conversationId, role: "assistant", content });
});
app.get("/api/notifications", auth, async (req, res) => {
  const [rows] = await pool.query(
    "SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 30",
    [req.user.id],
  );
  res.json(rows);
});
app.patch("/api/notifications/:id/read", auth, async (req, res) => {
  await pool.query(
    "UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?",
    [req.params.id, req.user.id],
  );
  res.status(204).end();
});
app.post("/api/notifications/read-all", auth, async (req, res) => {
  await pool.query("UPDATE notifications SET is_read = 1 WHERE user_id = ?", [
    req.user.id,
  ]);
  res.status(204).end();
});
app.delete("/api/notifications/:id", auth, async (req, res) => {
  await pool.query("DELETE FROM notifications WHERE id = ? AND user_id = ?", [
    req.params.id,
    req.user.id,
  ]);
  res.status(204).end();
});
app.listen(port, () =>
  console.log(`IvyJournal API listening on http://localhost:${port}`),
);
