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
    console.log('✅ Таблица messages создана/проверена в SQLite');
  }
  return db;
}

export async function saveMessage(chat: string, content: string, phone: string) {
  console.log(`💾 Сохранение в БД:`, { chat, content: content.substring(0, 50), phone });
  const database = await initDatabase();
  const result = await database.run(
    "INSERT INTO messages (chat, content, phone) VALUES (?, ?, ?)",
    [chat, content, phone]
  );
  console.log(`✅ Сохранено в БД с ID:`, result.lastID);
  return result;
}

export async function getAllMessages() {
  const database = await initDatabase();
  const messages = await database.all("SELECT * FROM messages ORDER BY created_at DESC");
  return messages;
}

export async function getMessageCount() {
  const database = await initDatabase();
  const result = await database.get("SELECT COUNT(*) as count FROM messages");
  return result.count;
}
