import { brakDostepu } from '@/lib/plany/dane'
import { parafie } from '@/lib/archiwum'
import { odczytajImport, podgladImportu, zapiszImport } from '@/lib/panel/import-ksiegi'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

// Dostępne tylko za hasłem panelu; żadne dane importu nie trafiają na publiczne strony.
export async function GET(req: Request) {
    const blad = brakDostepu(req)
    if (blad) return blad
    return Response.json({ parafie: (await parafie()).map((p) => ({ id: p.id, nazwa: p.nazwa, wyznanie: p.wyznanie })) }, { headers: { 'Cache-Control': 'no-store' } })
}

export async function POST(req: Request) {
    const blad = brakDostepu(req)
    if (blad) return blad
    try {
        const dane = await req.formData()
        const akcja = dane.get('akcja')
        if (akcja !== 'podglad' && akcja !== 'zapisz') return Response.json({ blad: 'Nieznana akcja.' }, { status: 400 })
        const importowany = await odczytajImport(dane)
        if (akcja === 'podglad') return Response.json(await podgladImportu(importowany), { headers: { 'Cache-Control': 'no-store' } })
        const tryb = dane.get('tryb')
        if (tryb !== 'pomin' && tryb !== 'dopelnij') return Response.json({ blad: 'Nieznany tryb importu.' }, { status: 400 })
        const widocznosc = dane.get('widocznosc')
        if (widocznosc !== 'ja' && widocznosc !== 'bliscy' && widocznosc !== 'publiczne')
            return Response.json({ blad: 'Nieprawidłowa widoczność importu.' }, { status: 400 })
        const zmienIstniejace = dane.get('zmienIstniejace') === 'tak'
        const potwierdzPublikacje = dane.get('potwierdzPublikacje') === 'tak'
        if (widocznosc === 'publiczne' && !potwierdzPublikacje)
            return Response.json({ blad: 'Zaznacz potwierdzenie publicznej widoczności całej importowanej grupy.' }, { status: 400 })
        return Response.json(await zapiszImport(
            importowany, tryb, dane.get('potwierdzDuplikaty') === 'tak',
            widocznosc, zmienIstniejace, potwierdzPublikacje,
        ), { headers: { 'Cache-Control': 'no-store' } })
    } catch (e) {
        console.error('import ksiąg:', e)
        const opis = e instanceof Error ? e.message : 'Błąd odczytu lub zapisu.'
        return Response.json({ blad: opis }, { status: 400, headers: { 'Cache-Control': 'no-store' } })
    }
}
