import Database from 'better-sqlite3';
import { randomUUID } from 'crypto';

const db = new Database('juris_dev.db');

// Criar tabelas
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE,
    password TEXT NOT NULL,
    credits INTEGER DEFAULT 50,
    createdAt TEXT DEFAULT CURRENT_TIMESTAMP
  );
`);

export function findUserByEmail(email: string) {
  const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
  return stmt.get(email);
}

export function createUser(name: string, email: string, password: string) {
  const id = randomUUID();
  const stmt = db.prepare('INSERT INTO users (id, name, email, password) VALUES (?, ?, ?, ?)');
  stmt.run(id, name, email, password);
  return { id, name, email, credits: 50 };
}

export function updateUserCredits(userId: string, credits: number) {
  const stmt = db.prepare('UPDATE users SET credits = ? WHERE id = ?');
  stmt.run(credits, userId);
}

export default db;