import { Pool } from 'pg';
import dotenv from "dotenv";

dotenv.config();

let pool: Pool | null = null;

export async function initDatabase() {
  if (!pool) {
    // Проверяем наличие переменных Railway PostgreSQL
    const hasRailwayVars = process.env.PGHOST && process.env.PGUSER && process.env.PGPASSWORD && process.env.PGDATABASE;
    const connectionString = process.env.DATABASE_URL || process.env.POSTGRES_URL;

    if (!connectionString && !hasRailwayVars) {
      throw new Error('Переменные базы данных не найдены. Нужны либо DATABASE_URL, либо PGHOST/PGUSER/PGPASSWORD/PGDATABASE');
    }

    let config;
    if (connectionString) {
      // Используем connection string если есть
      config = {
        connectionString: connectionString,
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };
    } else {
      // Используем отдельные переменные Railway
      config = {
        host: process.env.PGHOST,
        user: process.env.PGUSER,
        password: process.env.PGPASSWORD,
        database: process.env.PGDATABASE,
        port: parseInt(process.env.PGPORT || '5432'),
        ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
      };
    }

    pool = new Pool(config);

    // Создаем таблицу если её нет
    const client = await pool.connect();
    try {
      await client.query(`
        CREATE TABLE IF NOT EXISTS messages (
          id SERIAL PRIMARY KEY,
          chat TEXT,
          content TEXT,
          phone TEXT,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);
      console.log('✅ Таблица messages создана/проверена в PostgreSQL');
    } finally {
      client.release();
    }
  }
  return pool;
}

export async function saveMessage(chat: string, content: string, phone: string) {
  console.log(`💾 Сохранение в БД:`, { chat, content: content.substring(0, 50), phone });
  const database = await initDatabase();
  const client = await database.connect();
  try {
    const result = await client.query(
      "INSERT INTO messages (chat, content, phone) VALUES ($1, $2, $3) RETURNING id",
      [chat, content, phone]
    );
    console.log(`✅ Сохранено в БД с ID:`, result.rows[0].id);
    return result.rows[0];
  } finally {
    client.release();
  }
}

export async function getAllMessages() {
  const database = await initDatabase();
  const client = await database.connect();
  try {
    const result = await client.query("SELECT * FROM messages ORDER BY created_at DESC");
    return result.rows;
  } finally {
    client.release();
  }
}

export async function getMessageCount() {
  const database = await initDatabase();
  const client = await database.connect();
  try {
    const result = await client.query("SELECT COUNT(*) as count FROM messages");
    return parseInt(result.rows[0].count);
  } finally {
    client.release();
  }
}
