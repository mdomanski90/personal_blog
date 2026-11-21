// Łatka 21.11: karta bez własnego obrazka – w podglądzie linku wizytówka serwisu (własny opis i tytuł daje generateMetadata strony);
// plik potrzebny, bo metadane strony nadpisują openGraph układu razem z jego obrazkiem
import { kartaOg } from '@/lib/og/karta'

export const alt = 'odniepamieci.pl – społeczne archiwum pamięci lokalnej'
export const size = { width: 1200, height: 630 }
export const contentType = 'image/jpeg'

export default async function Image() {
    return kartaOg()
}
