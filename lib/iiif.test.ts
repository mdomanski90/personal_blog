// P5 (PD-05): IIIF Presentation 3.0 – kształt manifestu i kolekcji, licencje. Dane syntetyczne.
import test from 'node:test'
import assert from 'node:assert/strict'
import { adresLicencji, kolekcjaZbioru, manifestMaterialu, KONTEKST_IIIF } from './iiif'

test('licencje: tekst „CC BY 4.0” i pokrewne → adres Creative Commons; inne – brak (zostają w metadanych)', () => {
    assert.equal(adresLicencji('CC BY 4.0'), 'http://creativecommons.org/licenses/by/4.0/')
    assert.equal(adresLicencji('CC BY-NC-SA 4.0'), 'http://creativecommons.org/licenses/by-nc-sa/4.0/')
    assert.equal(adresLicencji('CC0'), 'http://creativecommons.org/publicdomain/zero/1.0/')
    assert.equal(adresLicencji('https://creativecommons.org/licenses/by/4.0/'), 'http://creativecommons.org/licenses/by/4.0/')
    assert.equal(adresLicencji('domena publiczna'), 'http://creativecommons.org/publicdomain/mark/1.0/')
    assert.equal(adresLicencji('wszelkie prawa zastrzeżone'), null)
})

test('manifest: płótna z wymiarami i obrazem, objaśnienia jako adnotacje płótna, metadane bez pustych pól', () => {
    const m = manifestMaterialu('https://x.pl', { id: 'mat-00', nazwa: 'Dokument', czas: '1900', tworca: '', prawa: 'CC BY 4.0' }, [
        { obraz: 'https://x.pl/pliki/strony/mat-00/s-001.png', format: 'image/png', szer: 40, wys: 60, podpis: 'strona 1', objasnienia: [{ id: 'a1', type: 'Annotation' }] },
        { obraz: 'https://x.pl/pliki/strony/mat-00/s-002.png', format: 'image/png', szer: 40, wys: 60 },
    ])
    assert.equal(m['@context'], KONTEKST_IIIF)
    assert.equal(m.type, 'Manifest')
    assert.equal(m.id, 'https://x.pl/archiwum/mat-00/manifest.json')
    assert.equal(m.rights, 'http://creativecommons.org/licenses/by/4.0/')
    assert.deepEqual(m.metadata?.map((x) => x.label.pl[0]), ['czas', 'prawa'])
    assert.equal(m.items.length, 2)
    const p1 = m.items[0] as Record<string, unknown> & { items: { items: { body: { id: string; width: number }; target: string }[] }[]; annotations?: { items: unknown[] }[] }
    assert.deepEqual([p1.width, p1.height, (p1.label as { pl: string[] }).pl[0]], [40, 60, 'strona 1'])
    assert.equal(p1.items[0].items[0].body.id, 'https://x.pl/pliki/strony/mat-00/s-001.png')
    assert.equal(p1.items[0].items[0].target, p1.id)
    assert.equal(p1.annotations?.[0].items.length, 1)
    assert.ok(!('annotations' in m.items[1]), 'strona bez objaśnień – bez pustej listy adnotacji')
})

test('kolekcja zbioru: lista manifestów materiałów', () => {
    const k = kolekcjaZbioru('https://x.pl', { id: 'zb', nazwa: 'Zbiór' }, [{ id: 'mat-00', nazwa: 'Dokument' }])
    assert.equal(k.type, 'Collection')
    assert.deepEqual(k.items, [{ id: 'https://x.pl/archiwum/mat-00/manifest.json', type: 'Manifest', label: { pl: ['Dokument'] } }])
})
