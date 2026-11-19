import type { Metadata } from 'next'
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { wczytajKregi } from '@/lib/kregi'
import { maRoleAdministratora, opisMozesz, maTeren } from '@/lib/konta/model'
import { urzadzenia } from '@/lib/konta/pocket-id'
import { konfiguracjaKont, rolaTeraz, zalogowanyTeraz } from '@/lib/konta/straz'
import Komunikat from '../components/Komunikat'
import { Czesc, Tabela, W } from '../components/Karta'
import { Strona, TytulStrony } from '../components/Uklad'

// P7a (KON-01): „moje konto” – imię, rola, co mogę, zakres, połączone urządzenia (plansza „moje konto”).
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'moje konto · odniepamieci.pl', robots: { index: false, follow: false } }

const dzien = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { day: '2-digit', month: '2-digit', timeZone: 'Europe/Warsaw' })

export default async function MojeKonto({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const z = await zalogowanyTeraz()
    if (!z) redirect('/zaloguj?wroc=%2Fmoje-konto')
    const sp = await searchParams
    const k = konfiguracjaKont()!
    const [kregi, urz] = await Promise.all([wczytajKregi(), urzadzenia(k, z.konto.id).catch(() => null)])
    const zakres = [...z.konto.zakres.kregi.map((id) => kregi.kregi.find((x) => x.id === id)?.nazwa ?? `krąg ${id}`), ...z.konto.zakres.miejsca]
    return (
        <Strona>
            <TytulStrony>moje konto</TytulStrony>
            {sp.panel === 'brak' && <Komunikat rodzaj="info">Twoje konto nie ma dostępu do panelu – służy do czytania treści „dla bliskich”.</Komunikat>}
            {sp.rola === 'bez-zmiany' && <Komunikat rodzaj="uwaga">Nie udało się przełączyć na administratora – potrzebne jest ponowne użycie klucza dostępu. Spróbuj jeszcze raz.</Komunikat>}
            <Tabela etykieta="moje konto">
                <Czesc tytul="konto" />
                <W e="imię">{z.konto.imie}</W>
                <W e="rola">{rolaTeraz(z)}{maRoleAdministratora(z.konto) && !z.administrator ? ' · administrator na żądanie (w panelu, menu pod imieniem)' : ''}</W>
                <W e="możesz">{opisMozesz(z.uprawnienia)}</W>
                <W e="zakres">{zakres.length ? zakres.join(', ') : 'wszystkie miejscowości'}</W>
                <Czesc tytul="urządzenia" />
                <W e="klucze dostępu">{urz === null ? 'nie udało się teraz odczytać listy' : urz.length ? urz.map((u) => `${u.nazwa} (od ${dzien(u.od)})`).join(' · ') : 'żadne urządzenie nie jest jeszcze połączone'}</W>
                <W e="dodaj">kolejne urządzenie: „zarządzaj kluczami” → „Dodaj klucz” albo poproś redakcję o nowy link do klucza</W>
            </Tabela>
            <div className="konto-rzad">
                {z.uprawnienia.has('panel') && <Link className="k-btn k-btn--glowny" href="/keystatic/panel" prefetch={false}>przejdź do panelu →</Link>}
                {/* P7b (TER-01): praca z telefonem – zdjęcia grobów, napisy, nowe miejsca */}
                {maTeren(z.uprawnienia) && <Link className={`k-btn${z.uprawnienia.has('panel') ? '' : ' k-btn--glowny'}`} href="/keystatic/teren" prefetch={false}>w terenie →</Link>}
                <a className="k-btn" href={`${k.adres}/settings/account`} target="_blank" rel="noopener">zarządzaj kluczami (konto.odniepamieci.pl)</a>
                <form method="post" action="/api/wyloguj"><input type="hidden" name="wroc" value="/" /><button type="submit" className="k-btn">wyloguj</button></form>
            </div>
        </Strona>
    )
}
