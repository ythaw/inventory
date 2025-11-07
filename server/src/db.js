import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(process.cwd(), 'server', 'data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'auth.db');
const db = new Database(dbPath);

db.pragma('journal_mode = WAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    companyName TEXT NOT NULL,
    email TEXT NOT NULL UNIQUE,
    passwordHash TEXT NOT NULL,
    resetToken TEXT,
    resetTokenExpires INTEGER
  );

  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    name TEXT NOT NULL,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE(userId, name)
  );

  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    categoryId INTEGER NOT NULL,
    name TEXT NOT NULL,
    quantity REAL NOT NULL DEFAULT 0,
    unit TEXT NOT NULL DEFAULT 'lbs',
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    updatedAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (categoryId) REFERENCES categories(id) ON DELETE CASCADE,
    UNIQUE(userId, categoryId, name)
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    userId INTEGER NOT NULL,
    action TEXT NOT NULL,
    entityType TEXT NOT NULL,
    entityId INTEGER,
    entityName TEXT,
    details TEXT,
    createdAt INTEGER NOT NULL DEFAULT (strftime('%s', 'now')),
    FOREIGN KEY (userId) REFERENCES users(id) ON DELETE CASCADE
  );

  CREATE INDEX IF NOT EXISTS idx_items_userId ON items(userId);
  CREATE INDEX IF NOT EXISTS idx_items_categoryId ON items(categoryId);
  CREATE INDEX IF NOT EXISTS idx_categories_userId ON categories(userId);
  CREATE INDEX IF NOT EXISTS idx_activity_logs_userId ON activity_logs(userId);
  CREATE INDEX IF NOT EXISTS idx_activity_logs_createdAt ON activity_logs(createdAt);
`);

export default db;


