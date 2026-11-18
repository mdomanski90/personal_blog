// Wspólne dla panelu osób: wysyłka z czytelnym błędem (style – app/keystatic/panel.css, PK).

export async function wyslij(url: string, body: unknown, metoda = 'POST'): Promise<{ ok: boolean; status: number; j: Record<string, unknown> & { blad?: string } }> {
    const r = await fetch(url, { method: metoda, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    const t = await r.text()
    let j: Record<string, unknown> = {}
    try { j = JSON.parse(t) } catch { j = { blad: r.status === 413 ? 'Plik za duży dla serwera (413) – trzeba zwiększyć client_max_body_size w nginx.' : r.status === 401 ? 'Brak hasła panelu (401) – odśwież stronę.' : `Błąd serwera ${r.status}` } }
    return { ok: r.ok, status: r.status, j }
}
