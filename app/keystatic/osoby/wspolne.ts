// Wspólne dla panelu osób: style pól i wysyłka z czytelnym błędem.
import type * as React from 'react'

export const pole: React.CSSProperties = { font: 'inherit', fontSize: 14, height: 30, padding: '0 8px', border: '1px solid #d1d5db', borderRadius: 7, background: 'transparent', color: 'inherit', minWidth: 0 }
export const btn: React.CSSProperties = { ...pole, cursor: 'pointer', background: 'var(--muted, #f2f0eb)' }

export async function wyslij(url: string, body: unknown, metoda = 'POST'): Promise<{ ok: boolean; status: number; j: Record<string, unknown> & { blad?: string } }> {
    const r = await fetch(url, { method: metoda, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const t = await r.text()
    let j: Record<string, unknown> = {}
    try { j = JSON.parse(t) } catch { j = { blad: r.status === 413 ? 'Plik za duży dla serwera (413) – trzeba zwiększyć client_max_body_size w nginx.' : r.status === 401 ? 'Brak hasła panelu (401) – odśwież stronę.' : `Błąd serwera ${r.status}` } }
    return { ok: r.ok, status: r.status, j }
}
