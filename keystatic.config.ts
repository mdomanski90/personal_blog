import { config, collection, singleton, fields } from '@keystatic/core';
import { wrapper, repeating, block } from '@keystatic/core/content-components';
import { EDTF_OPIS, EDTF_REGEX } from './lib/edtf';
import { identyfikatorZNazwy } from './lib/tekst';
import { NAZWY_OBIEKTOW } from './lib/tarcze';
import { RODZAJE_MATERIALOW } from './lib/materialy';
import { ADRES_PLIKOW, KATALOG_PLIKOW } from './lib/pliki';

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
      'Treści': ['posts', 'miejsca', 'obiekty', 'tematy'],
      'Archiwum': ['materialy'],
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
        religion: fields.select({
          label: 'Wyznanie mieszkańców przed 1875',
          description: 'Stan sprzed kasaty unii – od tego zależy znak wsi na mapie.',
          options: [
            { label: 'nieopisane', value: '' },
            { label: 'unickie', value: 'unicka' },
            { label: 'katolickie', value: 'katolicka' },
            { label: 'mieszane (unici i katolicy)', value: 'mieszana' },
            { label: 'prawosławne', value: 'prawoslawna' },
          ],
          defaultValue: '',
        }),
        isPartOf: fields.relationship({
          label: 'Należy do',
          description: 'Wieś → gmina albo kraina, gmina → kraina (np. Olszanka → gmina Olszanka → ziemia łosicka). Na tej podstawie dzieli się spis miejscowości.',
          collection: 'miejsca',
        }),
        sameAs: fields.url({ label: 'Wikidata / GeoNames', description: 'Adres strony tego miejsca w Wikidata lub GeoNames (opcjonalnie).' }),
        visibility: widocznosc(),
        note: notatka(),
        dateSubmitted: dodano(),
        description: opisMarkdoc('Opis', 'miejsca'),
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
        temporal: dataEdtf('Czas (EDTF)'),
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
        temporal: dataEdtf('Lata istnienia (EDTF)'),
        exists: fields.checkbox({ label: 'Istnieje do dziś', defaultValue: true }),
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
        temporal: dataEdtf('Data powstania (EDTF)'),
        creator: fields.text({ label: 'Autor / wytwórca', description: 'Np. fotograf, parafia, urząd, osoba nagrywana.' }),
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
