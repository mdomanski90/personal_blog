// Łatka 21.11: wizytówka serwisu w podglądzie linku – strony bez własnego obrazka (zastępuje kolorową kapliczkę, decyzja 21.11)
import { kartaOg } from '@/lib/og/karta'

export const alt = 'odniepamieci.pl – społeczne archiwum pamięci lokalnej'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/jpeg'

export default async function Image() {
    return kartaOg()
}
