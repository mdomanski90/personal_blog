// Etap 0A (audyt nr 2, OPS-04): lint po usunięciu `next lint` w Next 16 – konfiguracja płaska ESLint 9
// z regułami eslint-config-next (core-web-vitals + TypeScript). Okno serwisowe 19.11.2026: eslint-config-next 16 ma własną
// konfigurację płaską – import wprost, bez FlatCompat (stary sposób kończył się błędem „Converting circular structure to JSON”).
import nextVitals from 'eslint-config-next/core-web-vitals'
import nextTs from 'eslint-config-next/typescript'

export default [
    // .next-poprzedni – zapas poprzedniego buildu robiony przez scripts/wdroz.sh (lekcja 16.11: lint sprawdzał skompilowany kod)
    { ignores: ['.next/**', '.next-poprzedni/**', 'node_modules/**', 'content/**', 'pliki-archiwum/**', 'data/**', 'public/**', 'eksport/**', 'src_backup/**', 'next-env.d.ts'] },
    ...nextVitals,
    ...nextTs,
    // panel (app/keystatic): zwykłe <a> do stron panelu – dług do etapu 5 (przejścia bez przeładowania); na razie ostrzeżenie
    { files: ['app/keystatic/**'], rules: { '@next/next/no-html-link-for-pages': 'warn' } },
    // pliki konfiguracyjne: wtyczki Tailwinda ładowane przez require()
    { files: ['tailwind.config.ts'], rules: { '@typescript-eslint/no-require-imports': 'off' } },
    // eslint-plugin-react-hooks 6+ (z eslint-config-next 16): reguły pod React Compiler. Kompilatora nie używamy; stan 19.11.2026:
    // 99 miejsc w 40 plikach (set-state-in-effect 49, refs 39, immutability 8, preserve-manual-memoization 3) – ostrzeżenia,
    // nie błędy. P7c (20.11.2026, 105 w 44 plikach): zapadka per plik w lib/zapadka-react.json – pilnuje jej scripts/lint.ts
    // (npm run lint, krok budowania zamiast „eslint . --quiet”); ostrzeżeń w pliku nie może przybyć, nowy plik – 0.
    { rules: { 'react-hooks/set-state-in-effect': 'warn', 'react-hooks/refs': 'warn', 'react-hooks/immutability': 'warn', 'react-hooks/preserve-manual-memoization': 'warn' } },
    { linterOptions: { reportUnusedDisableDirectives: 'warn' } },
]
