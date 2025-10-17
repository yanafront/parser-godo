import { Pool } from "pg";
import dotenv from "dotenv";

dotenv.config();

export const pool = new Pool({
  host: process.env.PGHOST,
  user: process.env.PGUSER,
  password: process.env.PGPASSWORD,
  database: process.env.PGDATABASE,
  port: Number(process.env.PGPORT),
});


export async function saveMessage(chat: string, content: string, phone: string) {
  await pool.query(
    "INSERT INTO messages (chat, content, phone) VALUES ($1, $2, $3)",
    [chat, content, phone]
  );
}