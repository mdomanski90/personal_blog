import { test } from 'node:test'
import assert from 'node:assert/strict'
import { formyOdmiany } from './odmiana'

const ma = (nazwa: string, ...formy: string[]) => {
    const wynik = formyOdmiany(nazwa)
    for (const f of formy) assert.ok(wynik.includes(f), `${nazwa}: brak „${f}” w [${wynik.join(', ')}]`)
}

test('odmiana nazw miejscowości z okolicy', () => {
    ma('Olszanka', 'Olszanki', 'Olszance')
    ma('Korczówka', 'Korczówki', 'Korczówce')
    ma('Mszanna', 'Mszanny', 'Mszannie')
    ma('Radlnia', 'Radlni')
    ma('Krzewica', 'Krzewicy')
    ma('Hadynów', 'Hadynowa', 'Hadynowie')
    ma('Łuniew', 'Łuniewa', 'Łuniewie')
    ma('Krzesk', 'Krzeska', 'Krzesku')
    ma('Łosice', 'Łosic', 'Łosicach')
    ma('Próchenki', 'Próchenek', 'Próchenkach')
    ma('Bejdy', 'Bejd', 'Bejdach')
    ma('Szawły', 'Szaweł', 'Szawłach')
    ma('Szpaki', 'Szpaków')
    ma('Łepki Stare', 'Łepek Starych', 'Łepkach Starych')
    ma('Stare Łepki', 'Starych Łepek')
    ma('Międzyrzec Podlaski', 'Międzyrzeca Podlaskiego', 'Międzyrzecu Podlaskim')
    ma('ziemia łosicka', 'ziemi łosickiej')
    ma('gmina Olszanka', 'gminy Olszanka')
    ma('Bieżeństwo', 'Bieżeństwa', 'Bieżeństwie')
    ma('Unici', 'Unitów')
    ma('grekokatolicy', 'grekokatolików')
    ma('unia', 'unii')
    assert.deepEqual(formyOdmiany('Ольшанка'), [])
})
