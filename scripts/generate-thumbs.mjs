import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

// Miniatury WebP (800 px) dla obrazków w treściach; pełne pliki zostają do powiększenia.
const KATALOGI = ['posts', 'miejsca', 'tematy', 'o-projekcie'].map((k) => `public/images/${k}`)
const MAX_WIDTH = 800
const QUALITY = 60

function getImages(dir) {
    let results = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory() && entry.name !== 'thumbs') {
            results = results.concat(getImages(full))
        } else if (/\.(jpe?g|png|webp)$/i.test(entry.name)) {
            results.push(full)
        }
    }
    return results
}

let nowe = 0
for (const INPUT_DIR of KATALOGI) {
    if (!fs.existsSync(INPUT_DIR)) continue
    const THUMB_DIR = path.join(INPUT_DIR, 'thumbs')

    for (const filePath of getImages(INPUT_DIR)) {
        // zachowaj strukturę podfolderów w thumbs
        const relative = path.relative(INPUT_DIR, filePath)
        const thumbRelative = relative.replace(/\.\w+$/, '.webp')
        const output = path.join(THUMB_DIR, thumbRelative)

        if (fs.existsSync(output)) continue

        fs.mkdirSync(path.dirname(output), { recursive: true })

        await sharp(filePath)
            .resize({ width: MAX_WIDTH, withoutEnlargement: true })
            .webp({ quality: QUALITY })
            .toFile(output)

        nowe++
        console.log(`✓ ${INPUT_DIR}/${relative} → thumbs/${thumbRelative}`)
    }
}

console.log(`Miniatury: ${nowe} nowych.`)
