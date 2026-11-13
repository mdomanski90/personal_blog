import { test } from 'node:test'
import assert from 'node:assert/strict'
import { dataGedcomNaEdtf, edtfNaGedcom, eksportujGedcom, importujGedcom, parsujGedcom } from './gedcom'
import { chrzestniZOpisu, czyZyje, rdzenNazwiska, indeksRelacji, obrzadekZTekstu, ostrzezenia, szacowaneLata, adresAncestry } from './model'

// Sztuczne drzewo o budowie eksportu Ancestry (osoby zmyślone).
const PLIK = `0 HEAD
1 SOUR Ancestry.com Family Trees
2 VERS 2025.08
1 GEDC
2 VERS 5.5.1
1 CHAR UTF-8
0 @I1@ INDI
1 NAME Jan /Testowy/
2 GIVN Jan
2 SURN Testowy
1 SEX M
1 BIRT
2 DATE 3 Mar 1860
2 PLAC Olszanka, Lubelskie, Poland
1 CHR
2 DATE 5 Mar 1860
2 PLAC Olszanka
2 NOTE Paten/Godparents: Anna Przykładowa Wzorcowa, Piotr Wzorcowy
2 SOUR @S1@
3 PAGE Księga urodzeń 1860, akt 12
3 _APID 1,1480::48528
1 DEAT
2 DATE Abt 1921
2 PLAC Bejdy, Poland
1 MARR
2 DATE 1884
2 PLAC Olszanka
1 FAMS @F1@
1 FAMC @F0@
1 _MTTAG @T9@
0 @I2@ INDI
1 NAME Maria /Nowa/
1 SEX F
1 BIRT
2 DATE Aft. 1862
1 CHR unicki
2 DATE 1863
1 FAMS @F1@
0 @I3@ INDI
1 NAME Zofia (42 cM) /Testowa/
1 SEX F
1 BIRT
2 DATE 1990
1 FAMC @F1@
0 @I4@ INDI
1 NAME Anna /Przykładowa Wzorcowa/
1 SEX F
1 BIRT
2 DATE 1835
1 DEAT
2 DATE 1900
0 @I5@ INDI
1 NAME Piotr /Wzorcowy/
1 SEX M
1 BIRT
2 DATE Bet 1830 and 1835
1 EVEN
2 TYPE Departure
2 DATE Dec 1899
2 NOTE Wyjechał do Ameryki. Statek z Hamburga, długa
3 CONC  podróż.
0 @F1@ FAM
1 HUSB @I1@
1 WIFE @I2@
1 CHIL @I3@
1 MARR
2 DATE 1884
2 PLAC Olszanka
2 NOTE rzymskokatolicki
0 @S1@ SOUR
1 TITL Księgi metrykalne parafii Olszanka
1 AUTH Parafia
1 _APID 1,1480::0
0 @O1@ OBJE
1 FILE
2 TITL skan aktu
0 @T9@ _MTTAG
1 NAME DNA Connection
0 TRLR
`
const MIEJSCA = [
    { id: 'olszanka', nazwa: 'Olszanka', inneNazwy: [] },
    { id: 'bejdy', nazwa: 'Bejdy', inneNazwy: ['Bejdy Wielkie'] },
]

test('daty GEDCOM → EDTF i z powrotem', () => {
    assert.equal(dataGedcomNaEdtf('2 Dec 1939'), '1939-12-02')
    assert.equal(dataGedcomNaEdtf('Dec 1939'), '1939-12')
    assert.equal(dataGedcomNaEdtf('1886'), '1886')
    assert.equal(dataGedcomNaEdtf('Abt 1981'), '1981~')
    assert.equal(dataGedcomNaEdtf('Aft. 1862'), '1862/..')
    assert.equal(dataGedcomNaEdtf('BEF 1900'), '../1900')
    assert.equal(dataGedcomNaEdtf('Bet 1880 and 1885'), '1880/1885')
    assert.equal(dataGedcomNaEdtf('12.05.1870'), '1870-05-12')
    assert.equal(dataGedcomNaEdtf('wiosną'), null)
    assert.equal(edtfNaGedcom('1939-12-02'), '2 DEC 1939')
    assert.equal(edtfNaGedcom('1981~'), 'ABT 1981')
    assert.equal(edtfNaGedcom('1880/1885'), 'BET 1880 AND 1885')
    assert.equal(edtfNaGedcom('../1900'), 'BEF 1900')
})

test('notatki z CONC/CONT', () => {
    const r = parsujGedcom(PLIK)
    const p = r.find((x) => x.xref === '@I5@')!
    const ev = p.dzieci.find((x) => x.tag === 'EVEN')!
    assert.equal(ev.dzieci.find((x) => x.tag === 'NOTE')!.wartosc, 'Wyjechał do Ameryki. Statek z Hamburga, długa podróż.')
})

test('chrzestni i obrządek z opisu', () => {
    assert.deepEqual(chrzestniZOpisu('Paten/Godparents: Krystyna Bogucka Węgrzyniak, Stanisław Kokoszkiewicz').chrzestni, ['Krystyna Bogucka Węgrzyniak', 'Stanisław Kokoszkiewicz'])
    assert.deepEqual(chrzestniZOpisu('Chrzestni: Jan Nowak i Maria Kos; akt 5').chrzestni, ['Jan Nowak', 'Maria Kos'])
    assert.equal(chrzestniZOpisu('Chrzestni: Jan Nowak i Maria Kos; akt 5').reszta, 'akt 5')
    assert.equal(obrzadekZTekstu('gr.-kat.'), 'unicki')
    assert.equal(obrzadekZTekstu('obrządek greckokatolicki'), 'unicki')
    assert.equal(obrzadekZTekstu('Rzymskokatolicki'), 'rzymskokatolicki')
    assert.equal(obrzadekZTekstu('parafia prawosławna'), 'prawoslawny')
    assert.equal(obrzadekZTekstu('żydowski'), 'mojzeszowy')
    assert.equal(obrzadekZTekstu('United States'), undefined)
    assert.equal(rdzenNazwiska('Kowalska'), rdzenNazwiska('Kowalski'))
    assert.equal(rdzenNazwiska('Wzorcowa'), rdzenNazwiska('Wzorcowy'))
    assert.equal(rdzenNazwiska('Nowacka'), rdzenNazwiska('Nowacki'))
    assert.notEqual(rdzenNazwiska('Nowak'), rdzenNazwiska('Nowacki'))
})

test('import: osoby, rodziny, chrzestni, miejsca, śluby bez powtórzeń', () => {
    const { drzewo: d, podsumowanie: p } = importujGedcom(PLIK, MIEJSCA)
    assert.equal(p.osoby, 5)
    assert.equal(p.rodziny, 1)
    const jan = [...d.osoby.values()].find((o) => o.imiona === 'Jan')!
    assert.equal(jan.id, 'jan-testowy-1860')
    const chrzest = jan.zdarzenia.find((z) => z.rodzaj === 'chrzest')!
    assert.equal(chrzest.data, '1860-03-05')
    assert.equal(chrzest.miejsceId, 'olszanka')
    assert.equal(chrzest.chrzestni?.length, 2)
    assert.equal(chrzest.chrzestni![0].osoba, 'anna-przykladowa-wzorcowa-1835')
    assert.equal(chrzest.chrzestni![1].osoba, 'piotr-wzorcowy-1830') // rok z przedziału „Bet 1830 and 1835” → 1830
    assert.equal(chrzest.cytaty?.[0].apid, '1480::48528')
    assert.equal(chrzest.cytaty?.[0].strona, 'Księga urodzeń 1860, akt 12')
    assert.equal(jan.zdarzenia.find((z) => z.rodzaj === 'zgon')!.miejsceId, 'bejdy')
    assert.deepEqual(jan.znaczniki, ['DNA Connection'])
    // ślub przy osobie scalony z rodziną
    const f = [...d.rodziny.values()][0]
    assert.equal(f.zdarzenia.filter((z) => z.rodzaj === 'slub').length, 1)
    assert.equal(f.zdarzenia[0].obrzadek, 'rzymskokatolicki')
    assert.equal(jan.zdarzenia.some((z) => z.rodzaj === 'slub'), false)
    assert.equal(p.slubyScalone, 1)
    // chrzest z wartością w linii (opis Ancestry) → obrządek
    const maria = [...d.osoby.values()].find((o) => o.imiona === 'Maria')!
    assert.equal(maria.zdarzenia.find((z) => z.rodzaj === 'chrzest')!.obrzadek, 'unicki')
    // imię z dopiskiem
    assert.equal(p.imionaZDopiskami, 1)
    const zofia = [...d.osoby.values()].find((o) => o.nazwisko === 'Testowa')!
    assert.ok(zofia.uwagi?.[0].includes('dopiskiem'))
    // zdarzenie własne z nazwą
    const piotr = [...d.osoby.values()].find((o) => o.imiona === 'Piotr')!
    assert.equal(piotr.zdarzenia[1].nazwa, 'Departure')
    assert.equal(piotr.zdarzenia[1].data, '1899-12')
    assert.equal(p.miejscaNiedopasowane.length, 0)
})

test('żyjący i ostrzeżenia', () => {
    const { drzewo: d } = importujGedcom(PLIK, MIEJSCA)
    const lata = szacowaneLata(d)
    const zofia = [...d.osoby.values()].find((o) => o.nazwisko === 'Testowa')!
    const jan = [...d.osoby.values()].find((o) => o.imiona === 'Jan')!
    assert.equal(czyZyje(zofia, lata.get(zofia.id), 2026), true)
    assert.equal(czyZyje(jan, lata.get(jan.id), 2026), false)
    const w = ostrzezenia(d, indeksRelacji(d))
    assert.ok(w.some((x) => x.osoba === zofia.id && x.tekst.includes('matka')))
})

test('eksport GEDCOM: żyjący ukryci, chrzestni w opisie, ponowny import daje to samo', () => {
    const { drzewo: d } = importujGedcom(PLIK, MIEJSCA)
    const lata = szacowaneLata(d)
    const zyje = (id: string) => czyZyje(d.osoby.get(id)!, lata.get(id))
    const g = eksportujGedcom(d, { zyjace: 'ukryte', zyje })
    assert.ok(g.includes('1 NAME Żyjąca /osoba/'))
    assert.ok(!g.includes('Zofia'))
    assert.ok(g.includes('Paten/Godparents: Anna Przykładowa Wzorcowa'))
    assert.ok(g.includes('2 RELI unicki'))
    const { drzewo: d2, podsumowanie: p2 } = importujGedcom(eksportujGedcom(d, { zyjace: 'pelne', zyje }), MIEJSCA)
    assert.equal(p2.osoby, 5)
    assert.equal([...d2.rodziny.values()][0].dzieci.length, 1)
    const jan2 = [...d2.osoby.values()].find((o) => o.imiona === 'Jan')!
    assert.equal(jan2.zdarzenia.find((z) => z.rodzaj === 'chrzest')!.chrzestni?.length, 2)
    assert.equal(adresAncestry('1480::48528'), 'https://search.ancestry.com/cgi-bin/sse.dll?indiv=1&dbid=1480&h=48528')
    assert.equal(adresAncestry('1480::0'), null)
})

test('wycinek „tylko moja rodzina”: krewni i ich małżonkowie, bez rodzin małżonków', async () => {
    const { wycinekRodziny } = await import('./model')
    const o = (id: string) => [id, { id, imiona: id, nazwisko: 'T', plec: 'M', zdarzenia: [], wersja: 1 }] as const
    const f = (id: string, maz: string | undefined, zona: string | undefined, dzieci: string[]) => [id, { id, maz, zona, dzieci, zdarzenia: [], wersja: 1 }] as const
    // dziadek+babcia → ojciec, ciotka; ojciec+matka → ja; ciotka+wujek → kuzyn; teść+teściowa → matka (rodzina matki)
    const d = {
        osoby: new Map([o('dziadek'), o('babcia'), o('ojciec'), o('ciotka'), o('wujek'), o('kuzyn'), o('matka'), o('ja'), o('dziadekM'), o('obcy')]),
        rodziny: new Map([f('f1', 'dziadek', 'babcia', ['ojciec', 'ciotka']), f('f2', 'ojciec', 'matka', ['ja']), f('f3', 'wujek', 'ciotka', ['kuzyn']), f('f4', 'dziadekM', undefined, ['matka'])]),
        zrodla: new Map(),
    } as unknown as Parameters<typeof wycinekRodziny>[0]
    const w = wycinekRodziny(d, 'ja')
    assert.deepEqual([...w.osoby.keys()].sort(), ['babcia', 'ciotka', 'dziadek', 'dziadekM', 'ja', 'kuzyn', 'matka', 'ojciec', 'wujek'].sort())
    // dziadek ze strony matki jest przodkiem (krewny), „obcy” nie
    assert.ok(!w.osoby.has('obcy'))
    const wk = wycinekRodziny(d, 'kuzyn')
    assert.ok(wk.osoby.has('ojciec') && wk.osoby.has('ja') && wk.osoby.has('matka'), 'kuzyn: wujostwo, kuzyni i ich małżonkowie')
    assert.ok(!wk.osoby.has('dziadekM'), 'bez rodziny małżonki stryja')
})

test('miejscowość z PLAC: człony, nawiasy, parafia, twarde spacje, bez przecinków', async () => {
    const { znajdzMiejsce } = await import('./gedcom')
    const idx = new Map([['losice', 'losice'], ['olszanka', 'olszanka'], ['luby', 'luby'], ['lepki stare', 'lepki-stare'], ['miedzyrzec podlaski', 'miedzyrzec']])
    for (const [pl, id] of [
        ['Olszanka, Łosice, Siedlce, Polska', 'olszanka'], ['Olszanka ', 'olszanka'], [' Olszanka (Łosice)', 'olszanka'], ['parafia Olszanka', 'olszanka'],
        ['Olszanka Parish, Siedlce', 'olszanka'], ['Olszanka Siedlce Poland', 'olszanka'], ['Łuby', 'luby'], ['Luby, Biała Podlaska', 'luby'],
        ['Nowa Wieś, Łosice', undefined], ['Łepki Stare, Łosice', 'lepki-stare'], ['Międzyrzec Podlaski', 'miedzyrzec'], ['Ole​szanka', undefined],
    ] as [string, string | undefined][]) assert.equal(znajdzMiejsce(pl, idx), id, pl)
})

test('inne zapisy imienia i nazwiska, przydomek: import i eksport', () => {
    const plik = ['0 HEAD', '0 @I1@ INDI', '1 NAME Jan /Testowy/', '2 NICK Sowa', '1 NAME Joannes /Testowski/', '1 NAME Иван /Тестовый/', '1 SEX M', '0 TRLR'].join('\n')
    const { drzewo: d } = importujGedcom(plik, [])
    const o = [...d.osoby.values()][0]
    assert.equal(o.przydomek, 'Sowa')
    assert.deepEqual(o.inneZapisy, ['Joannes Testowski', 'Иван Тестовый'])
    assert.deepEqual(o.inneNazwiska, ['Testowski', 'Тестовый'])
    const g = eksportujGedcom(d, { zyjace: 'pelne', zyje: () => false })
    assert.ok(g.includes('2 NICK Sowa'))
    const o2 = [...importujGedcom(g, []).drzewo.osoby.values()][0]
    assert.equal(o2.przydomek, 'Sowa')
    assert.ok(o2.inneZapisy?.includes('Joannes Testowski'))
})

test('czy żyje: próg 105 lat, 95–104 do sprawdzenia', async () => {
    const { wiekDoSprawdzenia } = await import('./model')
    const os = (zyje: 'auto' | 'tak' | 'nie', zgon = false) => ({ id: 'x', imiona: 'X', nazwisko: 'Y', plec: 'M' as const, zdarzenia: zgon ? [{ id: 'z', rodzaj: 'zgon' as const }] : [], zyje, widocznosc: 'auto' as const, wersja: 1 })
    assert.equal(czyZyje(os('auto'), 1925, 2026), true)
    assert.equal(czyZyje(os('auto'), 1921, 2026), false)
    assert.equal(wiekDoSprawdzenia(os('auto'), 1929, 2026), 97)
    assert.equal(wiekDoSprawdzenia(os('auto'), 1935, 2026), null)
    assert.equal(wiekDoSprawdzenia(os('auto'), 1915, 2026), null)
    assert.equal(wiekDoSprawdzenia(os('auto', true), 1929, 2026), null)
    assert.equal(wiekDoSprawdzenia(os('tak'), 1915, 2026), 111)
    assert.equal(wiekDoSprawdzenia(os('nie'), 1929, 2026), null)
})
