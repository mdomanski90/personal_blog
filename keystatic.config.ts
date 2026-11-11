import { config, collection, fields } from '@keystatic/core';

export default config({
  storage: {
    kind: 'local',
  },
  collections: {
    posts: collection({
      label: 'Posty',
      slugField: 'title',
      path: 'content/posts/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Tytuł' } }),
        date: fields.date({ label: 'Data', defaultValue: { kind: 'today' } }),
        tags: fields.multiselect({
          label: 'Tagi',
          options: [
            { label: 'tech', value: 'tech' },
            { label: 'historia', value: 'historia' },
            { label: 'myślodsiewnia', value: 'myślodsiewnia' },
            { label: 'genealogia', value: 'genealogia' },
          ],
          defaultValue: []
        }),
        content: fields.markdoc({
          label: 'Treść wpisu',
          options: {
            image: {
              directory: 'public/images/posts',
              publicPath: '/images/posts/',
            }
          }
        }),
      },
    }),
    miejsca: collection({
      label: 'Miejsca',
      slugField: 'title',
      path: 'content/miejsca/*',
      format: { contentField: 'content' },
      schema: {
        title: fields.slug({ name: { label: 'Tytuł' } }),
        date: fields.date({
          label: 'Data',
          defaultValue: { kind: 'today' },
        }),
        lokalizacja: fields.text({
          label: 'Lokalizacja',
          description: 'np. Olszanka, Korczówka',
        }),
        content: fields.markdoc({
          label: 'Treść',
          options: {
            image: {
              directory: 'public/images/miejsca',
              publicPath: '/images/miejsca/',
            },
          },
        }),
      },
    }),
    zdjecia: collection({
      label: 'Zdjęcia',
      slugField: 'title',
      path: 'content/zdjecia/*',
      schema: {
        title: fields.slug({ name: { label: 'Tytuł/Opis' } }),
        image: fields.image({
          label: 'Zdjęcie',
          directory: 'public/images/gallery',
          publicPath: '/images/gallery/',
        }),
        date: fields.date({
          label: 'Data wykonania',
          description: 'Przybliżona data zdjęcia',
        }),
        year: fields.text({
          label: 'Rok',
          description: 'np. 1960, lata 70., ok. 1985',
        }),
        location: fields.select({
          label: 'Miejscowość',
          options: [
            { label: 'Olszanka', value: 'olszanka' },
            { label: 'Korczówka', value: 'korczowka' },
            { label: 'Próchenki', value: 'prochenki' },
            { label: 'Szydłówka', value: 'szydlowka' },
            { label: 'Bejdy', value: 'bejdy' },
            { label: 'Dawidy', value: 'dawidy' },
            { label: 'Łepki Stare', value: 'lepki stare' },
            { label: 'Łepki Nowe', value: 'lepki nowe' },
            { label: 'Hadynów', value: 'hadynow' },
            { label: 'Pietrusy', value: 'pietrusy' },
            { label: 'Mszanna', value: 'mszanna' },
            { label: 'Bolesty', value: 'bolesty' },
            { label: 'Szawły', value: 'szawly' },
            { label: 'Wyczółki', value: 'wyczolki' },
            { label: 'Radlnia', value: 'radlnia' },
            { label: 'Łosice', value: 'losice' },
            { label: 'Łuniew', value: 'luniew' },
            { label: 'Łuby', value: 'luby' },
            { label: 'Kożuszki', value: 'kozuszki' },
            { label: 'Krzewica', value: 'krzewica' },
            { label: 'Pościsze', value: 'poscisze' },
            { label: 'Krzesk', value: 'krzesk' },
            { label: 'Międzyrzec Podlaski', value: 'miedzyrzec' },
            { label: 'Inne', value: 'inne' },
          ],
          defaultValue: 'olszanka',
        }),
        category: fields.multiselect({
          label: 'Kategorie',
          options: [
            { label: 'Osoby', value: 'osoby' },
            { label: 'Kościoły', value: 'koscioly' },
            { label: 'Szkoły', value: 'szkoly' },
            { label: 'Budynki', value: 'budynki' },
            { label: 'Uroczystości', value: 'uroczystosci' },
            { label: 'Krajobrazy', value: 'krajobrazy' },
            { label: 'Życie codzienne', value: 'zycie-codzienne' },
          ],
          defaultValue: [],
        }),
        description: fields.text({
          label: 'Dodatkowy opis',
          multiline: true,
        }),
        source: fields.text({
          label: 'Źródło/Autor',
          description: 'Kto udostępnił zdjęcie',
        }),
      },
    }),
  },
});
