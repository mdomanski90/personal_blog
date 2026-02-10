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
            // dodaj wszystkie tagi których używasz
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
  },
});
