import { config, collection, singleton, fields } from '@keystatic/core';
import { wrapper, repeating, block } from '@keystatic/core/content-components';
import { EDTF_OPIS, EDTF_REGEX } from './lib/edtf';
import { identyfikatorZNazwy } from './lib/tekst';
import { NAZWY_OBIEKTOW, WYZNANIA } from './lib/tarcze';
import { RODZAJE_MATERIALOW } from './lib/materialy';
import { ADRES_PLIKOW, KATALOG_PLIKOW } from './lib/pliki';
import { MENU, pozycjeDoUstawien, STRONA_PUBLICZNA } from './lib/panel/menu';
import { WYZNANIA_PARAFII, RODZAJE_KSIAG, DOSTEP_KSIAG } from './lib/ksiegi';

// Model danych: claude/odniepamieci-model-danych.md (projekt „own www”).
// Nazwy pól w plikach jak w Dublin Core – ułatwia późniejszy eksport do Omeka S.

export const WSTEP_DOMYSLNY = 'Archiwum wsi wokół Olszanki i Łosic: dokumenty, zdjęcia, nagrania i wspomnienia, ludzie i miejsca, o których pamięta coraz mniej osób.';

const WSPOLRZEDNE_REGEX = /^$|^-?\d{1,2}(\.\d+)?,\s*-?\d{1,3}(\.\d+)?$/;

function nazwaIIdentyfikator(etykieta: string) {
  return fields.slug({
    name: { label: etykieta, validation: { isRequired: true } },
    slug: {
      label: 'Identyfikator (adres strony)',
      description: 'Po opublikowaniu nie zmieniaj – od niego zależą odnośniki i eksport.',
      generate: identyfikatorZNazwy,
      validation: { pattern: { regex: /^[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Tylko małe litery bez polskich znaków, cyfry i łączniki.' } },
    },
  });
}

function nazwaIIdentyfikatorObiektu() {
  return fields.slug({
    name: { label: 'Nazwa', validation: { isRequired: true } },
    slug: {
      label: 'Identyfikator (adres strony)',
      description: 'Zaczyna się od „obj-”. Po opublikowaniu nie zmieniaj.',
      generate: (n) => `obj-${identyfikatorZNazwy(n)}`,
      validation: { pattern: { regex: /^obj-[a-z0-9]+(?:-[a-z0-9]+)*$/, message: 'Zapis: obj-nazwa-malymi-literami' } },
    },
  });
}

const inneNazwy = () =>
  fields.array(fields.text({ label: 'Nazwa lub forma' }), {
    label: 'Inne nazwy i formy',
    description: 'Nazwy dawne i urzędowe, zapis cyrylicą i łaciną (np. Stare Łepki, Ольшанка). Widoczne na stronie. Odmiana – w polu „Formy odmiany”.',
    itemLabel: (p) => p.value || 'nowa forma',
  });

const dataEdtf = (etykieta: string) =>
  fields.text({
    label: etykieta,
    description: EDTF_OPIS,
    validation: { pattern: { regex: EDTF_REGEX, message: 'Niepoprawny zapis daty. ' + EDTF_OPIS } },
  });

const formyOdmiany = () =>
  fields.array(fields.text({ label: 'Forma' }), {
    label: 'Formy odmiany',
    description: 'Niewidoczne na stronie – dla wyszukiwarki (i później wzmianek). Uzupełnia je polecenie „npm run formy”; możesz poprawić lub dopisać formy dawne (np. Korczowki).',
    itemLabel: (p) => p.value,
  });

const widocznosc = () =>
  fields.select({
    label: 'Widoczność',
    options: [
      { label: 'publiczne', value: 'publiczne' },
      { label: 'dla bliskich', value: 'bliscy' },
      { label: 'tylko ja', value: 'ja' },
    ],
    defaultValue: 'publiczne',
  });

// WSP-02 (decyzja 17.11): rekord z zaznaczonym polem nie trafia do zadań na stronie „współtwórz” (obok „zignoruj” w panelu)
const bezWspoltworz = () =>
  fields.checkbox({ label: 'Nie pokazuj w „współtwórz”', description: 'Braki tego rekordu (opis, położenie, zdjęcie, transkrypcja) nie będą pokazywane czytelnikom jako zadania do uzupełnienia – np. gdy położenie jest historycznie nieznane.', defaultValue: false });
const notatka = () =>
  fields.text({ label: 'Notatka robocza', description: 'Widoczna tylko w panelu, nie trafia na stronę ani do eksportu.', multiline: true });

const dodano = () => fields.date({ label: 'Dodano', defaultValue: { kind: 'today' } });

// KRT-01 (P3, ankieta 2 z 17.11): „zgłosił(a)” na kartach – podpis osoby, która zgłosiła informację lub materiał, tylko za jej zgodą.
// Bez adresu e-mail (zasada 8.2) – walidacja przy zapisie odrzuca „@”.
export const ZGLOSIL_WZOR = /^[^@]*$/;
const zglosil = () =>
  fields.text({
    label: 'Zgłosił(a)',
    description: 'Podpis osoby, która zgłosiła tę informację (np. „Anna Nowak, Olszanka”) – tylko za jej zgodą. Bez adresu e-mail. Puste – nie pokazuje się.',
    validation: { pattern: { regex: ZGLOSIL_WZOR, message: 'Bez adresu e-mail – sam podpis.' } },
  });

// Wyróżnione fragmenty w treści: transkrypcja, tłumaczenie, cytat, oryginał –
// w ramce z etykietą i źródłem; „oryginał i tłumaczenie” w dwóch kolumnach.
// Wygląd: lib/markdoc.ts (znaczniki zrodlo, dwujezyczne, kolumna) i app/globals.css (.zrodlo).
const komponenty = {
  zrodlo: wrapper({
    label: 'Źródło (transkrypcja, tłumaczenie, cytat)',
    description: 'Tekst z dokumentu w ramce z etykietą.',
    schema: {
      rodzaj: fields.select({
        label: 'Rodzaj',
        options: [
          { label: 'transkrypcja', value: 'transkrypcja' },
          { label: 'tłumaczenie', value: 'tlumaczenie' },
          { label: 'cytat', value: 'cytat' },
          { label: 'oryginał', value: 'oryginal' },
        ],
        defaultValue: 'transkrypcja',
      }),
      opis: fields.text({ label: 'Skąd', description: 'Np. „AP Lublin, sygn. 35/99/0/1/405” albo autor i tytuł. Można zostawić puste.' }),
    },
  }),
  dwujezyczne: repeating({
    label: 'Oryginał i tłumaczenie (dwie kolumny)',
    description: 'Na telefonie kolumny ułożą się jedna pod drugą.',
    children: ['kolumna'],
    validation: { children: { min: 2, max: 2 } },
    schema: {
      opis: fields.text({ label: 'Skąd', description: 'Np. sygnatura księgi. Można zostawić puste.' }),
    },
  }),
  material: block({
    label: 'Materiał z archiwum',
    description: 'Zdjęcie, nagranie, mapa albo dokument z archiwum, wstawione w tekst. Materiał niewidoczny dla czytelnika się nie pokaże.',
    schema: {
      id: fields.relationship({ label: 'Materiał', collection: 'materialy', validation: { isRequired: true } }),
      podpis: fields.text({ label: 'Podpis', description: 'Puste – tytuł materiału.' }),
      // PD-07 (etap R): wstawka otwiera się na wskazanej stronie skanu
      strona: fields.integer({ label: 'Strona skanu', description: 'Która strona skanu ma być widoczna na początku (1 = pierwsza). Puste – pierwsza.', validation: { min: 1, max: 999 } }),
    },
  }),
  drzewo: block({
    label: 'Drzewo osoby',
    description: 'Drzewo z działu „osoby”: przodkowie nad osobą, potomkowie pod nią (na telefonie jako lista). Osoby żyjące widzą tylko zalogowani.',
    schema: {
      osoba: fields.text({ label: 'Osoba', description: 'Identyfikator z panelu osób (/keystatic/osoby), np. jan-kowalski-1862 – widać go na dole karty osoby.', validation: { length: { min: 1 } } }),
      wstecz: fields.integer({ label: 'Pokolenia wstecz', defaultValue: 2, validation: { min: 0, max: 4 } }),
      naprzod: fields.integer({ label: 'Pokolenia naprzód', defaultValue: 1, validation: { min: 0, max: 3 } }),
      zakres: fields.select({ label: 'Zakres', options: [{ label: 'linia prosta', value: 'linia' }, { label: 'z małżonkami', value: 'malzonkowie' }, { label: 'z rodzeństwem', value: 'rodzenstwo' }], defaultValue: 'malzonkowie' }),
    },
  }),
  kolumna: wrapper({
    label: 'Kolumna',
    forSpecificLocations: true,
    schema: {
      etykieta: fields.text({ label: 'Nagłówek kolumny', description: 'Np. „oryginał · łacina” albo „tłumaczenie”.' }),
    },
  }),
};

const opisMarkdoc = (etykieta: string, katalog: string) =>
  fields.markdoc({
    label: etykieta,
    options: {
      image: {
        directory: `public/images/${katalog}`,
        publicPath: `/images/${katalog}/`,
      },
    },
    components: komponenty,
  });


/** Źródła karty: każde osobno, pokazywane na dole strony jako numerowana lista. */
const zrodlaKarty = () =>
  fields.array(fields.text({ label: 'Źródło', multiline: true }), {
    label: 'Źródła',
    description: 'Każde źródło osobno: archiwum, zespół i sygnatura; publikacja z autorem, rokiem i stroną; relacja (kto, kiedy). Pokazywane na dole karty, numerowane. Adresy zamieniają się w odnośniki.',
    itemLabel: (p) => (p.value || 'źródło').slice(0, 80),
  })

const konfiguracja = config({
  storage: {
    kind: 'local',
  },
  // PK: interfejs Keystatic po polsku (tam, gdzie Keystatic ma tłumaczenie)
  locale: 'pl-PL',
  ui: {
    brand: { name: 'odniepamieci.pl' },
    // PK: te same grupy co menu panelu (lib/panel/menu.ts); zespoły i ustawienia dopisane (wcześniej tylko w Keystatic albo nigdzie)
    navigation: {
      'Treści': ['posts', 'miejsca', 'obiekty', 'tematy', 'biogramy'],
      'Archiwum': ['materialy', 'zbiory'],
      'Biblioteka': ['publikacje'],
      'Księgi metrykalne': ['parafie', 'ksiegi', 'zespoly'],
      'Słownik': ['hasla'],
      'Strony': ['stronaGlowna', 'wstepyDzialow', 'oProjekcie'],
      'Narzędzia': ['przekierowania', 'kregiStopka', 'menuPanelu'],
    },
  },
  collections: {
    posts: collection({
      label: 'Wpisy',
      slugField: 'title',
      path: 'content/posts/*',
      format: { contentField: 'content' },
      columns: ['title', 'date'],
      entryLayout: 'content',
      schema: {
        title: nazwaIIdentyfikator('Tytuł'),
        date: fields.date({ label: 'Data publikacji', defaultValue: { kind: 'today' } }),
        kind: fields.select({
          label: 'Rodzaj',
          options: [
            { label: 'o źródle', value: 'o-zrodle' },
            { label: 'esej', value: 'esej' },
            // D-SG-12 (etap R): gatunki z rekomendacji SG-12
            { label: 'wywiad', value: 'wywiad' },
            { label: 'reportaż', value: 'reportaz' },
            { label: 'wspomnienie', value: 'wspomnienie' },
          ],
          defaultValue: 'o-zrodle',
        }),
        // P7E-1 (SG-02, SG-10…13): redakcyjna zapowiedź na stronie głównej zamiast pełnego wpisu
        lead: fields.text({
          label: 'Zapowiedź (strona główna i lista wpisów)',
          multiline: true,
          description: '2–3 zdania, które zaczynają historię: człowiek, wydarzenie, wierny cytat albo pytanie (bez clickbaitu). Wywiad – autentyczny cytat albo fragment rozmowy; reportaż – scena lub ważny szczegół; wspomnienie – głos świadka i konkret; o źródle – lokalny kontekst i znaczenie dokumentu. Cytat zawsze wierny źródłu. Na stronie głównej i liście wpisów: z miniaturą do 2 kolumn × 7 wierszy (ok. 500 znaków), bez miniatury do 3 × 9 (ok. 900); dłuższy tekst zostanie skrócony, krótki stoi w jednej kolumnie. Puste – początek tekstu wpisu.',
        }),
        cover: fields.relationship({
          label: 'Miniatura zapowiedzi (materiał z archiwum)',
          collection: 'materialy',
          description: 'Opcjonalnie. Puste – pierwszy materiał wstawiony w tekst; bez materiału zapowiedź jest bez obrazu.',
        }),
        spatial: fields.multiRelationship({ label: 'Miejsca', collection: 'miejsca' }),
        subject: fields.multiRelationship({ label: 'Tematy', collection: 'tematy' }),
        // D-SG-14 (etap R): autorskie zaproszenie pod wybranym wpisem – puste = nic (bez identycznego formularza pod każdym wpisem)
        invitation: fields.text({
          label: 'Zaproszenie pod wpisem',
          multiline: true,
          description: 'Nieobowiązkowe. Pytanie do czytelników związane z tym wpisem, np. „Pamiętasz szkołę w Testowie? Może masz zdjęcie klasy?”. Pod wpisem pojawi się sekcja „dopowiedz tę historię” z formularzem wspomnienia. Puste – sekcji nie ma.',
        }),
        about: fields.text({
          label: 'Dzień, którego dotyczy wpis',
          description: 'Nieobowiązkowe. Dokładna data wydarzenia, np. 1915-08-12 – wpis pojawi się w „ten dzień w historii” na stronie głównej.',
          validation: { pattern: { regex: /^$|^\d{4}-\d{2}-\d{2}$/, message: 'Data w zapisie RRRR-MM-DD albo puste.' } },
        }),
        visibility: widocznosc(),
        note: notatka(),
        // Dawne tagi (#historia, #tech…) – zachowane w plikach, niewidoczne w panelu i na stronie.
        tags: fields.ignored(),
        content: opisMarkdoc('Treść', 'posts'),
      },
    }),
    miejsca: collection({
      label: 'Miejsca',
      slugField: 'title',
      path: 'content/miejsca/*',
      format: { contentField: 'description' },
      columns: ['title', 'type'],
      schema: {
        title: nazwaIIdentyfikator('Nazwa'),
        alternative: inneNazwy(),
        inflections: formyOdmiany(),
        type: fields.select({
          label: 'Rodzaj',
          options: [
            { label: 'wieś', value: 'wies' },
            { label: 'miasto', value: 'miasto' },
            { label: 'kraina (np. ziemia łosicka)', value: 'kraina' },
            { label: 'gmina', value: 'gmina' },
            { label: 'parafia', value: 'parafia' },
            { label: 'folwark', value: 'folwark' },
            { label: 'inne', value: 'inne' },
          ],
          defaultValue: 'wies',
        }),
        coordinates: fields.text({
          label: 'Współrzędne',
          description: 'Szerokość, długość – np. 52.1860, 22.5627 (skopiuj z OpenStreetMap lub Google Maps).',
          validation: { pattern: { regex: WSPOLRZEDNE_REGEX, message: 'Zapis: 52.1860, 22.5627' } },
        }),
        approximate: fields.checkbox({ label: 'Położenie przybliżone' }),
        religions: fields.array(
          fields.select({
            label: 'Wyznanie',
            options: Object.entries(WYZNANIA).map(([value, w]) => ({ label: w.nazwa, value })),
            defaultValue: 'unickie',
          }),
          {
            label: 'Wyznania mieszkańców przed 1875',
            description: 'Stan sprzed kasaty unii – od tego zależy znak wsi na mapie. Pierwsze na liście = przeważające (kolejność zmienisz przeciągając). Puste = nieopisane.',
            itemLabel: (p) => WYZNANIA[p.value as keyof typeof WYZNANIA]?.nazwa ?? p.value,
          },
        ),
        religionsEqual: fields.checkbox({
          label: 'Wyznania równorzędne',
          description: 'Zaznacz, gdy żadne nie przeważało (np. miasteczko z parafią, cerkwią i bóżnicą). Na mapie pasy tej samej szerokości.',
        }),
        // okresy przy wyznaniach (P3, decyzja 17.11): osobne pole – „przed 1875” i znak na mapie bez zmian
        religionsOverTime: fields.array(
          fields.object({
            religion: fields.select({
              label: 'Wyznanie',
              options: Object.entries(WYZNANIA).map(([value, w]) => ({ label: w.nazwa, value })),
              defaultValue: 'unickie',
            }),
            from: fields.integer({ label: 'Od roku', description: 'Puste – nie wiadomo.' }),
            to: fields.integer({ label: 'Do roku', description: 'Puste – do dziś albo nie wiadomo.' }),
            source: fields.text({ label: 'Źródło', description: 'Skąd wiadomo (spis, schematyzm, opracowanie).' }),
          }),
          {
            label: 'Wyznania w czasie',
            description: 'Wyznania mieszkańców w kolejnych okresach (np. unickie do 1875, prawosławne 1875–1905, rzymskokatolickie od 1905). Nie zmienia pola „przed 1875” ani znaku na mapie. Puste – wiersz się nie pokazuje.',
            itemLabel: (p) => [WYZNANIA[p.fields.religion.value as keyof typeof WYZNANIA]?.nazwa ?? p.fields.religion.value, [p.fields.from.value, p.fields.to.value].map((x) => x ?? '…').join('–')].join(' '),
          },
        ),
        isPartOf: fields.relationship({
          label: 'Należy do',
          description: 'Wieś → gmina albo kraina, gmina → kraina (np. Olszanka → gmina Olszanka → ziemia łosicka). Na tej podstawie dzieli się spis miejscowości.',
          collection: 'miejsca',
        }),
        parishes: fields.array(
          fields.object({
            parish: fields.relationship({ label: 'Parafia / urząd', collection: 'parafie' }),
            from: fields.integer({ label: 'Od roku', description: 'Puste – od zawsze / nie wiadomo.' }),
            to: fields.integer({ label: 'Do roku', description: 'Puste – do dziś / do końca istnienia parafii.' }),
          }),
          {
            label: 'Parafie',
            description: 'Parafie (i okręgi bóżnicze, USC), do których należała wieś. Na tej podstawie strona wsi pokazuje księgi metrykalne.',
            itemLabel: (p) => [p.fields.parish.value ?? 'parafia', [p.fields.from.value, p.fields.to.value].filter((x) => x != null).join('–')].filter(Boolean).join(' '),
          },
        ),
        sameAs: fields.url({ label: 'Wikidata / GeoNames', description: 'Adres strony tego miejsca w Wikidata lub GeoNames (opcjonalnie).' }),
        visibility: widocznosc(),
        note: notatka(), contributeHide: bezWspoltworz(),
        dateSubmitted: dodano(),
        sources: zrodlaKarty(),
        descriptionSource: fields.text({ label: 'Źródło opisu', description: 'Np. „na podstawie: Wikipedia, hasło Olszanka (powiat łosicki), CC BY-SA 4.0 – https://pl.wikipedia.org/wiki/…”. Adresy zamieniają się w odnośniki.', multiline: true }),
        // KRT-02 (P3): pochodzenie nazwy w części „podstawowe” karty, ze źródłem
        nameOrigin: fields.text({ label: 'Pochodzenie nazwy', description: 'Etymologia nazwy miejscowości – krótko (1–3 zdania). Puste – wiersz się nie pokazuje.', multiline: true }),
        nameOriginSource: fields.text({ label: 'Pochodzenie nazwy – źródło', description: 'Np. „K. Rymut, Nazwy miejscowe Polski, t. 7, s. 123”. Adresy zamieniają się w odnośniki.' }),
        reportedBy: zglosil(),
        intro: fields.text({ label: 'Wstęp', description: 'Krótki tekst nad tabelą karty (2–3 zdania, pisany ręcznie). Puste – nad tabelą nic się nie pokazuje (karta nie skraca już historii).', multiline: true, validation: { length: { max: 600 } } }),
        description: opisMarkdoc('Historia i opis', 'miejsca'),
      },
    }),
    tematy: collection({
      label: 'Tematy',
      slugField: 'title',
      path: 'content/tematy/*',
      format: { contentField: 'description' },
      columns: ['title', 'temporal'],
      schema: {
        title: nazwaIIdentyfikator('Nazwa'),
        alternative: inneNazwy(),
        inflections: formyOdmiany(),
        type: fields.select({
          label: 'Rodzaj',
          options: [
            { label: 'zjawisko', value: 'zjawisko' },
            { label: 'wydarzenie', value: 'wydarzenie' },
            { label: 'instytucja', value: 'instytucja' },
          ],
          defaultValue: 'zjawisko',
        }),
        temporal: dataEdtf('Czas'),
        spatial: fields.multiRelationship({ label: 'Miejsca', collection: 'miejsca' }),
        reportedBy: zglosil(),
        visibility: widocznosc(),
        note: notatka(),
        dateSubmitted: dodano(),
        sources: zrodlaKarty(),
        description: opisMarkdoc('Opis', 'tematy'),
      },
    }),
    obiekty: collection({
      label: 'Obiekty w terenie',
      slugField: 'title',
      path: 'content/obiekty/*',
      format: { contentField: 'description' },
      columns: ['title', 'type'],
      schema: {
        title: nazwaIIdentyfikatorObiektu(),
        alternative: inneNazwy(),
        type: fields.select({
          label: 'Rodzaj',
          options: Object.entries(NAZWY_OBIEKTOW).map(([value, label]) => ({ label, value })),
          defaultValue: 'cerkiew-unicka',
        }),
        spatial: fields.relationship({ label: 'Miejscowość', description: 'Główna miejscowość (okruszki, kolejność).', collection: 'miejsca' }),
        // OBJ-06: obiekt w kilku miejscowościach (np. jezioro na granicy) – pokazany równorzędnie na kartach wszystkich
        spatialAlso: fields.multiRelationship({ label: 'Także w miejscowościach', description: 'Gdy obiekt leży w kilku miejscowościach (np. jezioro, droga, las). Główna – pole wyżej.', collection: 'miejsca' }),
        coordinates: fields.text({
          label: 'Współrzędne',
          description: 'Miejsce budynku – np. 52.2116, 22.7185. Bez współrzędnych obiekt nie pojawi się na mapie.',
          validation: { pattern: { regex: WSPOLRZEDNE_REGEX, message: 'Zapis: 52.2116, 22.7185' } },
        }),
        approximate: fields.checkbox({ label: 'Położenie przybliżone' }),
        temporal: dataEdtf('Lata istnienia'),
        exists: fields.checkbox({ label: 'Istnieje do dziś', defaultValue: true }),
        institutions: fields.array(
          fields.object({
            parish: fields.relationship({ label: 'Parafia / urząd', collection: 'parafie' }),
            from: fields.integer({ label: 'Od roku (opcjonalnie)' }),
            to: fields.integer({ label: 'Do roku (opcjonalnie)' }),
            source: fields.text({ label: 'Źródło powiązania (opcjonalnie)' }),
          }),
          {
            label: 'Powiązane parafie i urzędy',
            description: 'Związek obiektu (kościoła, cerkwi, plebanii itd.) z instytucją. Może zmieniać się w czasie. Nie jest to przynależność parafialna miejscowości.',
            itemLabel: (p) => [p.fields.parish.value ?? 'instytucja', [p.fields.from.value, p.fields.to.value].filter((x) => x != null).join('–')].filter(Boolean).join(' '),
          },
        ),
        photos: fields.array(
          fields.object({
            image: fields.image({
              label: 'Zdjęcie',
              description: 'Prawdziwa fotografia obiektu (JPG/PNG). Plik nie trafia do public/ – strona wydaje go tylko, gdy obiekt jest widoczny; dane GPS z pliku są usuwane przy wyświetlaniu.',
              directory: `${KATALOG_PLIKOW}/obiekty`,
              publicPath: `${ADRES_PLIKOW}obiekty/`,
            }),
            caption: fields.text({ label: 'Podpis', description: 'Co widać, np. „cerkiew od strony południowej”.' }),
            date: fields.text({ label: 'Data zdjęcia', description: 'Np. 2024, 1938 (EDTF albo opisowo).' }),
            creator: fields.text({ label: 'Autor zdjęcia' }),
            rights: fields.text({ label: 'Prawa / źródło', description: 'Np. CC BY 4.0, zbiory rodziny Kowalskich, NAC sygn. …' }),
            focus: fields.select({
              label: 'Kadr miniatury',
              description: 'Którą część zdjęcia zostawić, gdy miniatura je przycina (np. „góra” dla twarzy, wieży). Zdjęcie w pełnym widoku zawsze całe.',
              options: [{ label: 'środek', value: 'srodek' }, { label: 'góra', value: 'gora' }, { label: 'dół', value: 'dol' }, { label: 'lewa', value: 'lewa' }, { label: 'prawa', value: 'prawa' }],
              defaultValue: 'srodek',
            }),
          }),
          { label: 'Fotografie', itemLabel: (p) => p.fields.caption.value || 'zdjęcie' },
        ),
        reportedBy: zglosil(),
        visibility: widocznosc(),
        note: notatka(), contributeHide: bezWspoltworz(),
        dateSubmitted: dodano(),
        sources: zrodlaKarty(),
        description: opisMarkdoc('Opis i historia', 'obiekty'),
      },
    }),
    materialy: collection({
      label: 'Materiały (archiwum)',
      slugField: 'title',
      path: 'content/materialy/*',
      format: { contentField: 'description' },
      columns: ['title', 'type', 'temporal'],
      schema: {
        title: nazwaIIdentyfikator('Tytuł'),
        type: fields.select({
          label: 'Rodzaj',
          options: Object.entries(RODZAJE_MATERIALOW).map(([value, label]) => ({ label, value })),
          defaultValue: 'dokument',
        }),
        file: fields.file({
          label: 'Plik',
          description: 'Skan, zdjęcie, nagranie (mp3, m4a), film (mp4) albo PDF. Plik nie trafia do public/ – strona wydaje go tylko tym, którzy mogą widzieć materiał.',
          directory: KATALOG_PLIKOW,
          publicPath: ADRES_PLIKOW,
        }),
        temporal: dataEdtf('Data powstania'),
        creator: fields.text({ label: 'Autor / wytwórca', description: 'Kto wytworzył oryginał: fotograf, parafia, urząd, osoba nagrywana.' }),
        provenance: fields.text({ label: 'Przekazał(a)', description: 'Kto udostępnił materiał archiwum, np. „Anna Nowak, zbiory rodzinne”. Puste – nie pokazuje się.' }),
        contributor: fields.text({ label: 'Opracował(a)', description: 'Kto przygotował opis, transkrypcję lub tłumaczenie. Puste – autor strony (w „jak cytować”).' }),
        source: fields.text({ label: 'Pochodzenie', description: 'Skąd pochodzi: archiwum i zespół, zbiory rodzinne, od kogo otrzymane.', multiline: true }),
        identifier: fields.text({ label: 'Sygnatura', description: 'Np. AP Lublin 35/99/0/1/405, nr aktu, nr zdjęcia.' }),
        rights: fields.text({ label: 'Prawa', description: 'Np. domena publiczna, CC BY 4.0, „za zgodą rodziny – tylko do wglądu”.' }),
        focus: fields.select({
            label: 'Kadr miniatury',
            description: 'Którą część zdjęcia zostawić, gdy miniatura je przycina (np. „góra” dla twarzy, wieży). Zdjęcie w pełnym widoku zawsze całe.',
            options: [{ label: 'środek', value: 'srodek' }, { label: 'góra', value: 'gora' }, { label: 'dół', value: 'dol' }, { label: 'lewa', value: 'lewa' }, { label: 'prawa', value: 'prawa' }],
            defaultValue: 'srodek',
          }),
        credit: fields.text({ label: 'Podpis źródła pod skanem', description: 'Krótka linia widoczna zawsze pod skanem lub mapą: archiwum, zespół, sygnatura, licencja – np. „AP Siedlce, 62/1106, sygn. 12 · domena publiczna”. Puste – złożona z miejsca przechowywania, sygnatury i praw.' }),
        language: fields.text({ label: 'Język', description: 'Np. polski, łacina, rosyjski.' }),
        spatial: fields.multiRelationship({ label: 'Miejsca', collection: 'miejsca' }),
        subject: fields.multiRelationship({ label: 'Tematy', collection: 'tematy' }),
        relation: fields.multiRelationship({ label: 'Przedstawia obiekty', description: 'Np. zdjęcie cerkwi, nagrobka.', collection: 'obiekty' }),
        collections: fields.multiRelationship({ label: 'Zbiory / kolekcje', collection: 'zbiory', description: 'Jeden materiał może należeć do wielu zbiorów; nie twórz kopii.' }),
        institutions: fields.multiRelationship({ label: 'Powiązane instytucje (parafie / urzędy)', collection: 'parafie' }),
        peopleIds: fields.array(fields.text({ label: 'Identyfikator osoby' }), { label: 'Powiązane osoby', description: 'Identyfikatory osób z drzewa; bez kopiowania ich kart.', itemLabel: (p) => p.value }),
        repository: fields.text({ label: 'Miejsce przechowywania', description: 'Archiwum, instytucja lub prywatny depozyt.' }),
        transcription: fields.text({ label: 'Transkrypcja do wyszukiwania', multiline: true, description: 'Opcjonalnie tekst odczytu. Nie wklejaj materiałów prywatnych do publicznego rekordu.' }),
        reportedBy: zglosil(),
        visibility: fields.select({
          label: 'Widoczność',
          description: 'Nagranie bez zgody osoby nagranej – „tylko ja”.',
          options: [
            { label: 'publiczne', value: 'publiczne' },
            { label: 'dla bliskich', value: 'bliscy' },
            { label: 'tylko ja', value: 'ja' },
          ],
          defaultValue: 'publiczne',
        }),
        note: notatka(), contributeHide: bezWspoltworz(),
        dateSubmitted: dodano(),
        sources: zrodlaKarty(),
        description: opisMarkdoc('Opis, transkrypcja, tłumaczenie', 'materialy'),
      },
    }),
    // PACZKA5_2026: zbiory i publikacje są oddzielnymi bytami (nie tematami i nie księgami).
    zbiory: collection({
      label: 'Zbiory i kolekcje', slugField: 'title', path: 'content/zbiory/*',
      format: { contentField: 'description' }, columns: ['title'],
      schema: {
        title: nazwaIIdentyfikator('Nazwa zbioru'),
        provenance: fields.text({ label: 'Pochodzenie / przekazał(a)', multiline: true }),
        rights: fields.text({ label: 'Prawa do zbioru' }),
        reportedBy: zglosil(),
        visibility: widocznosc(), sources: zrodlaKarty(), note: notatka(),
        description: opisMarkdoc('Opis zbioru', 'zbiory'),
      },
    }),
    publikacje: collection({
      label: 'Publikacje i opracowania', slugField: 'title', path: 'content/publikacje/*',
      columns: ['title', 'type'],
      schema: {
        title: nazwaIIdentyfikator('Tytuł publikacji'),
        type: fields.select({ label: 'Rodzaj', options: [
          { label: 'książka', value: 'ksiazka' }, { label: 'artykuł', value: 'artykul' },
          { label: 'prasa', value: 'prasa' }, { label: 'opracowanie', value: 'opracowanie' },
          { label: 'baza / serwis', value: 'baza' },
        ], defaultValue: 'ksiazka' }),
        creator: fields.text({ label: 'Autor / redakcja' }),
        year: fields.text({ label: 'Rok publikacji' }),
        publisher: fields.text({ label: 'Wydawnictwo / czasopismo / serwis' }),
        identifier: fields.text({ label: 'ISBN / ISSN / sygnatura biblioteczna' }),
        url: fields.url({ label: 'Adres publikacji lub katalogu' }),
        spatial: fields.multiRelationship({ label: 'Miejsca', collection: 'miejsca' }),
        subject: fields.multiRelationship({ label: 'Tematy', collection: 'tematy' }),
        reportedBy: zglosil(),
        visibility: widocznosc(), note: notatka(),
        description: fields.text({ label: 'Opis bibliograficzny', multiline: true }),
      },
    }),
    parafie: collection({
      label: 'Parafie i urzędy',
      slugField: 'title',
      path: 'content/parafie/*',
      columns: ['title', 'religion'],
      schema: {
        title: nazwaIIdentyfikator('Nazwa'),
        religion: fields.select({
          label: 'Wyznanie',
          options: Object.entries(WYZNANIA_PARAFII).map(([value, label]) => ({ label, value })),
          defaultValue: 'rzymskokatolicka',
        }),
        seat: fields.relationship({ label: 'Siedziba', description: 'Miejscowość, w której była cerkiew, kościół, bóżnica, urząd.', collection: 'miejsca' }),
        temporal: dataEdtf('Okres istnienia'),
        diocese: fields.text({ label: 'Diecezja / dekanat', description: 'Np. diecezja chełmska (unicka), dekanat łosicki.' }),
        sameAs: fields.url({ label: 'Strona w sieci', description: 'Np. hasło w Wikipedii, strona parafii.' }),
        description: fields.text({ label: 'Opis', multiline: true }),
        people: fields.array(
          fields.object({
            name: fields.text({ label: 'Imię i nazwisko', validation: { isRequired: true } }),
            role: fields.text({ label: 'Funkcja / rola', description: 'Np. proboszcz, duchowny, urzędnik, kantor.' }),
            period: fields.text({ label: 'Okres pełnienia funkcji', description: 'Np. 1865–1873 albo ok. 1900.' }),
            personId: fields.text({ label: 'ID osoby w drzewie (opcjonalnie)', description: 'Tylko jeśli istnieje odpowiadająca karta /osoby/[id]. Odnośnik pokazuje się tylko czytelnikom, którzy widzą tę kartę.' }),
            source: fields.text({ label: 'Źródło związku', description: 'PAR-06: skąd wiadomo o tej funkcji (schematyzm, akt, opracowanie). Pokazywane na karcie instytucji i w „funkcjach” na karcie osoby.' }),
          }),
          { label: 'Osoby związane z instytucją', itemLabel: (p) => p.fields.name.value || 'osoba' },
        ),
        sources: zrodlaKarty(),
        reportedBy: zglosil(),
        note: notatka(),
      },
    }),
    hasla: collection({
      label: 'Słownik (pojęcia i gwara)',
      slugField: 'title',
      path: 'content/hasla/*',
      columns: ['title', 'kind'],
      schema: {
        title: nazwaIIdentyfikator('Hasło'),
        kind: fields.select({
          label: 'Rodzaj',
          options: [
            { label: 'pojęcie historyczne', value: 'pojecie' },
            { label: 'gwara, słowo miejscowe', value: 'gwara' },
            { label: 'urząd, urzędnik', value: 'urzad' },
            { label: 'miara, waluta', value: 'miara' },
            { label: 'wyznanie, obrzęd', value: 'wyznanie' },
          ],
          defaultValue: 'pojecie',
        }),
        meaning: fields.text({ label: 'Znaczenie', multiline: true, validation: { length: { min: 1 } } }),
        example: fields.text({ label: 'Przykład użycia', description: 'Np. cytat z dokumentu albo zdanie z rozmowy – w cudzysłowie, ze źródłem.', multiline: true }),
        source: fields.text({ label: 'Źródło', description: 'Skąd znaczenie: słownik, opracowanie, rozmowa (kto, kiedy). Zawsze warto podać.' }),
        variants: fields.array(fields.text({ label: 'Forma' }), { label: 'Inne formy i odmiana', description: 'Do wyszukiwania i rozpoznawania słowa w tekstach archiwum, np. „rubla”, „rublach”.', itemLabel: (p) => p.value }),
        // SLW-02 (P3): strona hasła – etymologia, występowanie, opracowanie, „zobacz też”, „zgłosił(a)”
        etymology: fields.text({ label: 'Pochodzenie słowa (etymologia)', multiline: true }),
        occurrence: fields.multiRelationship({ label: 'Występowanie (miejscowości)', collection: 'miejsca', description: 'Gdzie słowo było używane – na karcie miejscowości pojawi się w „słowach z tej miejscowości”.' }),
        seeAlso: fields.multiRelationship({ label: 'Zobacz też', collection: 'hasla' }),
        contributor: fields.text({ label: 'Opracował(a)' }),
        contributed: fields.date({ label: 'Data opracowania' }),
        reportedBy: zglosil(),
        visibility: widocznosc(),
        note: notatka(),
      },
    }),
    biogramy: collection({
      label: 'Osoby – biogramy',
      slugField: 'title',
      path: 'content/biogramy/*',
      format: { contentField: 'content' },
      entryLayout: 'content',
      columns: ['title'],
      schema: {
        title: fields.slug({
          name: { label: 'Osoba', description: 'Jak na karcie w drzewie, np. Jan Kowalski (1862–1931). Widoczność biogramu = widoczność osoby w drzewie.' },
          slug: {
            label: 'Identyfikator osoby z drzewa',
            description: 'Taki sam jak w „Osoby i drzewo” (np. jan-kowalski-1862) – po nim biogram łączy się z kartą osoby. Najprościej założyć biogram przyciskiem „napisz biogram →” na karcie osoby w panelu.',
          },
        }),
        lead: fields.text({
          label: 'Jednym zdaniem',
          multiline: true,
          description: 'Kim była ta osoba – pod nazwiskiem na karcie, na liście osób i w losowej karcie na stronie głównej.',
        }),
        content: opisMarkdoc('Biogram', 'biogramy'),
      },
    }),
    zespoly: collection({
      label: 'Zespoły archiwalne',
      slugField: 'title',
      path: 'content/zespoly/*',
      columns: ['title', 'identifier'],
      schema: {
        title: nazwaIIdentyfikator('Nazwa zespołu archiwalnego'),
        identifier: fields.text({ label: 'Sygnatura zespołu', validation: { isRequired: true } }),
        repository: fields.text({ label: 'Archiwum / instytucja przechowująca' }),
        source: fields.url({ label: 'Karta zespołu w katalogu źródłowym' }),
        description: fields.text({ label: 'Opis i uwagi', multiline: true }),
      },
    }),
    ksiegi: collection({
      label: 'Księgi metrykalne',
      slugField: 'title',
      path: 'content/ksiegi/*',
      columns: ['title', 'years'],
      schema: {
        title: nazwaIIdentyfikator('Nazwa (np. Olszanka unicka – urodzenia 1826–1875)'),
        fonds: fields.relationship({ label: 'Zespół archiwalny (opcjonalnie)', collection: 'zespoly', description: 'Jeden zespół może zawierać wiele ksiąg; brak przypisania nie usuwa dotychczasowej sygnatury.' }),
        parish: fields.relationship({ label: 'Instytucja główna / wytwórca (gdy wiadomo)', collection: 'parafie' }),
        relatedParishes: fields.multiRelationship({
          label: 'Pozostałe instytucje, których dotyczą akta',
          description: 'Może być kilka parafii/urzędów; nie należy zgadywać wytwórcy. Nie jest to powiązanie wsi z parafią.',
          collection: 'parafie',
        }),
        relatedReligions: fields.multiselect({
          label: 'Wyznania, których dotyczą akta',
          options: Object.entries(WYZNANIA_PARAFII).map(([value, label]) => ({ label, value })),
          defaultValue: [],
        }),
        types: fields.multiselect({
          label: 'Rodzaje aktów',
          description: 'Zaznacz wszystkie, które są w tej księdze – np. małżeństwa i zgony w jednym tomie.',
          options: Object.entries(RODZAJE_KSIAG).map(([value, label]) => ({ label, value })),
          defaultValue: ['urodzenia'],
        }),
        spatial: fields.multiRelationship({
          label: 'Miejscowości',
          description: 'Których wsi dotyczą akty w tej księdze. Puste = wszystkie wsie parafii z tych lat. Zaznacz, gdy księga obejmuje tylko część parafii albo wieś spoza niej.',
          collection: 'miejsca',
        }),
        years: fields.text({ label: 'Lata', description: 'Np. „1826–1875, 1880, 1885–1890”. Z tego powstaje pasek lat w inwentarzu. Przy zespole z osobnymi tomami można zostawić puste – lata policzą się z jednostek niżej.' }),
        gaps: fields.text({ label: 'Braki i uwagi do lat', description: 'Np. „brak 1863, rok 1870 uszkodzony”.' }),
        language: fields.text({ label: 'Język', description: 'Np. polski, łacina, rosyjski (od 1868).' }),
        repository: fields.text({ label: 'Gdzie przechowywane', description: 'Np. AP Siedlce, Archiwum Diecezjalne w Siedlcach, parafia, USC Łosice.' }),
        identifier: fields.text({ label: 'Zespół i sygnatura', description: 'Np. 72/290/0/2/45. Przy zespole z osobnymi tomami – sam numer zespołu (np. 72/290), a sygnatury tomów niżej.' }),
        volumes: fields.array(
          fields.object({
            years: fields.text({ label: 'Rok lub lata', description: 'Np. 1810 albo 1811–1812.', validation: { isRequired: true } }),
            identifier: fields.text({ label: 'Sygnatura tomu', description: 'Np. 72/290/0/2/1.' }),
            title: fields.text({ label: 'Oryginalny tytuł jednostki' }),
            scans: fields.url({ label: 'Skany tego tomu' }),
            scanCount: fields.integer({ label: 'Liczba skanów', description: '0 = brak skanów, puste = nie ustalono.' }),
            digitization: fields.select({
              label: 'Dostępność digitalizacji',
              options: [{ value: 'online', label: 'skany istnieją' }, { value: 'brak', label: 'brak skanów online' }, { value: 'nieustalone', label: 'nie ustalono' }],
              defaultValue: 'nieustalone',
            }),
            gaps: fields.text({ label: 'Uwagi', description: 'Np. „brak kart 5–8”, „tylko alegata”.' }),
          }),
          {
            label: 'Jednostki (tomy)',
            description: 'Gdy zespół ma osobny tom na każdy rok (np. 1810–1825 = 16 tomów): jeden wpis na tom. W spisie pokażą się jako rozwijana lista pod księgą.',
            itemLabel: (p) => [p.fields.years.value, p.fields.identifier.value].filter(Boolean).join(' · ') || 'nowy tom',
          },
        ),
        access: fields.select({
          label: 'Dostęp',
          options: Object.entries(DOSTEP_KSIAG).map(([value, label]) => ({ label, value })),
          defaultValue: 'skany',
        }),
        scans: fields.url({ label: 'Skany', description: 'Np. szukajwarchiwach.gov.pl, metryki.genealodzy.pl, FamilySearch.' }),
        index: fields.url({ label: 'Indeks', description: 'Np. Geneteka.' }),
        visibility: widocznosc(),
        note: notatka(),
      },
    }),
  },
  singletons: {
    przekierowania: singleton({
      label: 'Przekierowania adresów',
      path: 'content/_panel/przekierowania',
      format: { data: 'json' },
      schema: {
        wpisy: fields.array(
          fields.object({
            rodzaj: fields.select({
              label: 'Rodzaj',
              options: [
                { label: 'miejscowość', value: 'miejsca' }, { label: 'parafia / urząd', value: 'parafie' },
                { label: 'obiekt', value: 'obiekty' }, { label: 'temat', value: 'tematy' },
                { label: 'wpis', value: 'wpisy' }, { label: 'materiał archiwalny', value: 'archiwum' },
              ],
              defaultValue: 'parafie',
            }),
            stary: fields.text({ label: 'Stary identyfikator', description: 'Część adresu po ukośniku, np. gmina-prochenki-powiat-losice.', validation: { isRequired: true } }),
            nowy: fields.text({ label: 'Nowy identyfikator', description: 'Istniejący wpis. Przy podziale wybierz ten, który najlepiej zastępuje stary.', validation: { isRequired: true } }),
            uwaga: fields.text({ label: 'Uwaga (dla Ciebie)' }),
          }),
          { label: 'Przekierowania', description: 'Stary adres po zmianie identyfikatora prowadzi do nowego (zamiast „nie znaleziono”). Panel jakości sprawdza, czy nowy istnieje.', itemLabel: (p) => `${p.fields.stary.value || '…'} → ${p.fields.nowy.value || '…'}` },
        ),
      },
    }),
    // OPS-07 (P3, decyzja 17.11): kręgi osób i wiersze stopki w danych, nie w kodzie. Bez zapisu – lista domyślna (stan sprzed P3).
    kregiStopka: singleton({
      label: 'Kręgi i stopka',
      path: 'content/_panel/kregi-stopka',
      format: { data: 'json' },
      schema: {
        kregi: fields.array(
          fields.object({
            nazwa: fields.text({ label: 'Nazwa', validation: { isRequired: true } }),
            opis: fields.text({ label: 'Opis', description: 'Np. „okolice Olszanki i Łosic” – pod pastylką na stronie osób.' }),
          }),
          { label: 'Kręgi (filtr na stronie osób)', description: 'Puste – kręgi domyślne (krąg 1: okolice Olszanki i Łosic, krąg 2: okolice Międzyrzeca i Krzesk). Pierwsze wypełnienie obecną listą: npm run kregi:domyslne -- --zapisz. Kolejność = numer kręgu (1, 2…). Osoba należy do kręgu, gdy któreś jej zdarzenie miało miejsce w miejscowości z wierszy tego kręgu.', itemLabel: (p) => p.fields.nazwa.value || 'krąg' },
        ),
        wiersze: fields.array(
          fields.object({
            krag: fields.integer({ label: 'Numer kręgu', description: '1, 2… według kolejności kręgów wyżej; puste – wiersz tylko w stopce.' }),
            miejsca: fields.array(fields.text({ label: 'Miejscowość' }), { label: 'Miejscowości (w kolejności stopki)', itemLabel: (p) => p.value || 'miejscowość' }),
          }),
          { label: 'Wiersze stopki', description: 'Puste – trzy wiersze domyślne (stan sprzed P3). Każdy wiersz to osobna linia stopki. Nazwa z własną publiczną stroną staje się odnośnikiem (dopasowanie po nazwie).', itemLabel: (p) => `krąg ${p.fields.krag.value ?? '–'}: ${p.fields.miejsca.elements.length} miejscowości` },
        ),
      },
    }),
    wstepyDzialow: singleton({
      label: 'Wstępy działów',
      path: 'content/_panel/wstepy-dzialow',
      format: { data: 'json' },
      // P2 (ADM-06): jedna definicja pól wstępu; kolejność i klucze zgodne z lib/strony/wstepy.ts (DZIALY)
      schema: Object.fromEntries(([
        ['wpisy', 'Wpisy'], ['miejsca', 'Miejsca'], ['osoby', 'Osoby'], ['tematy', 'Tematy'], ['archiwum', 'Archiwum'],
        ['zbiory', 'Zbiory i kolekcje'], ['biblioteka', 'Biblioteka'], ['publikacje', 'Publikacje'], ['instytucje', 'Instytucje'], ['obiekty', 'Obiekty'],
        ['ksiegi', 'Księgi metrykalne'], ['slownik', 'Słownik'], ['plany', 'Plany i schematy'],
      ] as const).map(([klucz, nazwa]) => [klucz, fields.object({
        tytul: fields.text({ label: 'Tytuł (opcjonalny)' }),
        wstep: fields.text({ label: 'Wstęp (opcjonalny)', multiline: true }),
        linkTekst: fields.text({ label: 'Podpis linku redakcyjnego' }),
        linkAdres: fields.text({ label: 'Adres linku (/ścieżka albo https://...)' }),
      }, { label: nazwa })])),
    }),
    stronaGlowna: singleton({
      label: 'Strona główna',
      path: 'content/strona-glowna',
      schema: {
        intro: fields.text({
          label: 'Wstęp',
          description: 'Tekst na górze strony głównej, obok losowej karty. Pusty wiersz zaczyna nowy akapit.',
          multiline: true,
          defaultValue: WSTEP_DOMYSLNY,
        }),
      },
    }),
    oProjekcie: singleton({
      label: 'O projekcie',
      path: 'content/o-projekcie',
      format: { contentField: 'content' },
      schema: {
        // etap R (decyzja 17.11): jeden adres na stronie „o projekcie” i przy formularzu „współtwórz”
        contact: fields.text({
          label: 'Adres e-mail do kontaktu',
          description: 'Pokazywany w „o projekcie” i przy formularzu „współtwórz” (pliki). Składany w przeglądarce – nie ma go w HTML strony. Nigdy prywatny adres.',
          defaultValue: 'kontakt@odniepamieci.pl',
          validation: { pattern: { regex: /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i, message: 'Podaj adres e-mail.' } },
        }),
        content: opisMarkdoc('Treść', 'o-projekcie'),
      },
    }),
    // PK: menu panelu w danych (zasada 2.7) – ukrywanie pozycji i kolejność grup; domyślne menu: lib/panel/menu.ts
    menuPanelu: singleton({
      label: 'Menu panelu',
      path: 'content/_panel/menu-panelu',
      format: { data: 'json' },
      schema: {
        ukryte: fields.multiselect({
          label: 'Ukryte pozycje',
          description: 'Zaznaczone pozycje znikają z menu panelu (przycisk „pokaż wszystko” na dole menu pokazuje je na chwilę). Pulpitu i tego ustawienia nie da się ukryć.',
          options: pozycjeDoUstawien(),
        }),
        kolejnosc: fields.array(
          fields.select({ label: 'Grupa', options: MENU.map((g) => ({ value: g.klucz, label: g.nazwa })), defaultValue: MENU[0].klucz }),
          { label: 'Kolejność grup', description: 'Puste – kolejność domyślna. Grupy niewymienione trafiają na koniec w domyślnej kolejności.', itemLabel: (p) => MENU.find((g) => g.klucz === p.value)?.nazwa ?? p.value },
        ),
      },
    }),
  },
});

// PK: „na stronie ↗” w pasku pozycji Keystatic – adres strony publicznej z jednego miejsca (lib/panel/menu.ts)
for (const [klucz, k] of Object.entries(konfiguracja.collections ?? {}) as [string, { previewUrl?: string }][]) {
  if (STRONA_PUBLICZNA[klucz]) k.previewUrl = STRONA_PUBLICZNA[klucz];
}
for (const [klucz, k] of Object.entries(konfiguracja.singletons ?? {}) as [string, { previewUrl?: string }][]) {
  if (STRONA_PUBLICZNA[klucz]) k.previewUrl = STRONA_PUBLICZNA[klucz];
}

export default konfiguracja;
