import * as React from "react"
import SiteHeader from "../components/SiteHeader"
import Footer from "../components/Footer"
import EmailLink from "../components/EmailLink"

export default function Kontakt() {
    return (
        <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.25rem 5rem 1.25rem', minHeight: '100vh' }} className="font-mono">
            <div className="space-y-6">
                <SiteHeader />

                <article className="prose dark:prose-invert prose-slate max-w-none leading-relaxed" style={{ fontSize: 'var(--blog-font-size, 18px)' }}>
                    <h2 className="font-bold lowercase" style={{ fontSize: 'calc(1.875rem * var(--font-scale, 1))' }}>kontakt</h2>
                    <p>możesz się ze mną skontaktować pisząc na adres:</p>
                    <p><EmailLink /></p>
                </article>

                <Footer />
            </div>
        </div>
    )
}
