'use client'
import * as React from 'react'

type Stan = 'aktywne' | 'odlozone' | 'ignorowane'
type Uwaga = { id: string; kolekcja: string; rekord: string; tytul: string; regula: string; opis: string; wskazowka: string; edytuj: string; stan: Stan; notatka: string }
const API = '/api/keystatic/panel/jakosc'
const NAZWY: Record<string,string> = { miejsca: 'miejscowości', obiekty:'obiekty', parafie:'instytucje', materialy:'materiały archiwalne', ksiegi:'księgi', publikacje:'publikacje', zbiory:'zbiory', posts:'wpisy', tematy:'tematy', hasla:'słownik', zespoly:'zespoły', biogramy:'biogramy' }

export default function DoOpracowania() {
    const [lista, ustaw] = React.useState<Uwaga[]>([])
    const [blad, ustawBlad] = React.useState('')
    const [laduje, ustawLaduje] = React.useState(true)
    const [zapisuje, ustawZapisuje] = React.useState(false)
    const [filtr, ustawFiltr] = React.useState('aktywne')
    const [kolekcja, ustawKolekcje] = React.useState('')
    const [q, ustawQ] = React.useState('')
    const [id, ustawId] = React.useState('')
    const [notatka, ustawNotatke] = React.useState('')

    const odswiez = React.useCallback(async (keep = true) => {
        ustawBlad('')
        try {
            const r = await fetch(API, { cache: 'no-store' })
            if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'Brak dostępu do panelu. Sprawdź logowanie nginx.' : `Błąd serwera ${r.status}`)
            const j = await r.json() as Uwaga[]
            if (!Array.isArray(j)) throw new Error('Niepoprawna odpowiedź serwera')
            ustaw(j)
            if (!keep) ustawId('')
        } catch (e) { ustawBlad(e instanceof Error ? e.message : 'Nie udało się pobrać ostrzeżeń') }
        finally { ustawLaduje(false) }
    }, [])
    React.useEffect(() => { void odswiez() }, [odswiez])

    const aktywne = lista.filter(x => x.stan === 'aktywne').length
    const odlozone = lista.filter(x => x.stan === 'odlozone').length
    const ignorowane = lista.filter(x => x.stan === 'ignorowane').length
    const kolekcje = [...new Set(lista.map(x => x.kolekcja))].sort((a,b)=>a.localeCompare(b,'pl'))
    const wynik = lista.filter(x => (filtr==='wszystkie' || x.stan===filtr) && (!kolekcja || x.kolekcja===kolekcja) &&
        (!q.trim() || `${x.tytul} ${x.opis} ${x.kolekcja}`.toLocaleLowerCase('pl').includes(q.trim().toLocaleLowerCase('pl'))))
    const wybor = wynik.find(x=>x.id===id) ?? wynik[0]
    const pos = wybor ? wynik.findIndex(x=>x.id===wybor.id) : -1
    React.useEffect(() => { ustawNotatke(wybor?.notatka ?? '') }, [wybor?.id, wybor?.notatka])
    const przejdz = (i:number) => { if (wynik[i]) ustawId(wynik[i].id) }
    const zmien = async (stan: Stan) => {
        if (!wybor || zapisuje) return
        ustawZapisuje(true); ustawBlad('')
        const nastepny = wynik[pos+1]?.id ?? wynik[pos-1]?.id ?? ''
        try {
            const r = await fetch(API, { method:'POST', headers: {'Content-Type':'application/json'}, body:JSON.stringify({id:wybor.id,stan,notatka}) })
            const j = await r.json() as { blad?:string }
            if (!r.ok) throw new Error(j.blad || `Błąd ${r.status}`)
            ustawId(nastepny)
            await odswiez()
        } catch (e) { ustawBlad(e instanceof Error ? e.message : 'Błąd zapisu') }
        finally { ustawZapisuje(false) }
    }

    return <>
        <header className="pn-rzad" style={{justifyContent:'space-between',alignItems:'end'}}>
            <div><h1>do opracowania</h1><p className="pn-maly">Wskazówki do kontroli — puste pole nie zawsze jest błędem. Nic nie uzupełnia się automatycznie.</p></div>
            <button type="button" className="pn-btn" onClick={()=>void odswiez()} disabled={zapisuje}>⟳ sprawdź ponownie</button>
        </header>
        <section className="pn-kafle" aria-label="podsumowanie ostrzeżeń">
            <div className="pn-kafel"><span className="pn-liczba">{aktywne}</span><span>do sprawdzenia</span></div>
            <div className="pn-kafel"><span className="pn-liczba">{odlozone}</span><span>odłożone</span></div>
            <div className="pn-kafel"><span className="pn-liczba">{ignorowane}</span><span>ignorowane</span></div>
        </section>
        {blad && <p className="pn-kom" role="alert">{blad}</p>}
        {laduje ? <p className="pn-szary">wczytuję…</p> : <>
            <div className="pn-rzad" style={{alignItems:'end'}}>
                <label className="pn-maly">status<br/><select className="pn-in" value={filtr} onChange={e=>{ustawFiltr(e.target.value);ustawId('')}}>
                    <option value="aktywne">do sprawdzenia</option><option value="odlozone">odłożone</option><option value="ignorowane">ignorowane</option><option value="wszystkie">wszystkie</option>
                </select></label>
                <label className="pn-maly">dział<br/><select className="pn-in" value={kolekcja} onChange={e=>{ustawKolekcje(e.target.value);ustawId('')}}>
                    <option value="">wszystkie działy</option>{kolekcje.map(x=><option key={x} value={x}>{NAZWY[x]??x}</option>)}
                </select></label>
                <label className="pn-maly" style={{flex:'1 1 220px'}}>wyszukaj rekord<br/><input className="pn-in" type="search" value={q} onChange={e=>{ustawQ(e.target.value);ustawId('')}} style={{width:'100%'}} placeholder="tytuł, rodzaj braku…" /></label>
            </div>
            <div className="pn-siatka" style={{gridTemplateColumns:'minmax(220px, .9fr) minmax(300px, 1.2fr)',alignItems:'start'}}>
                <section className="pn-karta" aria-label="lista ostrzeżeń" style={{maxHeight:'min(70vh,750px)',overflowY:'auto'}}>
                    <div className="pn-rzad" style={{justifyContent:'space-between'}}><h2>kolejka</h2><span className="pn-szary">{wynik.length} pozycji</span></div>
                    {!wynik.length && <p className="pn-maly">Nie ma ostrzeżeń spełniających wybrane filtry.</p>}
                    <ol className="pn-lista">{wynik.map((x,i)=><li key={x.id} style={{padding:0}}>
                        <button type="button" onClick={()=>ustawId(x.id)} aria-current={wybor?.id===x.id?'true':undefined}
                            className="pn-zgl" style={{width:'100%',textAlign:'left',background:wybor?.id===x.id?'var(--wyb)':undefined}}>
                            <b style={{overflowWrap:'anywhere'}}>{i+1}. {x.tytul}</b>
                            <span className="pn-maly">{NAZWY[x.kolekcja]??x.kolekcja} · {x.opis}</span>
                        </button>
                    </li>)}</ol>
                </section>
                <section className="pn-karta" aria-label="szczegóły ostrzeżenia" style={{minHeight:310}}>
                    {wybor ? <>
                        <div className="pn-rzad" style={{justifyContent:'space-between'}}><span className="pn-etyk">{NAZWY[wybor.kolekcja]??wybor.kolekcja}</span><span className="pn-maly">{pos+1} z {wynik.length}</span></div>
                        <h2 style={{fontSize:19}}>{wybor.tytul}</h2>
                        <p style={{fontWeight:700,margin:0}}>{wybor.opis}</p>
                        <p className="pn-maly">{wybor.wskazowka}</p>
                        <a className="pn-btn pn-btn-gl" style={{alignSelf:'flex-start'}} href={wybor.edytuj} target="_blank" rel="noreferrer">otwórz rekord w Keystatic ↗</a>
                        <label className="pn-maly">notatka do decyzji (opcjonalnie)<br/>
                            <textarea className="pn-in" value={notatka} onChange={e=>ustawNotatke(e.target.value)} rows={3} maxLength={800} style={{width:'100%',marginTop:5}} placeholder="np. brak informacji w źródłach" /></label>
                        <div className="pn-rzad">
                            {wybor.stan!=='aktywne' && <button className="pn-btn" type="button" disabled={zapisuje} onClick={()=>void zmien('aktywne')}>przywróć do kolejki</button>}
                            {wybor.stan!=='odlozone' && <button className="pn-btn" type="button" disabled={zapisuje} onClick={()=>void zmien('odlozone')}>odłóż</button>}
                            {wybor.stan!=='ignorowane' && <button className="pn-btn" type="button" disabled={zapisuje} onClick={()=>void zmien('ignorowane')}>ignoruj trwale</button>}
                        </div>
                        <div className="pn-rzad" style={{justifyContent:'space-between',borderTop:'1px solid var(--linia)',paddingTop:10}}>
                            <button className="pn-btn" type="button" disabled={pos<=0} onClick={()=>przejdz(pos-1)}>← poprzednie</button>
                            <button className="pn-btn" type="button" disabled={pos>=wynik.length-1} onClick={()=>przejdz(pos+1)}>następne →</button>
                        </div>
                        <p className="pn-maly">Po zapisaniu poprawek w Keystatic kliknij „sprawdź ponownie”. Zniknie tylko ostrzeżenie, którego przyczyna została usunięta.</p>
                    </> : <p className="pn-maly">Brak wybranej pozycji.</p>}
                </section>
            </div>
        </>}
    </>
}
