// OPS-08 (19.11, decyzja właściciela): ochrona adresów e-mail przed botami. Adresu nie ma w HTML ani w danych strony –
// jest zakodowany (odwrócony, znaki jako liczby szesnastkowe); przeglądarka pokazuje go dopiero po kliknięciu
// „pokaż adres e-mail” (app/components/UkryteAdresy.tsx). Każdy adres wpisany w treść stron jest chroniony tak samo.
// Moduł bez zależności – używa go serwer (naHtml) i przeglądarka.

const EMAIL = /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g

export const zakoduj = (adres: string): string => [...adres].reverse().map((c) => c.codePointAt(0)!.toString(16).padStart(4, '0')).join('')
export const odkoduj = (k: string): string => (k.match(/[0-9a-f]{4}/g) ?? []).map((h) => String.fromCodePoint(Number.parseInt(h, 16))).reverse().join('')

export const PRZYCISK_ADRESU = 'pokaż adres e-mail'
const przycisk = (adres: string) => `<button type="button" class="email-pokaz k-btn k-btn--s" data-k="${zakoduj(adres)}">${PRZYCISK_ADRESU}</button>`

/** HTML treści: odnośniki mailto i adresy w tekście → przycisk „pokaż adres e-mail” (adresy w atrybutach innych znaczników bez zmian). */
export function ukryjAdresy(html: string): string {
    if (!html.includes('@')) return html
    const bezMailto = html.replace(/<a\b[^>]*href="mailto:([^"?]+)[^"]*"[^>]*>[\s\S]*?<\/a>/gi, (_, a: string) => przycisk(decodeURIComponent(a)))
    return bezMailto.split(/(<[^>]+>)/).map((cz) => (cz.startsWith('<') ? cz : cz.replace(EMAIL, (a) => przycisk(a)))).join('')
}
