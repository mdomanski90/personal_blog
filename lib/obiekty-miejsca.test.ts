import { test } from 'node:test'
import assert from 'node:assert/strict'
import { miejscaObiektu } from './obiekty-miejsca'

test('obiekt w kilku miejscowościach: główna pierwsza, bez powtórzeń i pustych; stary zapis (tylko główna) bez zmian', () => {
    assert.deepEqual(miejscaObiektu('a', ['b', 'a', '', null, 'c']), ['a', 'b', 'c'])
    assert.deepEqual(miejscaObiektu('a', undefined), ['a'])
    assert.deepEqual(miejscaObiektu(null, ['b']), ['b'])
    assert.deepEqual(miejscaObiektu(null, []), [])
})
