// PK: wspólna rama panelu dla /keystatic – pulpit i strony panelu, Keystatic, osoby, edytory planów (integracja B, decyzja 18.11).
import './panel.css'
import RamaPanelu from './RamaPanelu'
import { liczbyKolekcji, liczbyPlanow, ustawieniaMenu } from '@/lib/panel/menu-serwer'
import { LISTY } from '@/lib/panel/listy-konfig'
import { maRoleAdministratora, nazwaRoli, roleCodzienne } from '@/lib/konta/model'
import { rolaTeraz, widziTylkoJa, zalogowanyTeraz } from '@/lib/konta/straz'
import type { KontoRamy } from './MenuKonta'

export const dynamic = 'force-dynamic'

// motyw Keystatic = motyw panelu jeszcze przed uruchomieniem Keystatic (czyta swój klucz tylko przy starcie)
const MOTYW_KS = "try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);localStorage.setItem('keystatic-color-scheme',d?'dark':'light')}catch(e){}"

export default async function UkladKeystatic({ children }: { children: React.ReactNode }) {
    const z = await zalogowanyTeraz()
    // P7b (TER-01): konto tylko terenowe nie dostaje nic z reszty panelu – także liczników menu
    const tylkoTeren = !!z && !z.uprawnienia.has('panel')
    const [ustawienia, plany, kolekcje] = tylkoTeren ? [null, {} as Awaited<ReturnType<typeof liczbyPlanow>>, {}] : await Promise.all([ustawieniaMenu(), liczbyPlanow(widziTylkoJa(z)), liczbyKolekcji(Object.keys(LISTY), widziTylkoJa(z))]) // P7c (KON-08): liczniki bez „tylko ja”
    // P7a (KON-01): kto pracuje w panelu – do paska (imię, rola, przełącznik ról) i do menu filtrowanego uprawnieniami; bez kont: null
    const konto: KontoRamy | null = z ? { imie: z.konto.imie, rola: rolaTeraz(z), naCoDzien: roleCodzienne(z.konto).map((r) => nazwaRoli(z.role, r)).join(' + ') || null,
        administrator: z.administrator, administratorDo: z.sesja.adminDo ?? null, mozeAdministrator: maRoleAdministratora(z.konto), uprawnienia: [...z.uprawnienia] } : null
    return (
        <>
            <script dangerouslySetInnerHTML={{ __html: MOTYW_KS }} />
            <RamaPanelu ustawienia={ustawienia} liczbyPlanow={plany} liczbyKolekcji={kolekcje} konto={konto}>{children}</RamaPanelu>
        </>
    )
}
