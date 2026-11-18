// PK: wspólna rama panelu dla /keystatic – pulpit i strony panelu, Keystatic, osoby, edytory planów (integracja B, decyzja 18.11).
import './panel.css'
import RamaPanelu from './RamaPanelu'
import { liczbyPlanow, ustawieniaMenu } from '@/lib/panel/menu-serwer'

export const dynamic = 'force-dynamic'

// motyw Keystatic = motyw panelu jeszcze przed uruchomieniem Keystatic (czyta swój klucz tylko przy starcie)
const MOTYW_KS = "try{var t=localStorage.getItem('theme');var d=t==='dark'||(t!=='light'&&matchMedia('(prefers-color-scheme: dark)').matches);localStorage.setItem('keystatic-color-scheme',d?'dark':'light')}catch(e){}"

export default async function UkladKeystatic({ children }: { children: React.ReactNode }) {
    const [ustawienia, plany] = await Promise.all([ustawieniaMenu(), liczbyPlanow()])
    return (
        <>
            <script dangerouslySetInnerHTML={{ __html: MOTYW_KS }} />
            <RamaPanelu ustawienia={ustawienia} liczbyPlanow={plany}>{children}</RamaPanelu>
        </>
    )
}
