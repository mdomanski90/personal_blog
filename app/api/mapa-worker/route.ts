// Plik „workera” MapLibre podawany ze strony – po spakowaniu przez Next.js biblioteka
// nie znajduje go sama (szuka obok swojego pliku i dostaje 404, a mapa zostaje pusta).

import fs from 'node:fs'
import path from 'node:path'

let tresc: string | null = null

export function GET() {
    tresc ??= fs.readFileSync(path.join(process.cwd(), 'node_modules/maplibre-gl/dist/maplibre-gl-worker.mjs'), 'utf8')
    return new Response(tresc, {
        headers: { 'Content-Type': 'text/javascript; charset=utf-8', 'Cache-Control': 'public, max-age=86400' },
    })
}
