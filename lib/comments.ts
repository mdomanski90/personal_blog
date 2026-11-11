import Database from 'better-sqlite3'
import path from 'path'

const DB_PATH = path.join(process.cwd(), 'data', 'comments.db')

let db: Database.Database | null = null

function getDb(): Database.Database {
    if (!db) {
        // Utwórz folder data/ jeśli nie istnieje
        const fs = require('fs')
        const dir = path.dirname(DB_PATH)
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true })
        }

        db = new Database(DB_PATH)
        db.pragma('journal_mode = WAL')
        db.pragma('foreign_keys = ON')

        // Utwórz tabele
        db.exec(`
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                slug TEXT NOT NULL,
                name TEXT NOT NULL,
                email TEXT NOT NULL,
                content TEXT NOT NULL,
                created_at DATETIME DEFAULT (datetime('now', 'localtime'))
            );

            CREATE INDEX IF NOT EXISTS idx_comments_slug ON comments(slug);

            CREATE TABLE IF NOT EXISTS blocked_slugs (
                slug TEXT PRIMARY KEY
            );
        `)
    }
    return db
}

// ---- KOMENTARZE ----

export interface Comment {
    id: number
    slug: string
    name: string
    email: string
    content: string
    created_at: string
}

export function getComments(slug: string): Comment[] {
    const db = getDb()
    return db.prepare(
        'SELECT id, slug, name, email, content, created_at FROM comments WHERE slug = ? ORDER BY created_at ASC'
    ).all(slug) as Comment[]
}

export function addComment(slug: string, name: string, email: string, content: string): Comment {
    const db = getDb()
    const result = db.prepare(
        'INSERT INTO comments (slug, name, email, content) VALUES (?, ?, ?, ?)'
    ).run(slug, name.trim(), email.trim(), content.trim())

    return db.prepare('SELECT * FROM comments WHERE id = ?').get(result.lastInsertRowid) as Comment
}

export function deleteComment(id: number): boolean {
    const db = getDb()
    const result = db.prepare('DELETE FROM comments WHERE id = ?').run(id)
    return result.changes > 0
}

export function getCommentCount(slug: string): number {
    const db = getDb()
    const row = db.prepare('SELECT COUNT(*) as count FROM comments WHERE slug = ?').get(slug) as { count: number }
    return row.count
}

// ---- BLOKOWANIE KOMENTARZY ----

export function isBlocked(slug: string): boolean {
    const db = getDb()
    const row = db.prepare('SELECT slug FROM blocked_slugs WHERE slug = ?').get(slug)
    return !!row
}

export function blockSlug(slug: string): void {
    const db = getDb()
    db.prepare('INSERT OR IGNORE INTO blocked_slugs (slug) VALUES (?)').run(slug)
}

export function unblockSlug(slug: string): void {
    const db = getDb()
    db.prepare('DELETE FROM blocked_slugs WHERE slug = ?').run(slug)
}

export function getBlockedSlugs(): string[] {
    const db = getDb()
    const rows = db.prepare('SELECT slug FROM blocked_slugs').all() as { slug: string }[]
    return rows.map(r => r.slug)
}