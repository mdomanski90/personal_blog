import type { Metadata } from 'next'
import { JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { ThemeProvider } from './providers/ThemeProvider'
import { ViewTransitions } from 'next-view-transitions'

const jetbrainsMono = JetBrains_Mono({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    variable: '--font-jetbrains',
})

export const metadata: Metadata = {
    metadataBase: new URL('https://odniepamieci.pl'),
    title: 'odniepamieci.pl',
    description: 'Społeczne archiwum pamięci lokalnej: wsie wokół Olszanki i Łosic – dokumenty, zdjęcia, wspomnienia, ludzie i miejsca.',
    openGraph: { siteName: 'odniepamieci.pl', locale: 'pl_PL', type: 'website' },
    twitter: { card: 'summary_large_image' },
}

export default function RootLayout({
                                       children,
                                   }: Readonly<{
    children: React.ReactNode
}>) {
    return (
        <ViewTransitions>
            <html lang="pl" suppressHydrationWarning className={`${jetbrainsMono.className} ${jetbrainsMono.variable}`}>
            <body>
            <ThemeProvider
                attribute="class"
                defaultTheme="system"
                enableSystem
                disableTransitionOnChange
            >
                {children}
            </ThemeProvider>

            </body>
            </html>
        </ViewTransitions>
    )
}
