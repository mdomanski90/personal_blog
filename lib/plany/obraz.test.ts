import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import sharp from 'sharp'

// audyt nr 2 (AUD-P-02): zapisany obraz planu nie zawiera EXIF ani GPS (dane syntetyczne)
test('zapiszObraz usuwa EXIF z GPS także z małego JPG', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'obraz-'))
    const stary = process.cwd()
    process.chdir(dir)
    try {
        const { zapiszObraz, sciezkaPliku } = await import('./dane')
        const jpg = await sharp({ create: { width: 64, height: 48, channels: 3, background: '#808080' } })
            .withExif({ IFD0: { Make: 'TestPhone' }, IFD3: { GPSLatitudeRef: 'N', GPSLatitude: '52/1 13/1 0/1', GPSLongitudeRef: 'E', GPSLongitude: '22/1 43/1 0/1' } })
            .jpeg().toBuffer()
        assert.ok((await sharp(jpg).metadata()).exif, 'plik testowy ma EXIF')
        const w = await zapiszObraz('test-plan', jpg, 'zdjecie.jpg', 'zdjecie')
        const zapisany = await fs.readFile(sciezkaPliku('test-plan', w.plik)!)
        const m = await sharp(zapisany).metadata()
        assert.equal(m.exif, undefined)
        assert.equal(zapisany.includes(Buffer.from('TestPhone')), false)
        assert.equal(w.szer, 64); assert.equal(w.wys, 48)
    } finally { process.chdir(stary) }
})
