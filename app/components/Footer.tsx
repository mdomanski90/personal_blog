import * as React from "react"

export default function Footer() {
    const linkStyle = {
        fontSize: '14px',
        fontWeight: '400',
        height: '25px',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        textTransform: 'lowercase' as const,
    }

    return (
        <footer className="pt-10">
            <div className="flex items-center border border-[#d1d5db] dark:border-[#4b5563] w-fit">
                <div
                    style={linkStyle}
                    className="bg-muted text-current whitespace-nowrap font-semibold"
                >
                    © {new Date().getFullYear()} odniepamieci.pl
                </div>
                <a
                    href="https://github.com/mdomanski90"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkStyle}
                    className="text-current whitespace-nowrap !no-underline border-l border-[#d1d5db] dark:border-[#4b5563] hover:opacity-80 transition-opacity"
                >
                    github
                </a>
                <a
                    href="https://mastodon.com.pl/@sirion"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={linkStyle}
                    className="text-current whitespace-nowrap !no-underline border-l border-[#d1d5db] dark:border-[#4b5563] hover:opacity-80 transition-opacity"
                >
                    fediverse
                </a>
            </div>
        </footer>
    )
}
