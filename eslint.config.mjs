// Etap 0A (audyt nr 2, OPS-04): lint po usunięciu `next lint` w Next 16 – konfiguracja płaska ESLint 9
// z regułami eslint-config-next (core-web-vitals + TypeScript) przez FlatCompat.
import { FlatCompat } from '@eslint/eslintrc'
import { dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const compat = new FlatCompat({ baseDirectory: dirname(fileURLToPath(import.meta.url)) })

export default [
    { ignores: ['.next/**', 'node_modules/**', 'content/**', 'pliki-archiwum/**', 'data/**', 'public/**', 'eksport/**', 'src_backup/**', 'next-env.d.ts'] },
    ...compat.extends('next/core-web-vitals', 'next/typescript'),
    // panel (app/keystatic): zwykłe <a> do stron panelu – dług do etapu 5 (przejścia bez przeładowania); na razie ostrzeżenie
    { files: ['app/keystatic/**'], rules: { '@next/next/no-html-link-for-pages': 'warn' } },
    // pliki konfiguracyjne: wtyczki Tailwinda ładowane przez require()
    { files: ['tailwind.config.ts'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
    { linterOptions: { reportUnusedDisableDirectives: 'warn' } },
]
