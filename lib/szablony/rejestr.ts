/**
 * MAPA SZABLONÓW (P7G) – jedno źródło prawdy: który rodzaj treści, gdzie i jakim wzorcem jest wyświetlany.
 * Panel: /keystatic/panel/szablony. Test lib/szablony/rejestr.test.ts pilnuje, żeby mapa była kompletna
 * (każde miejsce w kodzie z listą odnośników do bytów musi tu być) i prawdziwa (plik używa deklarowanego wzorca).
 * Przełączniki wariantów – osobny etap (decyzja właściciela 15.11.2026: najpierw mapa).
 */

export type IdWzorca = 'karta' | 'karta-lista' | 'pozycja' | 'pozycja-w-karcie' | 'lista-dzialu' | 'lista-obiektow' | 'linia' | 'siatka' | 'spis' | 'pastylki-osob' | 'zapowiedz' | 'wlasny'
export type Status = 'zgodne' | 'do-ujednolicenia' | 'swiadomie-inne'

export interface Wzorzec { id: IdWzorca; nazwa: string; opis: string; komponent: string; /** ciąg, który musi wystąpić w pliku używającym wzorca */ znacznik: string[] }

export const WZORCE: Wzorzec[] = [
    { id: 'karta', nazwa: 'tabela karty', opis: 'Karta bytu: nagłówki części z tłem, wiersze etykieta–wartość. Wzór: karta osoby i obiektu.', komponent: 'Tabela / Czesc / W (Karta.tsx)', znacznik: ['<Tabela', 'osoba-tabela'] },
    { id: 'karta-lista', nazwa: 'lista w karcie', opis: 'Krótka lista odnośników w części tabeli karty (np. miejscowości instytucji, materiały osoby).', komponent: 'WCaly + ul.karta-lista (KrotkieMaterialy, KrotkieWpisy)', znacznik: ['karta-lista', 'KrotkieMaterialy', 'KrotkieWpisy'] },
    { id: 'pozycja', nazwa: 'karta pozycji', opis: 'Pozycja spisu z metadanymi w stylu karty: nagłówek (tytuł + informacja), wiersze, odnośniki z nazwą serwisu.', komponent: 'KartaPozycji', znacznik: ['KartaPozycji', 'TabelaKsiag'] },
    { id: 'pozycja-w-karcie', nazwa: 'pozycja w karcie', opis: 'Ta sama pozycja (nagłówek + wiersze etykieta–wartość) jako blok w części tabeli karty, bez własnej ramki – karty nie zagnieżdżamy w karcie. Wariant z miniaturą 160×120 przy prawej krawędzi tabeli (plany, PH-23).', komponent: 'PozycjaWKarcie (TabelaKsiag wariant="wiersze", ListaPlanow)', znacznik: ['wariant="wiersze"', 'PozycjaWKarcie'] },
    { id: 'lista-dzialu', nazwa: 'lista pozycji działu', opis: 'Indeks działu: tytuł, spokojna linia, linia podziału.', komponent: 'ul.lista-pozycji', znacznik: ['lista-pozycji', 'lista-pozycja'] },
    { id: 'lista-obiektow', nazwa: 'lista obiektów', opis: 'Tarcza rodzaju + nazwa; rodzaj nie powtarzany tekstem.', komponent: 'ListaObiektow', znacznik: ['ListaObiektow'] },
    { id: 'linia', nazwa: 'linia karty', opis: 'Powiązania w jednym wierszu tabeli karty, rozdzielone kropką.', komponent: 'LiniaKarty', znacznik: ['LiniaKarty'] },
    { id: 'siatka', nazwa: 'siatka miniatur', opis: 'Pozycje z obrazem: miniatura 4:3, tytuł, rodzaj, data – materiały archiwum i plany (PH-23).', komponent: 'SiatkaMiniatur (ListaMaterialow)', znacznik: ['ListaMaterialow', 'SiatkaMiniatur'] },
    { id: 'spis', nazwa: 'spis działów', opis: 'Katalog kartkowy: numer, nazwa, kropki, liczba. Także spis miejscowości i krain (bez numeracji, decyzja 16.11); gminy jako podgrupy w ramce krainy (wariant A2).', komponent: 'SpisDzialow', znacznik: ['SpisDzialow', 'SpisBiblioteki'] },
    { id: 'pastylki-osob', nazwa: 'pastylki osób', opis: 'JW-10: osoby jako pastylki w kolorach płci (tokeny wspólne z drzewem); lata, miejscowość, biogram obok zwykłym tekstem.', komponent: 'PastylkaOsoby', znacznik: ['PastylkaOsoby'] },
    { id: 'zapowiedz', nazwa: 'zapowiedź wpisu', opis: 'Metryczka; miniatura 300 px po lewej (wąsko: tytuł → miniatura → tekst); tekst do prawej krawędzi w kolumnach (2 × 7 / bez miniatury 3 × 9 wierszy); krótka bez kolumn; „czytaj dalej” przy końcu tekstu (uwagi 16.11).', komponent: 'ZapowiedziWpisow', znacznik: ['ZapowiedziWpisow'] },
    { id: 'wlasny', nazwa: 'własny układ', opis: 'Znaczniki napisane w miejscu, bez wspólnego komponentu – wymaga uzasadnienia albo ujednolicenia.', komponent: '—', znacznik: [] },
]

export interface Miejsce {
    byt: string
    gdzie: string
    plik: string
    wzorzec: IdWzorca
    status: Status
    uwaga?: string
    /** adres przykładowej strony (wzorzec adresu) */
    adres: string
}

export const MIEJSCA: Miejsce[] = [
    // osoby
    { byt: 'osoba', gdzie: 'karta osoby', plik: 'app/osoby/[id]/page.tsx', wzorzec: 'karta', status: 'zgodne', uwaga: 'JW-2: Tabela/Czesc/W z Karta.tsx; rodzina jako pastylki osób; materiały archiwalne jako część tabeli.', adres: '/osoby/…' },
    { byt: 'osoba', gdzie: 'katalog osób', plik: 'app/osoby/ListaOsob.tsx', wzorzec: 'pastylki-osob', status: 'zgodne', uwaga: 'Litery jako grupy; filtry kręgów – pastylki filtrów pod tytułem.', adres: '/osoby' },
    { byt: 'osoba', gdzie: 'karta materiału – osoby', plik: 'app/archiwum/[slug]/page.tsx', wzorzec: 'pastylki-osob', status: 'zgodne', adres: '/archiwum/…' },
    { byt: 'osoba', gdzie: 'karta instytucji – osoby związane', plik: 'app/parafie/[slug]/page.tsx', wzorzec: 'pastylki-osob', status: 'zgodne', uwaga: 'P3 (PAR-06): pastylka szerokości tekstu tylko dla karty widocznej czytelnikowi, linia „źródło:”; reszta – samo imię i nazwisko.', adres: '/parafie/…' },
    { byt: 'osoba', gdzie: 'przeglądarka planu – zakładka „lista pochowanych”', plik: 'app/components/plan/ListaPochowanych.tsx', wzorzec: 'wlasny', status: 'do-ujednolicenia', uwaga: 'Etap 3: wygląd z klas i tokenów (JW 0), zakładka apletu. Wiersze jako bloki ≤640 px i nazwisko z napisu obok zapisu z drzewa – etap 5 (makieta 17.11).', adres: '/plany/… (zakładka lista)' },
    { byt: 'osoba', gdzie: 'przeglądarka planu – PanelPlanu (karta grobu, stan pusty, wyniki, groby rodziny)', plik: 'app/components/plan/PanelPlanu.tsx', wzorzec: 'karta', status: 'zgodne', uwaga: 'Etap 3 (CEM-03/04/08/11): tabela karty 380 px na wysokość mapy – części .ot-nagl, wiersze .ot-w, pochowani jako PastylkaOsoby; ten sam panel w materiale z rekonstrukcją (PH4).', adres: '/plany/… · /archiwum/… (rekonstrukcja)' },
    { byt: 'plan', gdzie: 'przeglądarka planu – zakładka „lista obiektów” (plan historyczny, schemat – PH-13)', plik: 'app/components/plan/ListaObiektowPlanu.tsx', wzorzec: 'wlasny', status: 'do-ujednolicenia', uwaga: 'PH4: ta sama tabela co lista pochowanych (.lista-pochowanych), bez tekstów o grobach; bloki na telefonie – razem z listą pochowanych w etapie 5.', adres: '/plany/… (schemat, zakładka lista)' },
    // obiekty
    { byt: 'obiekt', gdzie: 'karta obiektu', plik: 'app/obiekty/[slug]/page.tsx', wzorzec: 'karta', status: 'zgodne', adres: '/obiekty/…' },
    { byt: 'wpis', gdzie: 'strona wpisu – układ karty (miniatura w pasku bocznym, zapowiedź pod metryczką, spis treści)', plik: 'app/wpisy/[slug]/page.tsx', wzorzec: 'karta', status: 'zgodne', uwaga: 'Makieta wpisu 17.11 (P1–P3): miniatura wpisu w gnieździe „bok” jak zdjęcie karty obiektu (osoba-portret, kadr 3:2, odnośnik do materiału); lead klasą osoba-lead; odnośniki w tekstach i „jak cytować” jako części tabeli karty.', adres: '/wpisy/…' },
    { byt: 'obiekt', gdzie: 'lista działu', plik: 'app/obiekty/page.tsx', wzorzec: 'lista-dzialu', status: 'zgodne', uwaga: 'Z tarczą rodzaju.', adres: '/obiekty' },
    { byt: 'obiekt', gdzie: 'karta miejscowości – w terenie', plik: 'app/miejsca/[slug]/page.tsx', wzorzec: 'lista-obiektow', status: 'zgodne', adres: '/miejsca/…' },
    { byt: 'obiekt', gdzie: 'karta instytucji – powiązane obiekty', plik: 'app/parafie/[slug]/page.tsx', wzorzec: 'lista-obiektow', status: 'zgodne', adres: '/parafie/…' },
    // miejscowości
    { byt: 'miejscowość', gdzie: 'karta miejscowości', plik: 'app/miejsca/[slug]/page.tsx', wzorzec: 'karta', status: 'zgodne', adres: '/miejsca/…' },
    { byt: 'miejscowość', gdzie: 'spis pod mapą', plik: 'app/components/SpisMiejsc.tsx', wzorzec: 'spis', status: 'zgodne', adres: '/miejsca' },
    { byt: 'miejscowość', gdzie: 'karta gminy – wsie gminy', plik: 'app/miejsca/[slug]/page.tsx', wzorzec: 'spis', status: 'zgodne', adres: '/miejsca/gmina-…' },
    { byt: 'miejscowość', gdzie: 'karta instytucji – miejscowości', plik: 'app/parafie/[slug]/page.tsx', wzorzec: 'karta-lista', status: 'zgodne', adres: '/parafie/…' },
    { byt: 'miejscowość', gdzie: 'mapa – lista pod mapą i dymki', plik: 'app/components/MapaMiejsc.tsx', wzorzec: 'wlasny', status: 'swiadomie-inne', uwaga: 'Elementy mapy (dymki, spis widoczny na mapie) – układ mapowy, nie lista działu.', adres: '/miejsca' },
    { byt: 'miejscowość', gdzie: 'stopka – spis miejscowości', plik: 'app/components/Footer.tsx', wzorzec: 'wlasny', status: 'swiadomie-inne', uwaga: 'Nawigacja w stopce.', adres: 'każda strona' },
    // instytucje
    { byt: 'instytucja', gdzie: 'karta instytucji', plik: 'app/parafie/[slug]/page.tsx', wzorzec: 'karta', status: 'zgodne', adres: '/parafie/…' },
    { byt: 'instytucja', gdzie: 'lista działu', plik: 'app/parafie/page.tsx', wzorzec: 'lista-dzialu', status: 'zgodne', adres: '/parafie' },
    { byt: 'instytucja', gdzie: 'katalog ksiąg – grupa', plik: 'app/components/KatalogKsiegiNaZywo.tsx', wzorzec: 'wlasny', status: 'swiadomie-inne', uwaga: 'Rozwijana grupa z osią lat; księgi w środku – karta pozycji.', adres: '/biblioteka/ksiegi?widok=parafie' },
    // księgi
    { byt: 'księga metrykalna', gdzie: 'katalog ksiąg', plik: 'app/components/KatalogKsiegiNaZywo.tsx', wzorzec: 'pozycja', status: 'zgodne', adres: '/biblioteka/ksiegi' },
    { byt: 'księga metrykalna', gdzie: 'karta miejscowości', plik: 'app/miejsca/[slug]/page.tsx', wzorzec: 'pozycja-w-karcie', status: 'zgodne', adres: '/miejsca/…' },
    { byt: 'księga metrykalna', gdzie: 'karta instytucji', plik: 'app/parafie/[slug]/page.tsx', wzorzec: 'pozycja-w-karcie', status: 'zgodne', adres: '/parafie/…' },
    // publikacje
    { byt: 'pozycja biblioteki', gdzie: 'katalog biblioteki (publikacje, księgi, parafie, hasła)', plik: 'app/biblioteka/page.tsx', wzorzec: 'lista-dzialu', status: 'zgodne', uwaga: 'Odbiór 16.11: jak archiwum – FiltryKatalogu, spis działów filtrujący listę, WybraneFiltry, NawigacjaStron.', adres: '/biblioteka' },
    { byt: 'publikacja', gdzie: 'spis publikacji', plik: 'app/biblioteka/publikacje/page.tsx', wzorzec: 'pozycja', status: 'zgodne', adres: '/biblioteka/publikacje' },
    { byt: 'publikacja', gdzie: 'karta publikacji', plik: 'app/biblioteka/publikacje/[slug]/page.tsx', wzorzec: 'karta', status: 'zgodne', adres: '/biblioteka/publikacje/…' },
    // materiały
    { byt: 'materiał', gdzie: 'karta materiału', plik: 'app/archiwum/[slug]/page.tsx', wzorzec: 'karta', status: 'zgodne', adres: '/archiwum/…' },
    { byt: 'materiał', gdzie: 'katalog archiwum', plik: 'app/archiwum/page.tsx', wzorzec: 'siatka', status: 'zgodne', adres: '/archiwum' },
    { byt: 'materiał', gdzie: 'karta zbioru', plik: 'app/archiwum/zbiory/[slug]/page.tsx', wzorzec: 'siatka', status: 'zgodne', adres: '/archiwum/zbiory/…' },
    { byt: 'materiał', gdzie: 'karta instytucji – materiały', plik: 'app/parafie/[slug]/page.tsx', wzorzec: 'karta-lista', status: 'zgodne', uwaga: 'P3 (KRT-03): jak na karcie osoby – KrotkieMaterialy, 5 pozycji + „wszystkie (N) w archiwum →” (filtr instytucji w archiwum).', adres: '/parafie/…' },
    { byt: 'materiał', gdzie: 'karta osoby – materiały', plik: 'app/osoby/[id]/page.tsx', wzorzec: 'karta-lista', status: 'zgodne', uwaga: 'JW-2: część „materiały archiwalne” w tabeli karty (KrotkieMaterialy).', adres: '/osoby/…' },
    { byt: 'materiał', gdzie: 'wpis – wstawka materiału ze skanem', plik: 'app/components/WstawkaMaterialu.tsx', wzorzec: 'wlasny', status: 'swiadomie-inne', uwaga: 'JW-13: ten sam widok co karta materiału (SkanZTekstem) na pełnej szerokości + „pełny widok w archiwum →”.', adres: '/wpisy/…' },
    // zbiory, tematy, wpisy, hasła
    { byt: 'zbiór', gdzie: 'lista zbiorów', plik: 'app/archiwum/zbiory/page.tsx', wzorzec: 'lista-dzialu', status: 'zgodne', adres: '/archiwum/zbiory' },
    { byt: 'zbiór', gdzie: 'karta zbioru', plik: 'app/archiwum/zbiory/[slug]/page.tsx', wzorzec: 'karta', status: 'zgodne', adres: '/archiwum/zbiory/…' },
    { byt: 'temat', gdzie: 'lista tematów', plik: 'app/tematy/page.tsx', wzorzec: 'lista-dzialu', status: 'zgodne', adres: '/tematy' },
    { byt: 'temat', gdzie: 'karta tematu', plik: 'app/tematy/[slug]/page.tsx', wzorzec: 'karta', status: 'zgodne', adres: '/tematy/…' },
    { byt: 'temat', gdzie: 'karta miejscowości – oś czasu', plik: 'app/miejsca/[slug]/page.tsx', wzorzec: 'wlasny', status: 'swiadomie-inne', uwaga: 'Oś czasu (ol.karta-os) – inny rodzaj informacji niż lista.', adres: '/miejsca/…' },
    { byt: 'wpis', gdzie: 'strona główna – zapowiedzi', plik: 'app/page.tsx', wzorzec: 'zapowiedz', status: 'zgodne', uwaga: 'ZapowiedziWpisow (wspólny z /wpisy).', adres: '/' },
    { byt: 'wpis', gdzie: 'zapowiedzi wpisów – lista /wpisy i strona główna', plik: 'app/components/ZapowiedziWpisow.tsx', wzorzec: 'zapowiedz', status: 'zgodne', uwaga: 'Uwagi 16.11: ZapowiedziWpisow – ten sam układ co strona główna (dawna ListaOpowiesci usunięta).', adres: '/wpisy' },
    { byt: 'hasło słownika', gdzie: 'słownik – siatka fiszek (SLW-01, P2)', plik: 'app/biblioteka/slownik/page.tsx', wzorzec: 'siatka', status: 'zgodne', uwaga: 'SiatkaMiniatur wariant „fiszka”: połowa hasło, połowa wyjaśnienie; pierwsza fiszka – zaproszenie do zgłoszenia hasła.', adres: '/biblioteka/slownik' },
    { byt: 'hasło słownika', gdzie: 'strona hasła (SLW-02, P3)', plik: 'app/biblioteka/slownik/[slug]/page.tsx', wzorzec: 'karta', status: 'zgodne', uwaga: 'Wzorzec karty: znaczenie jako wstęp; podstawowe (rodzaj, formy, przykład, pochodzenie słowa, występowanie, źródło, zobacz też, opracował(a)); „występuje w” – PozycjaWKarcie z fragmentem (Powiazania.WystepujeW); jak cytować + zgłosił(a).', adres: '/biblioteka/slownik/…' },
    { byt: 'hasło słownika', gdzie: 'karta materiału – „słowa ze słownika” (SLW-03, P3)', plik: 'app/archiwum/[slug]/page.tsx', wzorzec: 'wlasny', status: 'swiadomie-inne', uwaga: 'Decyzja 17.11: pastylki w wyglądzie PastylkaFiltra (podpowiedź = znaczenie) + „słownik →”; liczone z sieci powiązań.', adres: '/archiwum/…' },
    { byt: 'hasło słownika', gdzie: 'karta miejscowości – „słowa z tej miejscowości” (SLW-02, P3)', plik: 'app/miejsca/[slug]/page.tsx', wzorzec: 'wlasny', status: 'swiadomie-inne', uwaga: 'Jak „słowa ze słownika” na karcie materiału; z pola „występowanie” hasła.', adres: '/miejsca/…' },
    { byt: 'instytucja', gdzie: 'karta osoby – funkcje (PPL-04/05, P3)', plik: 'app/osoby/[id]/page.tsx', wzorzec: 'karta', status: 'zgodne', uwaga: 'Wiersz tabeli karty: rola · instytucja (wyznanie instytucji) · okres · źródło – odnośnik zwrotny z karty instytucji.', adres: '/osoby/…' },
    // przekrojowe
    { byt: 'plan', gdzie: 'karta miejscowości / obiektu – plany (z miniaturą)', plik: 'app/components/plan/ListaPlanow.tsx', wzorzec: 'pozycja-w-karcie', status: 'zgodne', adres: '/miejsca/… · /obiekty/…' },
    { byt: 'różne', gdzie: 'opis elementu planu – karty i podstawa (PH2)', plik: 'app/components/plan/OpisElementu.tsx', wzorzec: 'wlasny', status: 'swiadomie-inne', uwaga: 'PH4: blok wierszy w części panelu (KartaElementu w PanelPlanu) – na planie, w panelu materiału z rekonstrukcją i w zakładce „plan” karty materiału; własne wiersze dl zostają (blok w komórce tabeli).', adres: '/plany/… · /archiwum/…' },
    { byt: 'plan', gdzie: 'wszystkie plany', plik: 'app/plany/page.tsx', wzorzec: 'siatka', status: 'zgodne', adres: '/plany' },
    { byt: 'różne', gdzie: 'sieć powiązań – odnośniki w tekstach i wzmianki (części tabeli karty)', plik: 'app/components/Powiazania.tsx', wzorzec: 'pozycja-w-karcie', status: 'zgodne', uwaga: 'Makieta wpisu 17.11 (P3): części „odnośniki w tekstach” i „wspomniane bez odnośnika” w tabeli karty przed „jak cytować”, pozycje jako bloki (PozycjaWKarcie) z fragmentem tekstu; wpis, miejscowość, obiekt, temat, materiał, osoba.', adres: '/wpisy/… · /miejsca/… · /obiekty/… · /tematy/… · /archiwum/… · /osoby/…' },
    { byt: 'różne', gdzie: 'drukuj całość – spis pozycji z nr kat.', plik: 'app/druk/[rodzaj]/[id]/page.tsx', wzorzec: 'wlasny', status: 'swiadomie-inne', uwaga: 'KAT-05: wydruk – strona tytułowa, spis z numerami katalogowymi, każda pozycja od nowej kartki.', adres: '/druk/miejsce/…' },
    { byt: 'różne', gdzie: 'współtwórz – braki: dokumenty i zdjęcia (siatka miniatur z etykietą braku i „uzupełnij”)', plik: 'app/wspoltworz/page.tsx', wzorzec: 'siatka', status: 'zgodne', uwaga: 'WSP-01: SiatkaMiniatur z gniazdem „dol” (EtykietaBraku + uzupełnij); grupy GrupaZadan; zadania tylko z danych publicznych (lib/wspoltworz-dane.ts).', adres: '/wspoltworz' },
    { byt: 'różne', gdzie: 'współtwórz – braki: miejsca i obiekty (lista pozycji z etykietą braku i „uzupełnij”)', plik: 'app/wspoltworz/page.tsx', wzorzec: 'lista-dzialu', status: 'zgodne', adres: '/wspoltworz?zadanie=bez-opisu' },
    { byt: 'różne', gdzie: 'wyniki wyszukiwania', plik: 'app/szukaj/page.tsx', wzorzec: 'wlasny', status: 'do-ujednolicenia', uwaga: 'Własna lista z etykietą rodzaju – powinna być listą pozycji działu z etykietą.', adres: '/szukaj?q=…' },
]

/**
 * JW-1 · komponenty bazowe języka wizualnego (zasada 5.1c): strony składamy z nich, nie piszemy ręcznie.
 * Podgląd: /keystatic/panel/wzorce. Test: każdy komponent jest eksportowany ze wskazanego pliku, a jego klasa ma regułę w app/globals.css.
 */
export interface KomponentBazowy { id: string; nazwa: string; komponent: string; plik: string; klasa: string; opis: string }

export const KOMPONENTY_BAZOWE: KomponentBazowy[] = [
    { id: 'strona', nazwa: 'strona', komponent: 'Strona', plik: 'app/components/Uklad.tsx', klasa: 'uklad-kolumna', opis: 'Szerokość B: układ 1200 px (treść 1160). uklad="kolumna" – kolumna tekstu 66 znaków; "pelna" – 1160 px (plany, skany, mapy, katalogi); "karta" – nagłówek karty nad siatką, kolumna + pasek boczny od pierwszej tabeli (wariant B, 17.11; gniazda naglowek / bok / spis), <PelnaSzerokosc> przerywa kolumnę, spis wraca po nim; "przegladarka" – nagłówek i stopka 1200 px, aplet planu do 1600 px (tylko /plany/[slug]).' },
    { id: 'panel-planu', nazwa: 'panel planu', komponent: 'PanelPlanu', plik: 'app/components/plan/PanelPlanu.tsx', klasa: 'plan-panel', opis: 'Etap 3: tabela karty 380 px na wysokość mapy w ramce apletu (pasek .szt-pasek z nazwą części): PoleSzukania + podpowiedź, stan pusty (liczby, kwatery, legenda, o planie), karta grobu / obiektu (‹ ›, kopiuj link, PastylkaOsoby, napis), wyniki 40 px (Esc). ≤900 px pod mapą, nagłówek części w panelu. Także materiał z rekonstrukcją (PH4, 360 px).' },
    { id: 'tytul-strony', nazwa: 'tytuł strony', komponent: 'TytulStrony', plik: 'app/components/Uklad.tsx', klasa: 'tytul-strony', opis: 'h1 w kolorze akcentu z kreską 40 × 3 px, nad nim pasek akcji i okruszki; w druku czarny, kreska czarną ramką. Ta sama klasa w nagłówku karty (NaglowekKarty).' },
    { id: 'tytul-sekcji', nazwa: 'tytuł sekcji', komponent: 'TytulSekcji', plik: 'app/components/Wzorce.tsx', klasa: 'tytul-sekcji', opis: 'Małe litery, 20 px, akcent, kreska 32 × 3 px (wzorzec strony głównej). Sekcja = section + TytulSekcji.' },
    { id: 'okruszki', nazwa: 'okruszki', komponent: 'Okruszki', plik: 'app/components/Wzorce.tsx', klasa: 'okruszki', opis: '„strona główna / dział / …” na każdej stronie poza główną; w druku „odniepamieci.pl / dział” + adres.' },
    { id: 'spis-tresci', nazwa: 'spis treści', komponent: 'SpisTresci', plik: 'app/components/SpisTresci.tsx', klasa: 'spis-tresci', opis: 'W pasku bocznym karty, przyklejony; aktywna część w akcencie (IntersectionObserver); telefon – zwijany wiersz „na tej stronie”.' },
    { id: 'pastylka-osoby', nazwa: 'pastylka osoby', komponent: 'PastylkaOsoby', plik: 'app/components/Wzorce.tsx', klasa: 'osoba-link', opis: '40 px, pełne zaokrąglenie, tło i ramka z tokenów płci (--osoba-k/m/u-…) wspólnych z drzewem; w druku pogrubiona, bez tła.' },
    { id: 'pastylka-filtra', nazwa: 'pastylka filtra', komponent: 'PastylkaFiltra', plik: 'app/components/Wzorce.tsx', klasa: 'szukaj-filtr', opis: 'Filtry katalogów pod tytułem; „wszyscy” pierwszy; filtr z wynikiem 0 ukryty; drugi rząd z podpisem (RzadFiltrow).' },
    { id: 'pozycja-w-karcie', nazwa: 'pozycja w karcie', komponent: 'PozycjaWKarcie', plik: 'app/components/KartaPozycji.tsx', klasa: 'pozycja-w-karcie', opis: 'Blok w części tabeli karty: nagłówek (tytuł + informacja po prawej), wiersze etykieta–wartość, bez własnej ramki; wariant z miniaturą 160×120 przy prawej krawędzi (PH-23). Księgi metrykalne i plany.' },
    { id: 'siatka-miniatur', nazwa: 'siatka miniatur', komponent: 'SiatkaMiniatur', plik: 'app/components/SiatkaMiniatur.tsx', klasa: 'siatka-miniatur', opis: 'Kafle 12rem+: obraz 4:3, tytuł, linia (rodzaj · data). Materiały archiwum (ListaMaterialow) i „wszystkie plany”.' },
    { id: 'drukuj', nazwa: 'drukuj', komponent: 'PrzyciskDrukuj', plik: 'app/components/Druk.tsx', klasa: 'druk-koniec', opis: 'Przycisk w pasku akcji karty + wspólny arkusz druku A4 (stopka „odniepamieci.pl · tytuł | wydrukowano … · strona X z Y”, blok na końcu treści).' },
    { id: 'kroki', nazwa: 'kroki „jak to działa”', komponent: 'KrokiDzialania', plik: 'app/components/Wzorce.tsx', klasa: 'wsp-kroki', opis: 'WSP-01: 3 kroki w kolumnach (telefon – jeden pod drugim), kreska akcentu 3 px nad krokiem, numer w akcencie. Strona „współtwórz”.' },
    { id: 'grupa-zadan', nazwa: 'grupa zadań', komponent: 'GrupaZadan', plik: 'app/components/Wzorce.tsx', klasa: 'wsp-grupa', opis: 'WSP-01: nagłówek-wiersz z tłem sekcji (jak .ot-nagl) z liczbą, opis grupy, zawartość – siatka miniatur albo lista pozycji; pusta grupa – Komunikat „gotowe”.' },
    { id: 'etykieta-braku', nazwa: 'etykieta braku', komponent: 'EtykietaBraku', plik: 'app/components/Wzorce.tsx', klasa: 'wsp-brak', opis: 'WSP-01: neutralna pastylka (tło kontrolki, tekst opisu, ramka linii podziału) – „brak transkrypcji · łacina”; brak to zaproszenie, nie ostrzeżenie.' },
]

/**
 * Pliki z odnośnikami do bytów, które NIE są listą bytów (nawigacja, panel, pojedynczy odnośnik w tekście).
 * Test nie wymaga dla nich wpisu w MIEJSCA.
 */
export const POZA_MAPA: { plik: string; dlaczego: string }[] = [
    { plik: 'app/components/Karta.tsx', dlaczego: 'definicje wzorca karty (odnośniki w komponentach wzorca)' },
    { plik: 'app/components/ListaObiektow.tsx', dlaczego: 'komponent wzorca' },
    { plik: 'app/components/ListaMaterialow.tsx', dlaczego: 'komponent wzorca' },
    { plik: 'app/components/SiatkaMiniatur.tsx', dlaczego: 'komponent wzorca (siatka miniatur)' },
    { plik: 'app/obiekty/[slug]/page.tsx', dlaczego: 'pojedyncze odnośniki w wierszach karty' },
    { plik: 'app/archiwum/[slug]/page.tsx', dlaczego: 'pojedyncze odnośniki w wierszach karty' },
    { plik: 'app/plany/[slug]/page.tsx', dlaczego: 'pojedynczy odnośnik „karta obiektu →” nad apletem (VIEW-07)' },
    { plik: 'app/components/Wzorce.tsx', dlaczego: 'komponenty bazowe (JW-1): okruszki, pastylki – definicje wzorców' },
]
