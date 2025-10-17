import sqlite3 from "sqlite3";
import { open } from "sqlite";
import dotenv from "dotenv";

dotenv.config();

let db: any = null;

export async function initDatabase() {
  if (!db) {
    db = await open({
      filename: './messages.db',
      driver: sqlite3.Database
    });
    
    await db.exec(`
      CREATE TABLE IF NOT EXISTS messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        chat TEXT,
        content TEXT,
        phone TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
  }
  return db;
}

export async function saveMessage(chat: string, content: string, phone: string) {
  const database = await initDatabase();
  await database.run(
    "INSERT INTO messages (chat, content, phone) VALUES (?, ?, ?)",
    [chat, content, phone]
  );
}