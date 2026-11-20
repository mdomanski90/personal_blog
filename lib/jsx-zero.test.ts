// Lekcja 20.11: w panelu grobu pod pochowanym bez dat i bez rodziny w drzewie stało „0” –
// {(o.ur || o.zm || z?.rodzina.length) && …} renderuje liczbę 0, gdy lista jest pusta. Warunek w JSX kończący się
// na „.length” musi być zamieniony na wartość logiczną (!!(…) albo porównanie).
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const pliki = (kat: string): string[] => fs.readdirSync(kat, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(kat, e.name)
    return e.isDirectory() ? pliki(p) : e.name.endsWith('.tsx') ? [p] : []
})

test('JSX: warunek „{(… x.length) && …}” bez !! nie występuje (renderowałby 0)', () => {
    const zle: string[] = []
    for (const p of pliki('app')) {
        fs.readFileSync(p, 'utf8').split('\n').forEach((l, i) => {
            if (/(?<![=\w])\{\((?:(?!\)\s*&&).)*\.length\)\s*&&/.test(l)) zle.push(`${p}:${i + 1}`)
        })
    }
    assert.deepEqual(zle, [])
})
