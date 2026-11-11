import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.join(process.cwd(), 'data', 'zrodla.db');
const db = new Database(dbPath);

// Inicjalizacja tabeli - data_dodania BEZ DEFAULT
db.exec(`
    CREATE TABLE IF NOT EXISTS items (
                                         id INTEGER PRIMARY KEY AUTOINCREMENT,
                                         data_dodania DATE,
                                         typ TEXT,
                                         osoba TEXT,
                                         miejscowosc TEXT,
                                         data_wydarzenia DATE,
                                         zawartosc TEXT
    )
`);

// Funkcje helper
export const getAllItems = () => {
    return db.prepare('SELECT * FROM items ORDER BY data_dodania DESC').all();
};

export const addItem = (data: any) => {
    const stmt = db.prepare(`
        INSERT INTO items (data_dodania, typ, osoba, miejscowosc, data_wydarzenia, zawartosc)
        VALUES (?, ?, ?, ?, ?, ?)
    `);
    return stmt.run(data.data_dodania, data.typ, data.osoba, data.miejscowosc, data.data_wydarzenia, data.zawartosc);
};

export const deleteItem = (id: number) => {
    return db.prepare('DELETE FROM items WHERE id = ?').run(id);
};

export default db;
