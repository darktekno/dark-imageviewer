import { DatabaseSync } from "node:sqlite";
import fs from "fs";
import path from "path";
import { v4 as uuidv4 } from "uuid";

const DB_DIR = path.join(process.cwd(), "data");
const DB_PATH = path.join(DB_DIR, "app.db");

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

let _db: DatabaseSync | null = null;

function getDb(): DatabaseSync {
  if (!_db) {
    try {
      _db = new DatabaseSync(DB_PATH);
      _db.exec("PRAGMA journal_mode = WAL");
      _initDb(_db);
      _seedDefaultUser(_db);
    } catch (e) {
      _db = null;
      throw e;
    }
  }
  return _db;
}

function _initDb(db: DatabaseSync): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      username TEXT UNIQUE NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (username) REFERENCES users(username)
    );

    CREATE TABLE IF NOT EXISTS folders (
      id TEXT PRIMARY KEY,
      username TEXT NOT NULL,
      name TEXT NOT NULL,
      image_count INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (username) REFERENCES users(username)
    );

    CREATE TABLE IF NOT EXISTS images (
      id TEXT PRIMARY KEY,
      folder_id TEXT NOT NULL,
      filename TEXT NOT NULL,
      stored_path TEXT NOT NULL,
      size INTEGER DEFAULT 0,
      width INTEGER DEFAULT 0,
      height INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (folder_id) REFERENCES folders(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS favorites (
      image_id TEXT NOT NULL,
      username TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      PRIMARY KEY (image_id, username),
      FOREIGN KEY (image_id) REFERENCES images(id) ON DELETE CASCADE,
      FOREIGN KEY (username) REFERENCES users(username)
    );

    CREATE INDEX IF NOT EXISTS idx_images_folder_filename ON images(folder_id, filename);
    CREATE INDEX IF NOT EXISTS idx_images_folder_created ON images(folder_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_images_folder_size ON images(folder_id, size);
    CREATE INDEX IF NOT EXISTS idx_folders_user_created ON folders(username, created_at);
    CREATE INDEX IF NOT EXISTS idx_favorites_username ON favorites(username);
  `);

  // Migrate: add width/height columns if they don't exist
  try { db.exec("ALTER TABLE images ADD COLUMN width INTEGER DEFAULT 0"); } catch {}
  try { db.exec("ALTER TABLE images ADD COLUMN height INTEGER DEFAULT 0"); } catch {}
}

function _seedDefaultUser(db: DatabaseSync): void {
  const existing = db.prepare("SELECT id FROM users WHERE username = ?").get("Dark") as { id: string } | undefined;
  if (!existing) {
    db.prepare("INSERT INTO users (id, username) VALUES (?, ?)").run(uuidv4(), "Dark");
  }
}

export function initDb(): void {
  getDb();
}

export function seedDefaultUser(): void {
  getDb();
}

export { getDb, uuidv4 };
