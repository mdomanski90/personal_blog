import * as React from 'react'

// Jedno wspólne pole wyszukiwania: przycisk „szukaj” wewnątrz ramki (kliknięcie = Enter), obok pole tekstowe.
// Działa jako zwykły formularz GET (action) albo z obsługą w komponencie (onSubmit / onChange).
export default function PoleSzukania({ action, name = 'q', value, defaultValue, onChange, onSubmit, placeholder, etykieta = 'szukaj', obszar = 'szukaj na tej stronie', id, ukryte, className = '', style, autoFocus, children }: {
    action?: string
    name?: string
    value?: string
    defaultValue?: string
    onChange?: (v: string) => void
    onSubmit?: (v: string) => void
    placeholder?: string
    etykieta?: string
    /** etap 3: nazwa obszaru wyszukiwania (role=search) – gdy na stronie jest kilka pól, każde musi mieć inną (axe landmark-unique) */
    obszar?: string
    id?: string
    /** dodatkowe pola formularza (np. aktywny filtr) */
    ukryte?: Record<string, string | undefined>
    className?: string
    style?: React.CSSProperties
    autoFocus?: boolean
    children?: React.ReactNode
}) {
    return (
        <form action={action} method="get" role="search" aria-label={obszar} className={`pole-szukania ${className}`} style={style}
            onSubmit={onSubmit ? (e) => { e.preventDefault(); onSubmit(String(new FormData(e.currentTarget).get(name) ?? '')) } : undefined}>
            {Object.entries(ukryte ?? {}).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
            <button type="submit">{etykieta}</button>
            <input id={id} name={name} type="search" aria-label={placeholder ?? etykieta} placeholder={placeholder} autoFocus={autoFocus}
                {...(value !== undefined ? { value, onChange: (e: React.ChangeEvent<HTMLInputElement>) => onChange?.(e.target.value) } : { defaultValue })} />
            {children}
        </form>
    )
}
