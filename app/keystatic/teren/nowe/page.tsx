'use client'
// P7b (TER-01): „nowe miejsce” – zdjęcie, położenie z telefonu, co to jest, nazwa, notatka (plansza „nowe miejsce”).
// Wpis trafia do skrzynki „z terenu” w panelu – widzi go tylko redakcja (decyzja 19.11).
import * as React from 'react'
import Link from 'next/link'
import { Camera, Images, LocateFixed } from 'lucide-react'
import { RODZAJE_TERENU } from '@/lib/teren/miejsca'
import { BRAK_SIECI, nowyId } from '../wspolne'

type Polozenie = { lat: number; lon: number; dokl: number }

export default function NoweMiejsce() {
    const [id, ustawId] = React.useState('')
    const [zdjecia, ustawZdjecia] = React.useState<{ plik: File; adres: string }[]>([])
    const [poz, ustawPoz] = React.useState<Polozenie | null>(null)
    const [stanPoz, ustawStanPoz] = React.useState<'szukam' | 'jest' | 'brak'>('szukam')
    const [blisko, ustawBlisko] = React.useState('')
    const [rodzaj, ustawRodzaj] = React.useState('krzyz')
    const [nazwa, ustawNazwa] = React.useState('')
    const [notatka, ustawNotatka] = React.useState('')
    const [kom, ustawKom] = React.useState('')
    const [wTrakcie, ustawWTrakcie] = React.useState(false)
    const [zapisane, ustawZapisane] = React.useState(false)
    React.useEffect(() => ustawId(nowyId()), [])

    // położenie: przez 20 s zbieramy odczyty i zostawiamy najdokładniejszy
    const szukaj = React.useCallback(() => {
        if (!('geolocation' in navigator)) { ustawStanPoz('brak'); return () => {} }
        ustawStanPoz('szukam')
        let najlepszy: Polozenie | null = null
        const w = navigator.geolocation.watchPosition(
            (p) => { const n = { lat: p.coords.latitude, lon: p.coords.longitude, dokl: p.coords.accuracy }; if (!najlepszy || n.dokl < najlepszy.dokl) { najlepszy = n; ustawPoz(n); ustawStanPoz('jest') } },
            () => { if (!najlepszy) ustawStanPoz('brak') },
            { enableHighAccuracy: true, maximumAge: 0 })
        const t = window.setTimeout(() => navigator.geolocation.clearWatch(w), 20000)
        return () => { window.clearTimeout(t); navigator.geolocation.clearWatch(w) }
    }, [])
    React.useEffect(() => szukaj(), [szukaj])
    const lat = poz?.lat.toFixed(4), lon = poz?.lon.toFixed(4)
    React.useEffect(() => {
        if (!lat || !lon) return
        let zywy = true
        fetch(`/api/keystatic/teren/gdzie?lat=${lat}&lon=${lon}`).then((r) => (r.ok ? r.json() : null)).then((j) => { if (zywy) ustawBlisko(j?.opis ?? '') }).catch(() => {})
        return () => { zywy = false }
    }, [lat, lon])

    const dodaj = (L: FileList | null) => {
        if (!L?.length) return
        // kopia od razu: lista plików pola jest „żywa” i pustoszeje, gdy zaraz potem czyścimy pole
        const nowe = [...L].map((plik) => ({ plik, adres: URL.createObjectURL(plik) }))
        ustawZdjecia((z) => [...z, ...nowe].slice(0, 6))
    }
    const usun = (adres: string) => { URL.revokeObjectURL(adres); ustawZdjecia((z) => z.filter((x) => x.adres !== adres)) }

    const zapisz = async (ev: React.FormEvent) => {
        ev.preventDefault()
        if (!zdjecia.length && !nazwa.trim()) { ustawKom('Dodaj zdjęcie albo wpisz nazwę.'); return }
        ustawWTrakcie(true); ustawKom('zapisuję…')
        const fd = new FormData()
        fd.append('id', id); fd.append('rodzaj', rodzaj); fd.append('nazwa', nazwa); fd.append('notatka', notatka)
        if (poz) { fd.append('lat', String(poz.lat)); fd.append('lon', String(poz.lon)); fd.append('dokl', String(Math.round(poz.dokl))) }
        for (const z of zdjecia) fd.append('zdjecie', z.plik)
        try {
            const r = await fetch('/api/keystatic/teren/miejsca', { method: 'POST', body: fd })
            const j = await r.json().catch(() => null)
            if (!r.ok) { ustawKom(j?.blad ?? BRAK_SIECI); return }
            zdjecia.forEach((z) => URL.revokeObjectURL(z.adres))
            ustawZapisane(true); ustawKom('')
        } catch { ustawKom(BRAK_SIECI) } finally { ustawWTrakcie(false) }
    }
    const kolejne = () => { ustawId(nowyId()); ustawZdjecia([]); ustawNazwa(''); ustawNotatka(''); ustawZapisane(false); szukaj() }

    if (zapisane) return (
        <>
            <h1>zapisane</h1>
            <p className="pn-info pn-bez-marginesu" role="status"><span>Miejsce trafiło do redakcji. Na stronie pojawi się dopiero po opracowaniu.</span></p>
            <div className="pn-rzad">
                <button type="button" className="pn-btn pn-btn-gl" onClick={kolejne}>+ kolejne miejsce</button>
                <Link className="pn-btn" href="/keystatic/teren">wróć do planów</Link>
            </div>
        </>
    )
    return (
        <form className="pn-kol pn-kol-12" onSubmit={zapisz}>
            <h1>nowe miejsce</h1>
            <section className="pn-karta tr-karta" aria-labelledby="nm-zdj">
                <h2 id="nm-zdj">zdjęcie</h2>
                {zdjecia.length > 0 && (
                    <div className="tr-zdjecia">
                        {zdjecia.map((z, i) => (
                            <div key={z.adres} className="tr-zdjecie">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={z.adres} alt={`zdjęcie ${i + 1}`} />
                                <button type="button" aria-label={`usuń zdjęcie ${i + 1}`} onClick={() => usun(z.adres)}>×</button>
                            </div>
                        ))}
                    </div>
                )}
                <div className="pn-rzad">
                    <label className="pn-btn"><Camera aria-hidden />zrób zdjęcie<input className="tr-ukryty" type="file" accept="image/*" capture="environment" onChange={(e) => { dodaj(e.target.files); e.target.value = '' }} /></label>
                    <label className="pn-btn"><Images aria-hidden />z galerii<input className="tr-ukryty" type="file" accept="image/*" multiple onChange={(e) => { dodaj(e.target.files); e.target.value = '' }} /></label>
                </div>
            </section>
            <section className="pn-karta tr-karta" aria-labelledby="nm-poz">
                <h2 id="nm-poz">położenie</h2>
                <p role="status">
                    {stanPoz === 'szukam' && !poz && 'szukam położenia…'}
                    {poz && <>dokładność ±{Math.round(poz.dokl)} m{blisko && <> · najbliżej: <b>{blisko}</b></>}</>}
                    {stanPoz === 'brak' && !poz && 'Nie udało się odczytać położenia – miejsce można zapisać bez niego, opisz je wtedy w notatce.'}
                </p>
                <span className="pn-maly">Położenie odczytane z telefonu. Nie jest pokazywane na stronie – widzi je tylko redakcja.</span>
                <div className="pn-rzad"><button type="button" className="pn-btn" onClick={() => szukaj()}><LocateFixed aria-hidden />odczytaj ponownie</button></div>
            </section>
            <section className="pn-karta tr-karta" aria-label="opis">
                <label className="tr-pole">co to jest
                    <select className="pn-in" value={rodzaj} onChange={(e) => ustawRodzaj(e.target.value)}>{RODZAJE_TERENU.map(([k, n]) => <option key={k} value={k}>{n}</option>)}</select>
                </label>
                <label className="tr-pole">nazwa (jeśli znasz)
                    <input className="pn-in" value={nazwa} maxLength={120} onChange={(e) => ustawNazwa(e.target.value)} />
                </label>
                <label className="tr-pole">notatka
                    <textarea className="pn-in" rows={4} maxLength={2000} value={notatka} onChange={(e) => ustawNotatka(e.target.value)} />
                </label>
                <span className="pn-maly">Miejsce trafi do redakcji i będzie widoczne tylko dla niej. Na stronie pojawi się dopiero po opracowaniu.</span>
            </section>
            {kom && <div className="tr-kom" role="status">{kom}</div>}
            <div className="pn-rzad">
                <button type="submit" className="pn-btn pn-btn-gl" disabled={wTrakcie || !id}>zapisz</button>
                <Link className="pn-btn" href="/keystatic/teren">anuluj</Link>
            </div>
        </form>
    )
}
