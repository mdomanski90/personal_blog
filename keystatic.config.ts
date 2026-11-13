import { config, collection, singleton, fields } from '@keystatic/core';
import { wrapper, repeating, block } from '@keystatic/core/content-components';
import { EDTF_OPIS, EDTF_REGEX } from './lib/edtf';
import { identyfikatorZNazwy } from './lib/tekst';
import { NAZWY_OBIEKTOW, WYZNANIA } from './lib/tarcze';
import { RODZAJE_MATERIALOW } from './lib/materialy';
import { ADRES_PLIKOW, KATALOG_PLIKOW } from './lib/pliki';
import { WYZNANIA_PARAFII, RODZAJE_KSIAG, DOSTEP_KSIAG } from './lib/ksiegi';

// Model danych: claude/odniepamieci-model-danych.md (projekt „own www”).
// Nazwy pól w plikach jak w Dublin Core – ułatwia późniejszy eksport do Omeka S.

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

const notatka = () =>
  fields.text({ label: 'Notatka robocza', description: 'Widoczna tylko w panelu, nie trafia na stronę ani do eksportu.', multiline: true });

const dodano = () => fields.date({ label: 'Dodano', defaultValue: { kind: 'today' } });

// Wyróżnione fragmenty w treści: transkrypcja, tłumaczenie, cytat, oryginał –
// w ramce z etykietą i źródłem; „oryginał i tłumaczenie” w dwóch kolumnach.
// Wygląd: lib/markdoc.ts (znaczniki zrodlo, dwujezyczne, kolumna) i app/globals.css (.zrodlo).
const komponenty = {
  zrodlo: wrapper({
    label: 'Źródło (transkrypcja, tłumaczenie, cytat)',
    description: 'Tekst z dokumentu w ramce z etykietą. Luki w nawiasach kwadratowych, np. [...], będą przygaszone.',
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

export default config({
  storage: {
    kind: 'local',
  },
  ui: {
    brand: { name: 'odniepamieci.pl' },
    navigation: {
      'Treści': ['posts', 'miejsca', 'obiekty', 'tematy', 'biogramy'],
      'Archiwum': ['materialy'],
      'Księgi metrykalne': ['parafie', 'ksiegi'],
      'Słownik': ['hasla'],
      'Strony': ['oProjekcie'],
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
          ],
          defaultValue: 'o-zrodle',
        }),
        spatial: fields.multiRelationship({ label: 'Miejsca', collection: 'miejsca' }),
        subject: fields.multiRelationship({ label: 'Tematy', collection: 'tematy' }),
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
        note: notatka(),
        dateSubmitted: dodano(),
        descriptionSource: fields.text({ label: 'Źródło opisu', description: 'Np. „na podstawie: Wikipedia, hasło Olszanka (powiat łosicki), CC BY-SA 4.0 – https://pl.wikipedia.org/wiki/…”. Adresy zamieniają się w odnośniki.', multiline: true }),
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
        visibility: widocznosc(),
        note: notatka(),
        dateSubmitted: dodano(),
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
        spatial: fields.relationship({ label: 'Miejscowość', collection: 'miejsca' }),
        coordinates: fields.text({
          label: 'Współrzędne',
          description: 'Miejsce budynku – np. 52.2116, 22.7185. Bez współrzędnych obiekt nie pojawi się na mapie.',
          validation: { pattern: { regex: WSPOLRZEDNE_REGEX, message: 'Zapis: 52.2116, 22.7185' } },
        }),
        approximate: fields.checkbox({ label: 'Położenie przybliżone' }),
        temporal: dataEdtf('Lata istnienia'),
        exists: fields.checkbox({ label: 'Istnieje do dziś', defaultValue: true }),
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
          }),
          { label: 'Fotografie', itemLabel: (p) => p.fields.caption.value || 'zdjęcie' },
        ),
        visibility: widocznosc(),
        note: notatka(),
        dateSubmitted: dodano(),
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
        language: fields.text({ label: 'Język', description: 'Np. polski, łacina, rosyjski.' }),
        spatial: fields.multiRelationship({ label: 'Miejsca', collection: 'miejsca' }),
        subject: fields.multiRelationship({ label: 'Tematy', collection: 'tematy' }),
        relation: fields.multiRelationship({ label: 'Przedstawia obiekty', description: 'Np. zdjęcie cerkwi, nagrobka.', collection: 'obiekty' }),
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
        note: notatka(),
        dateSubmitted: dodano(),
        description: opisMarkdoc('Opis, transkrypcja, tłumaczenie', 'materialy'),
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
        variants: fields.array(fields.text({ label: 'Forma' }), { label: 'Inne formy i odmiana', description: 'Do wyszukiwania, np. „rubla”, „rublach”.', itemLabel: (p) => p.value }),
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
    ksiegi: collection({
      label: 'Księgi metrykalne',
      slugField: 'title',
      path: 'content/ksiegi/*',
      columns: ['title', 'years'],
      schema: {
        title: nazwaIIdentyfikator('Nazwa (np. Olszanka unicka – urodzenia 1826–1875)'),
        parish: fields.relationship({ label: 'Parafia / urząd', collection: 'parafie', validation: { isRequired: true } }),
        types: fields.multiselect({
          label: 'Rodzaje aktów',
          description: 'Zaznacz wszystkie, które są w tej księdze – np. małżeństwa i zgony w jednym tomie.',
          options: Object.entries(RODZAJE_KSIAG).map(([value, label]) => ({ label, value })),
          defaultValue: ['urodzenia'],
        }),
        years: fields.text({ label: 'Lata', description: 'Np. „1826–1875, 1880, 1885–1890”. Z tego powstaje pasek lat w inwentarzu.', validation: { isRequired: true } }),
        gaps: fields.text({ label: 'Braki i uwagi do lat', description: 'Np. „brak 1863, rok 1870 uszkodzony”.' }),
        language: fields.text({ label: 'Język', description: 'Np. polski, łacina, rosyjski (od 1868).' }),
        repository: fields.text({ label: 'Gdzie przechowywane', description: 'Np. AP Siedlce, Archiwum Diecezjalne w Siedlcach, parafia, USC Łosice.' }),
        identifier: fields.text({ label: 'Zespół i sygnatura', description: 'Np. 72/290/0/2/45.' }),
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
    oProjekcie: singleton({
      label: 'O projekcie',
      path: 'content/o-projekcie',
      format: { contentField: 'content' },
      schema: {
        content: opisMarkdoc('Treść', 'o-projekcie'),
      },
    }),
  },
});
