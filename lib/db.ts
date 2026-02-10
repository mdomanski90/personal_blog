import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'baza.db');
const db = new Database(dbPath);

// Inicjalizacja tabeli
db.exec(`
  CREATE TABLE IF NOT EXISTS items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    author TEXT,
    category TEXT,
    year INTEGER,
    rating INTEGER,
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Funkcje helper
export const getAllItems = () => {
    return db.prepare('SELECT * FROM items ORDER BY created_at DESC').all();
};

export const addItem = (data: any) => {
    const stmt = db.prepare(`
        INSERT INTO items (title, author, category, year, rating, description)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(data.title, data.author, data.category, data.year, data.rating, data.description);
};

export const deleteItem = (id: number) => {
    return db.prepare('DELETE FROM items WHERE id = ?').run(id);
};

export default db;
