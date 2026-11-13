'use client'
// Wspólne dla stron panelu: style, formatowanie, odczyt API z czytelnym błędem.
import * as React from 'react'

export const CSS = `
body:has(.pn){margin:0}
.pn{--tlo:#fbfaf7;--tlo2:#f7f5ef;--karta:#fff;--linia:#e3dfd5;--linia2:#ece8de;--tekst:#1c1b19;--szary:#5f5b53;--akcent:#7a5c22;--ostrz:#b45309;--ostrz-tlo:#fbeee2;--ostrz-linia:#f1d2b5;--ostrz-tekst:#7c3a06;--wyb:#ebe6da;--hover:#f1eee6;--pasek:#ece8de;
  font-family:var(--font-jetbrains),ui-monospace,monospace;color:var(--tekst);background:var(--tlo);min-height:100vh;display:flex;flex-wrap:wrap;align-items:stretch;font-size:13px}
.dark .pn{--tlo:#15171a;--tlo2:#1a1d21;--karta:#1e2126;--linia:#33373e;--linia2:#2a2e34;--tekst:#e8e6e1;--szary:#a3a09a;--akcent:#d9b878;--ostrz:#f0a35e;--ostrz-tlo:#3a2a1c;--ostrz-linia:#5c3f24;--ostrz-tekst:#f6c79a;--wyb:#2c3036;--hover:#252930;--pasek:#2c3036}
.pn a{color:inherit}
.pn a:hover{color:var(--akcent)}
.pn-bok{flex:1 1 220px;max-width:100%;box-sizing:border-box;padding:20px 12px;border-right:1px solid var(--linia);display:flex;flex-direction:column;gap:16px;background:var(--tlo2)}
.pn-nav{display:flex;flex-direction:column;gap:2px}
.pn-nav a{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 10px;border-radius:7px;text-decoration:none;color:var(--tekst)}
.pn-nav a:hover{background:var(--hover);color:var(--tekst)}
.pn-nav a[aria-current=page]{background:var(--wyb);font-weight:700}
.pn-licznik{background:var(--ostrz);color:#fff;border-radius:9px;padding:1px 7px;font-size:11px;font-weight:400}
.dark .pn-licznik{color:#15171a}
.pn-glowna{flex:999 1 560px;min-width:0;box-sizing:border-box;padding:26px 32px 48px;display:flex;flex-direction:column;gap:24px;max-width:1220px}
.pn h1{margin:0;font-size:24px}
.pn h2{margin:0;font-size:15px}
.pn-etyk{font-size:11px;letter-spacing:.08em;text-transform:uppercase;color:var(--szary);margin:0;font-weight:400}
.pn-szary{color:var(--szary)}
.pn-maly{font-size:11.5px;color:var(--szary);line-height:1.5}
.pn-karta{background:var(--karta);border:1px solid var(--linia);border-radius:8px;padding:16px;display:flex;flex-direction:column;gap:12px;min-width:0}
.pn-siatka{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,370px),1fr));gap:16px;align-items:start}
.pn-kafle{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px}
.pn-kafel{background:var(--karta);border:1px solid var(--linia);border-radius:8px;padding:16px;text-decoration:none;display:flex;flex-direction:column;gap:5px}
.pn-kafel:hover{border-color:var(--szary)}
.pn-liczba{font-size:26px;font-weight:700;line-height:1.1}
.pn-btn{display:inline-flex;align-items:center;justify-content:center;gap:6px;min-height:32px;padding:0 12px;border:1px solid var(--linia);border-radius:7px;background:var(--karta);color:var(--tekst);font:inherit;font-size:12.5px;text-decoration:none;cursor:pointer;white-space:nowrap;box-sizing:border-box}
.pn-btn:hover{background:var(--hover);color:var(--tekst)}
.pn-btn:disabled{opacity:.5;cursor:default}
.pn .pn-btn-gl,.pn a.pn-btn-gl{background:var(--tekst);color:var(--tlo);border-color:var(--tekst)}
.pn .pn-btn-gl:hover,.pn a.pn-btn-gl:hover{background:var(--tekst);color:var(--tlo);opacity:.9}
.pn-rzad{display:flex;flex-wrap:wrap;gap:8px;align-items:center}
.pn-in{min-height:34px;box-sizing:border-box;border:1px solid var(--linia);border-radius:7px;padding:0 10px;font:inherit;font-size:13px;background:var(--karta);color:var(--tekst)}
textarea.pn-in{padding:8px 10px;resize:vertical;line-height:1.5}
.pn-pasek{height:6px;border-radius:3px;background:var(--pasek);overflow:hidden}
.pn-pasek>div{height:100%;background:var(--tekst)}
.pn-lista{list-style:none;margin:0;padding:0;display:flex;flex-direction:column}
.pn-lista>li{display:flex;justify-content:space-between;gap:10px;padding:8px 0;border-bottom:1px solid var(--linia2);font-size:12.5px}
.pn-lista>li:last-child{border-bottom:0}
.pn-ostrz{padding:8px 12px;border-radius:7px;background:var(--ostrz-tlo);color:var(--ostrz-tekst);border:1px solid var(--ostrz-linia);text-decoration:none;font-size:12.5px}
.pn-info{padding:8px 12px;border-radius:7px;background:var(--hover);border:1px solid var(--linia);text-decoration:none;font-size:12.5px}
.pn-kom{padding:8px 12px;border-radius:7px;background:var(--ostrz-tlo);color:var(--ostrz-tekst);font-size:12.5px}
.pn-seg{display:inline-flex;flex-wrap:wrap;border:1px solid var(--linia);border-radius:7px;overflow:hidden}
.pn-seg button{min-height:30px;padding:0 12px;border:0;border-right:1px solid var(--linia);background:var(--karta);font:inherit;font-size:12.5px;color:var(--tekst);cursor:pointer}
.pn-seg button:last-child{border-right:0}
.pn-seg button[aria-pressed=true]{background:var(--tekst);color:var(--tlo)}
.pn-tag{font-size:11px;padding:2px 7px;border-radius:5px;border:1px solid var(--linia);white-space:nowrap}
.pn-dl{display:grid;grid-template-columns:minmax(120px,170px) minmax(0,1fr);gap:7px 12px;font-size:12.5px;margin:0}
.pn-dl dt{color:var(--szary)}
.pn-dl dd{margin:0;min-width:0;overflow-wrap:anywhere}
.pn-szukaj{position:relative;flex:0 1 400px;min-width:min(100%,240px)}
.pn-wyniki{position:absolute;z-index:5;left:0;right:0;top:calc(100% + 4px);background:var(--karta);border:1px solid var(--linia);border-radius:8px;box-shadow:0 6px 24px rgb(0 0 0/.12);overflow:hidden;max-height:60vh;overflow-y:auto}
.pn-wyniki a{display:flex;justify-content:space-between;gap:10px;padding:8px 12px;text-decoration:none;border-bottom:1px solid var(--linia2)}
.pn-wyniki a:hover,.pn-wyniki a[data-akt=true]{background:var(--hover);color:var(--tekst)}
.pn-zgl{display:flex;flex-direction:column;gap:6px;padding:12px 14px;border:0;border-bottom:1px solid var(--linia2);text-align:left;background:var(--karta);font:inherit;color:inherit;cursor:pointer;width:100%}
.pn-zgl:hover{background:var(--hover)}
.pn-zgl[aria-current=true]{background:var(--wyb);box-shadow:inset 3px 0 0 var(--tekst)}
@media (max-width:820px){.pn-bok{border-right:0;border-bottom:1px solid var(--linia);padding:12px;gap:8px}.pn-nav{flex-direction:row;overflow-x:auto;gap:4px}.pn-nav a{white-space:nowrap}.pn-bok-dol,.pn-bok-podpis{display:none}.pn-glowna{padding:18px 16px 40px}}
@media (pointer:coarse){.pn-btn,.pn-seg button,.pn-in{min-height:42px}}
`

export function kiedy(iso: string | null | undefined): string {
    if (!iso) return '—'
    const t = Date.parse(iso)
    if (!Number.isFinite(t)) return '—'
    const s = (Date.now() - t) / 1000
    if (s < 60) return 'przed chwilą'
    if (s < 3600) return `${Math.floor(s / 60)} min temu`
    const d = new Date(t), dzis = new Date()
    if (d.toDateString() === dzis.toDateString()) return `dziś ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
    const wczoraj = new Date(Date.now() - 864e5)
    if (d.toDateString() === wczoraj.toDateString()) return `wczoraj ${d.toLocaleTimeString('pl-PL', { hour: '2-digit', minute: '2-digit' })}`
    return d.toLocaleDateString('pl-PL', { day: 'numeric', month: 'short', year: d.getFullYear() === dzis.getFullYear() ? undefined : 'numeric' })
}

export function bajty(n: number): string {
    if (n < 1024) return `${n} B`
    const j = ['kB', 'MB', 'GB', 'TB']
    let i = -1
    do { n /= 1024; i++ } while (n >= 1024 && i < j.length - 1)
    return `${n.toFixed(n < 10 ? 1 : 0)} ${j[i]}`
}

export function odmiana(n: number, f: [string, string, string]): string {
    const d = n % 10, s = n % 100
    return `${n} ${n === 1 ? f[0] : d >= 2 && d <= 4 && (s < 12 || s > 14) ? f[1] : f[2]}`
}

/** Odczyt API panelu; 401/403 → komunikat o haśle panelu. */
export function useDane<T>(url: string): { dane: T | null; blad: string; odswiez: () => void } {
    const [dane, ustaw] = React.useState<T | null>(null)
    const [blad, ustawBlad] = React.useState('')
    const [n, ustawN] = React.useState(0)
    React.useEffect(() => {
        let zywy = true
        fetch(url, { cache: 'no-store' })
            .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
            .then((j) => { if (zywy) { ustaw(j); ustawBlad('') } })
            .catch((s) => { if (zywy) ustawBlad(s === 401 || s === 403 ? 'Brak dostępu – panel działa tylko za hasłem panelu. Odśwież stronę.' : 'Nie udało się wczytać danych panelu.') })
        return () => { zywy = false }
    }, [url, n])
    return { dane, blad, odswiez: () => ustawN((x) => x + 1) }
}

export async function wyslijJson(url: string, metoda: string, body?: unknown): Promise<string | null> {
    const r = await fetch(url, { method: metoda, headers: body ? { 'Content-Type': 'application/json' } : undefined, body: body ? JSON.stringify(body) : undefined }).catch(() => null)
    if (!r) return 'Brak połączenia z serwerem.'
    if (r.ok) return null
    const j = await r.json().catch(() => ({}))
    return (j as { blad?: string }).blad ?? (r.status === 401 ? 'Brak hasła panelu – odśwież stronę.' : `Błąd serwera ${r.status}`)
}
