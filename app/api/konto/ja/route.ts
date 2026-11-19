import { maRoleAdministratora, opisMozesz, roleCodzienne, nazwaRoli } from '@/lib/konta/model'
import { kontaWlaczone, rolaTeraz, zalogowany } from '@/lib/konta/straz'

// P7a: kto jest zalogowany – dla nagłówka strony i paska panelu (imię, rola, przełącznik ról). Bez identyfikatorów i e-maila.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const naglowki = { 'Cache-Control': 'no-store' }
    const z = zalogowany(req)
    if (!z) return Response.json({ konta: kontaWlaczone(), zalogowany: false }, { headers: naglowki })
    return Response.json({
        konta: true, zalogowany: true, imie: z.konto.imie, rola: rolaTeraz(z),
        naCoDzien: roleCodzienne(z.konto).map((r) => nazwaRoli(z.role, r)).join(' + ') || null,
        administrator: z.administrator, administratorDo: z.sesja.adminDo ?? null, mozeAdministrator: maRoleAdministratora(z.konto),
        panel: z.uprawnienia.has('panel'), uprawnienia: [...z.uprawnienia], mozesz: opisMozesz(z.uprawnienia),
    }, { headers: naglowki })
}
