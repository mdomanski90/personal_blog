'use client'

import { Link } from 'next-view-transitions'
import { usePathname } from 'next/navigation'
import { useState, useEffect } from 'react'
import ThemeToggle from './ThemeToggle'

export default function SiteHeader({ allTags, BlogFilter }: { allTags?: string[], BlogFilter?: React.ComponentType<{ allTags: string[] }> }) {
    const pathname = usePathname()
    const [isZasobyOpen, setIsZasobyOpen] = useState(false)
    const [isZasobyLocked, setIsZasobyLocked] = useState(false)

    const navLinkStyle = {
        fontSize: '14px',
        fontWeight: '400',
        height: '25px',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        textTransform: 'lowercase' as const,
    }

    const activeNavLinkStyle = {
        ...navLinkStyle,
        fontWeight: '700',
    }

    const submenuLinkStyle = {
        fontSize: '14px',
        fontWeight: '400',
        padding: '0 10px',
        display: 'inline-flex',
        alignItems: 'center',
        textTransform: 'lowercase' as const,
    }

    const activeSubmenuLinkStyle = {
        ...submenuLinkStyle,
        fontWeight: '700',
    }

    const isActive = (path: string) => pathname === path

    const zasobyPaths = ['/zdjecia', '/zrodla', '/dokumenty', '/zrodla']
    const isZasobyActive = pathname ? zasobyPaths.includes(pathname) : false

    // Automatyczne otwieranie submenu gdy jesteś na podstronie zasobów
    useEffect(() => {
        if (isZasobyActive) {
            setIsZasobyOpen(true)
            setIsZasobyLocked(true)
        }
    }, [isZasobyActive])

    const handleZasobyClick = () => {
        if (isZasobyLocked) {
            // Jeśli jest zablokowane, odblokuj i zamknij
            setIsZasobyLocked(false)
            setIsZasobyOpen(false)
        } else {
            // Jeśli nie jest zablokowane, zablokuj i otwórz
            setIsZasobyLocked(true)
            setIsZasobyOpen(true)
        }
    }

    const handleMouseEnter = () => {
        if (!isZasobyLocked) {
            setIsZasobyOpen(true)
        }
    }

    const handleMouseLeave = () => {
        if (!isZasobyLocked) {
            setIsZasobyOpen(false)
        }
    }

    return (
        <header>
            <div className="flex flex-wrap items-center justify-between mb-1" style={{ gap: '0.5rem 1rem' }}>
                <div>
                    <h1
                        className="text-3xl sm:text-6xl font-bold tracking-tighter whitespace-nowrap"
                        style={{ lineHeight: 1, marginBottom: 0 }}
                    >
                        odniepamieci.pl
                    </h1>
                    <p
                        className="text-lg sm:text-xl text-gray-600 dark:text-gray-400 tracking-tight lowercase"
                        style={{ lineHeight: 1.2, marginTop: '7px' }}
                    >
                        społeczne archiwum pamięci lokalnej
                    </p>
                </div>
                <ThemeToggle />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-4" style={{ marginTop: '1rem' }}>
                <nav>
                    {/* GŁÓWNE MENU */}
                    <div className="flex items-center border border-[#d1d5db] dark:border-[#4b5563] w-fit">
                        {/* STRONA GŁÓWNA */}
                        <Link
                            href="/"
                            style={isActive('/') ? activeNavLinkStyle : navLinkStyle}
                            className={isActive('/')
                                ? 'bg-muted text-accent-foreground whitespace-nowrap !no-underline'
                                : 'text-current whitespace-nowrap !no-underline hover:opacity-80 transition-opacity'}
                        >
                            strona główna
                        </Link>

                        {/* MIEJSCA */}
                        <Link
                            href="/miejsca"
                            style={isActive('/miejsca') ? activeNavLinkStyle : navLinkStyle}
                            className={isActive('/miejsca')
                                ? 'bg-muted text-accent-foreground whitespace-nowrap !no-underline border-l border-[#d1d5db] dark:border-[#4b5563]'
                                : 'text-current whitespace-nowrap !no-underline border-l border-[#d1d5db] dark:border-[#4b5563] hover:opacity-80 transition-opacity'}
                        >
                            miejsca
                        </Link>

                        {/* OSOBY */}
                        <Link
                            href="/osoby"
                            style={isActive('/osoby') ? activeNavLinkStyle : navLinkStyle}
                            className={isActive('/osoby')
                                ? 'bg-muted text-accent-foreground whitespace-nowrap !no-underline border-l border-[#d1d5db] dark:border-[#4b5563]'
                                : 'text-current whitespace-nowrap !no-underline border-l border-[#d1d5db] dark:border-[#4b5563] hover:opacity-80 transition-opacity'}
                        >
                            osoby
                        </Link>

                        {/* ZASOBY */}
                        <div
                            className="border-l border-[#d1d5db] dark:border-[#4b5563]"
                            onMouseEnter={handleMouseEnter}
                            onMouseLeave={handleMouseLeave}
                        >
                            <div
                                onClick={handleZasobyClick}
                                style={(isZasobyActive || isZasobyLocked) ? activeNavLinkStyle : navLinkStyle}
                                className={(isZasobyActive || isZasobyLocked)
                                    ? 'bg-muted text-accent-foreground whitespace-nowrap cursor-pointer'
                                    : 'text-current whitespace-nowrap hover:opacity-80 transition-opacity cursor-pointer'}
                            >
                                zasoby
                            </div>
                        </div>

                        {/* O PROJEKCIE */}
                        <Link
                            href="/kontakt"
                            style={isActive('/kontakt') ? activeNavLinkStyle : navLinkStyle}
                            className={isActive('/kontakt')
                                ? 'bg-muted text-accent-foreground whitespace-nowrap !no-underline border-l border-[#d1d5db] dark:border-[#4b5563]'
                                : 'text-current whitespace-nowrap !no-underline border-l border-[#d1d5db] dark:border-[#4b5563] hover:opacity-80 transition-opacity'}
                        >
                            o projekcie
                        </Link>
                    </div>

                    {/* SUBMENU ZASOBY z animacją */}
                    <div
                        className="overflow-hidden transition-all duration-300 ease-in-out"
                        style={{
                            maxHeight: isZasobyOpen ? '50px' : '0',
                            opacity: isZasobyOpen ? 1 : 0,
                            marginTop: isZasobyOpen ? '8px' : '0',
                        }}
                        onMouseEnter={handleMouseEnter}
                        onMouseLeave={handleMouseLeave}
                    >
                        <div className="flex items-center gap-4 text-gray-600 dark:text-gray-400">
                            <Link
                                href="/zdjecia"
                                style={isActive('/zdjecia') ? activeSubmenuLinkStyle : submenuLinkStyle}
                                className={isActive('/zdjecia')
                                    ? 'text-accent-foreground whitespace-nowrap !no-underline'
                                    : 'text-current whitespace-nowrap !no-underline hover:opacity-80 transition-opacity'}
                            >
                                zdjęcia
                            </Link>
                            <Link
                                href="/dokumenty"
                                style={isActive('/dokumenty') ? activeSubmenuLinkStyle : submenuLinkStyle}
                                className={isActive('/dokumenty')
                                    ? 'text-accent-foreground whitespace-nowrap !no-underline'
                                    : 'text-current whitespace-nowrap !no-underline hover:opacity-80 transition-opacity'}
                            >
                                dokumenty
                            </Link>
                            <Link
                                href="/zrodla"
                                style={isActive('/zrodla') ? activeSubmenuLinkStyle : submenuLinkStyle}
                                className={isActive('/zrodla')
                                    ? 'text-accent-foreground whitespace-nowrap !no-underline'
                                    : 'text-current whitespace-nowrap !no-underline hover:opacity-80 transition-opacity'}
                            >
                                zbiór źródeł
                            </Link>
                        </div>
                    </div>
                </nav>
            </div>

            {/* SEPARATOR */}
            <div className="text-gray-400 dark:text-gray-600 mt-6 whitespace-nowrap overflow-hidden opacity-50">
                ------------------------------------------------------------------------------------------------------
            </div>

            {/* FILTRY */}
            {allTags && allTags.length > 0 && BlogFilter && (
                <div className="flex justify-end mt-4">
                    <BlogFilter allTags={allTags} />
                </div>
            )}
        </header>
    )
}
