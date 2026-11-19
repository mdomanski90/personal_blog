'use client'
// P7b (TER-01): „nowe miejsce” – zdjęcie, położenie z telefonu, co to jest, nazwa, notatka (plansza „nowe miejsce”).
// Wpis trafia do skrzynki „z terenu” w panelu – widzi go tylko redakcja (decyzja 19.11).
// P7b-2 (TER-06): zapis przez kolejkę w telefonie – zdjęcia zmniejszone w telefonie, bez sieci wpis czeka; „najbliżej” liczone w telefonie.
import * as React from 'react'
import Link from 'next/link'
import { Camera, Images, LocateFixed } from 'lucide-react'
import { RODZAJE_TERENU, najblizszaMiejscowosc, opisBlisko } from '@/lib/teren/miejsca'
import { dodajDoKolejki, kolejka, kontoWTelefonie, miejscowosciZTelefonu, pobierz, przypiszKonto, wyslijKolejke, zmniejszZdjecie } from '../pamiec'
import { nowyId } from '../wspolne'

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
    const [zapisane, ustawZapisane] = React.useState<'' | 'wyslane' | 'czeka'>('')
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
        pobierz(`/api/keystatic/teren/gdzie?lat=${lat}&lon=${lon}`).then((r) => (r.ok ? r.json() : null)).then((j) => { if (zywy) ustawBlisko(j?.opis ?? '') })
            .catch(async () => {
                // bez sieci: ta sama funkcja na liście miejscowości pobranej razem z planem
                const b = najblizszaMiejscowosc(Number(lat), Number(lon), await miejscowosciZTelefonu().catch(() => []))
                if (zywy) ustawBlisko(b ? opisBlisko(b) : '')
            })
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
        try {
            let konto = await kontoWTelefonie()
            if (!konto) konto = await pobierz('/api/keystatic/teren').then((r) => (r.ok ? r.json() : null)).then(async (j) => { if (j?.konto) await przypiszKonto(j.konto); return j?.konto ?? null }).catch(() => null)
            if (!konto) { ustawKom('Najpierw otwórz listę planów z internetem – telefon musi wiedzieć, kto jest zalogowany.'); return }
            const pliki = await Promise.all(zdjecia.map((z) => zmniejszZdjecie(z.plik)))
            await dodajDoKolejki({ id, konto, czas: new Date().toISOString(), stan: 'czeka', rodzaj: 'miejsce', zdjec: pliki.length,
                pola: { rodzaj, nazwa: nazwa.trim(), notatka: notatka.trim(), ...(poz ? { lat: poz.lat, lon: poz.lon, dokl: Math.round(poz.dokl) } : {}) } }, pliki)
            const w = await wyslijKolejke()
            const teraz = (await kolejka()).find((p) => p.id === id)
            if (teraz?.stan === 'problem') { ustawKom(`Nie da się zapisać: ${teraz.blad} Wpis został w „do wysłania”.`); return }
            zdjecia.forEach((z) => URL.revokeObjectURL(z.adres))
            ustawZapisane(w.wyslane.has(id) ? 'wyslane' : 'czeka'); ustawKom('')
        } catch { ustawKom('Nie udało się zapisać w telefonie – spróbuj jeszcze raz.') } finally { ustawWTrakcie(false) }
    }
    const kolejne = () => { ustawId(nowyId()); ustawZdjecia([]); ustawNazwa(''); ustawNotatka(''); ustawZapisane(''); szukaj() }

    if (zapisane) return (
        <>
            <h1>zapisane</h1>
            <p className="pn-info pn-bez-marginesu" role="status"><span>{zapisane === 'wyslane'
                ? 'Miejsce trafiło do redakcji. Na stronie pojawi się dopiero po opracowaniu.'
                : 'Miejsce jest zapisane w telefonie. Wyślę je do redakcji po wznowieniu połączenia – zobaczysz je w „do wysłania”.'}</span></p>
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
