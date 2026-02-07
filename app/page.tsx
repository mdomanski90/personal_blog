"use client"
import * as React from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "@/components/ui/button"

export default function Home() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)

    React.useEffect(() => {
        setMounted(true)
    }, [])

    if (!mounted) return null

    return (
        <main className="flex min-h-screen flex-col items-center justify-center gap-5 font-mono">
            
            <div className="w-2/3 space-y-6">
                {/* Theme toggle - shadcn Button */}
                <div className="mb-4">
                    <Button
                        variant="outline"
                        size="default"
                        onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                        className="h-12 w-12 rounded-sm"
                    >
                        <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                        <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                        <span className="sr-only">Toggle theme</span>
                    </Button>
                </div>

                {/* Tytuł strony */}
                <h1 className="text-6xl font-bold">
                    odniepamieci.pl
                </h1>

                <div className="text-gray-400 dark:text-gray-600 mt-4">
                    ---------------------------------------------------------------------
                </div>

                <article className="px-6 py-4">
                    <span 
                        className="text-sm font-semibold rounded px-2 py-1"
                        style={{
                            backgroundColor: theme === "dark" ? "#1e3a8a" : "#dbeafe"
                        }}
                    >
                        18/08/2024
                    </span>
                    <h3 className="text-xl font-semibold mt-2 mb-3">
                        Tytuł posta
                    </h3>
                    <p className="text-base">
                        To jest przykładowy post na blogu. Minimalistyczny design z monospace font.
                    </p>
                </article>

                <div className="text-gray-400 dark:text-gray-600 mt-4">
                    ---------------------------------------------------------------------
                </div>

                <article className="px-6 py-4">
                    <span 
                        className="text-sm font-semibold rounded px-2 py-1"
                        style={{
                            backgroundColor: theme === "dark" ? "#1e3a8a" : "#dbeafe"
                        }}
                    >
                        15/08/2024
                    </span>
                    <h3 className="text-xl font-semibold mt-2 mb-3">
                        Kolejny wpis
                    </h3>
                    <p className="text-base">
                        Drugi przykładowy post. Dark mode działa idealnie!
                    </p>
                </article>
            </div>

            <code className="rounded bg-muted px-3 py-1 text-base font-semibold mt-8">
                © 2024 odniepamieci.pl
            </code>
        </main>
    )
}
