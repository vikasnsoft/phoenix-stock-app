import { defineConfig } from 'orval';

export default defineConfig({
  api: {
    input: 'http://localhost:4001/api-json',
    output: {
      target: 'src/lib/api/generated/index.ts',
      client: 'react-query',
      mode: 'tags-split',
      prettier: true,
      override: {
        mutator: {
          path: 'src/lib/api/axios-instance.ts',
          name: 'customInstance',
        },
      },
    },
  },
});
