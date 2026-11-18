import type { MetadataRoute } from 'next'

// PD-19 (P5): roboty – bez panelu, API, logowania, wyszukiwarki i stron do druku. Bez mapy strony (decyzja P5 – na razie
// niepotrzebna; pozycje niepubliczne i tak dają czytelnikowi anonimowemu 404, a karty niepubliczne mają „noindex”).
export default function robots(): MetadataRoute.Robots {
    return { rules: [{ userAgent: '*', disallow: ['/keystatic', '/api/', '/zaloguj', '/szukaj', '/druk/', '/k/'] }] }
}
