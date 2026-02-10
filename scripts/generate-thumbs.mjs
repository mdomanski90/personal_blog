import sharp from 'sharp'
import fs from 'fs'
import path from 'path'

const INPUT_DIR = 'public/images/posts'
const THUMB_DIR = 'public/images/posts/thumbs'
const MAX_WIDTH = 800
const QUALITY = 60

if (!fs.existsSync(INPUT_DIR)) {
    console.log('Brak katalogu z obrazami, pomijam generowanie miniaturek.')
    process.exit(0)
}

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

const files = getImages(INPUT_DIR)

for (const filePath of files) {
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

    console.log(`✓ ${relative} → thumbs/${thumbRelative}`)
}

console.log('Gotowe!')