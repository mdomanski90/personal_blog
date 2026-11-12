import type { Metadata } from 'next'
import { poziomCzytelnika } from '@/lib/archiwum'
import { adresPowrotu, logowanieWlaczone } from '@/lib/sesja'
import { RAMKA, Strona, TytulStrony } from '../components/Uklad'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'zaloguj · odniepamieci.pl', robots: { index: false, follow: false } }

const BLEDY: Record<string, string> = {
    haslo: 'nieprawidłowe hasło.',
    limit: 'za dużo prób – spróbuj ponownie za kwadrans.',
    wylaczone: 'logowanie nie jest jeszcze włączone.',
}

export default async function Zaloguj({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const sp = await searchParams
    const wroc = adresPowrotu(sp.wroc)
    const zalogowany = (await poziomCzytelnika()) !== 'publiczne'
    const pole = { fontSize: 'calc(15px * var(--font-scale, 1))', minHeight: 'calc(32px * var(--font-scale, 1))', padding: '0 10px', borderRadius: 7 }
    return (
        <Strona>
            <TytulStrony>dla bliskich</TytulStrony>
            {zalogowany ? (
                <p>jesteś zalogowany – widzisz też materiały „dla bliskich”.</p>
            ) : (
                <form method="post" action="/api/zaloguj" className="flex flex-col" style={{ gap: 12, maxWidth: '24rem' }}>
                    <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>
                        część materiałów (np. o osobach żyjących) jest widoczna tylko dla rodziny i bliskich. hasło dostaniesz od autora strony.
                    </p>
                    {sp.blad && <p role="alert" style={{ color: '#b91c1c' }}>{BLEDY[sp.blad] ?? 'nie udało się zalogować.'}</p>}
                    {!logowanieWlaczone() && !sp.blad && <p className="text-gray-500">{BLEDY.wylaczone}</p>}
                    <input type="hidden" name="wroc" value={wroc} />
                    <label className="flex flex-col" style={{ gap: 4 }}>
                        <span className="lowercase text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>hasło</span>
                        <input type="password" name="haslo" required autoComplete="current-password" autoFocus className={`${RAMKA} bg-transparent text-current`} style={pole} />
                    </label>
                    <button type="submit" className={`${RAMKA} bg-muted w-fit cursor-pointer lowercase text-current`} style={pole}>zaloguj</button>
                </form>
            )}
        </Strona>
    )
}
