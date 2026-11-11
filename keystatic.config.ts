import { config, collection, singleton, fields } from '@keystatic/core';
import { wrapper, repeating } from '@keystatic/core/content-components';
import { EDTF_OPIS, EDTF_REGEX } from './lib/edtf';
import { identyfikatorZNazwy } from './lib/tekst';

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

const inneNazwy = () =>
  fields.array(fields.text({ label: 'Nazwa lub forma' }), {
    label: 'Inne nazwy i formy',
    description: 'Odmiana (w Olszance, z Olszanki), nazwy dawne, zapis cyrylicą i łaciną. Używane przez wyszukiwarkę i wzmianki.',
    itemLabel: (p) => p.value || 'nowa forma',
  });

const dataEdtf = (etykieta: string) =>
  fields.text({
    label: etykieta,
    description: EDTF_OPIS,
    validation: { pattern: { regex: EDTF_REGEX, message: 'Niepoprawny zapis daty. ' + EDTF_OPIS } },
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
      'Treści': ['posts', 'miejsca', 'tematy'],
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
        type: fields.select({
          label: 'Rodzaj',
          options: [
            { label: 'wieś', value: 'wies' },
            { label: 'miasto', value: 'miasto' },
            { label: 'parafia', value: 'parafia' },
            { label: 'cmentarz', value: 'cmentarz' },
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
        isPartOf: fields.relationship({ label: 'Należy do (np. parafia)', collection: 'miejsca' }),
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
