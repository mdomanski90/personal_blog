import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ignore from 'ignore'
import { komunikatUsuwanychPlikow, usuwanePlikiBezZastepstwa } from './straz-plikow'
import { KATALOG_PLIKOW } from '../pliki'

// odtworzenie 21.11: zapis materiału z odznaczonym „na głównej”, gdy Keystatic nie widział skanu
const zapisMandatu = {
    additions: [{ path: 'content/materialy/mandat-1750.mdoc' }],
    deletions: [{ path: 'pliki-archiwum/mandat-1750/file.jpg' }],
}

test('bezpiecznik: zapis pozycji, który kasuje jej plik bez następcy – odrzucony', () => {
    assert.deepEqual(usuwanePlikiBezZastepstwa(zapisMandatu), ['pliki-archiwum/mandat-1750/file.jpg'])
    assert.deepEqual(usuwanePlikiBezZastepstwa({
        additions: [{ path: 'content/obiekty/obj-kapliczka.yaml' }],
        deletions: [{ path: 'pliki-archiwum/obiekty/obj-kapliczka/zdjecia/0/zdjecie.jpg' }],
    }), ['pliki-archiwum/obiekty/obj-kapliczka/zdjecia/0/zdjecie.jpg'])
})

test('bezpiecznik: wymiana pliku i usunięcie całej pozycji – przepuszczone', () => {
    assert.deepEqual(usuwanePlikiBezZastepstwa({
        additions: [{ path: 'content/materialy/mandat-1750.mdoc' }, { path: 'pliki-archiwum/mandat-1750/file.png' }],
        deletions: [{ path: 'pliki-archiwum/mandat-1750/file.jpg' }],
    }), [])
    assert.deepEqual(usuwanePlikiBezZastepstwa({
        additions: [],
        deletions: [{ path: 'content/materialy/mandat-1750.mdoc' }, { path: 'pliki-archiwum/mandat-1750/file.jpg' }],
    }), [])
    assert.deepEqual(usuwanePlikiBezZastepstwa({
        additions: [],
        deletions: [{ path: 'content/obiekty/obj-kapliczka/index.yaml' }, { path: 'pliki-archiwum/obiekty/obj-kapliczka/a.jpg' }],
    }), [])
})

test('bezpiecznik: plik innej pozycji nie usprawiedliwia usunięcia; zwykłe zapisy treści bez zmian', () => {
    assert.equal(usuwanePlikiBezZastepstwa({
        additions: [{ path: 'pliki-archiwum/inny-material/file.jpg' }],
        deletions: [{ path: 'content/materialy/inny-material.mdoc' }, { path: 'pliki-archiwum/mandat-1750/file.jpg' }],
    }).length, 1)
    assert.deepEqual(usuwanePlikiBezZastepstwa({ additions: [{ path: 'content/posts/a.mdoc' }], deletions: [{ path: 'content/posts/b.mdoc' }] }), [])
    assert.match(komunikatUsuwanychPlikow(['pliki-archiwum/mandat-1750/file.jpg']), /Nic nie zmieniono/)
})

// Przyczyna 21.11: reguła „*” w pliki-archiwum/.gitignore (P7b-2) ukryła pliki przed Keystatic – czyta on pliki .gitignore
// tak jak tu: na każdym poziomie katalogów, z ukośnikiem na końcu katalogu (@keystatic/core, collectEntriesInDir).
// Pliki archiwum trzymamy poza gitem przez .git/info/exclude, którego Keystatic nie czyta.
test('Keystatic widzi pliki archiwum: żaden .gitignore w repozytorium ich nie ukrywa', () => {
    const korzen = process.cwd()
    const przyklady = [`${KATALOG_PLIKOW}/mandat-1750/file.jpg`, `${KATALOG_PLIKOW}/obiekty/obj-kapliczka/zdjecie.jpg`, `${KATALOG_PLIKOW}/strony/m/s-1.jpg`]
    for (const p of przyklady) {
        const cz = p.split('/')
        for (let poziom = 0; poziom < cz.length; poziom++) {
            const plik = path.join(korzen, ...cz.slice(0, poziom), '.gitignore')
            if (!fs.existsSync(plik)) continue
            const filtr = ignore().add(fs.readFileSync(plik, 'utf8')).createFilter()
            for (let i = poziom + 1; i <= cz.length; i++) {
                const wzgledna = cz.slice(poziom, i).join('/') + (i < cz.length ? '/' : '')
                assert.ok(filtr(wzgledna), `${path.relative(korzen, plik)} ukrywa przed Keystatic „${wzgledna}”`)
            }
        }
    }
})
