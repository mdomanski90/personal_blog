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
  title: 'odniepamieci.pl',
  description: 'Minimalistyczny blog',
}

export default function RootLayout({
                                     children,
                                   }: Readonly<{
  children: React.ReactNode
}>) {
  return (
      <ViewTransitions>
        <html lang="pl" suppressHydrationWarning className={jetbrainsMono.className}>
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
