"use client"

import React, { useState } from 'react'
import Markdoc from '@markdoc/markdoc'

// Komponent obrazka z funkcją zoom
const ZoomableImage = ({ src, alt }: { src: string; alt?: string }) => {
    const [isZoomed, setIsZoomed] = useState(false)

    return (
        <>
            <img
                src={src}
                alt={alt}
                onClick={() => setIsZoomed(true)}
                className="rounded-lg w-full my-8 shadow-sm cursor-zoom-in hover:opacity-90 transition-opacity"
                style={{ maxWidth: '100%', height: 'auto' }}
            />

            {/* Nakładka (Lightbox) po kliknięciu */}
            {isZoomed && (
                <div
                    className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 cursor-zoom-out p-4 md:p-10"
                    onClick={() => setIsZoomed(false)}
                >
                    <img
                        src={src}
                        alt={alt}
                        className="max-w-full max-h-full object-contain animate-in zoom-in-95 duration-200"
                    />
                    <button className="absolute top-5 right-5 text-white text-sm font-mono bg-white/10 px-3 py-1 rounded">
                        ZAMKNIJ [X]
                    </button>
                </div>
            )}
        </>
    )
}

const markdocConfig = {
    nodes: {
        image: {
            render: 'ZoomableImage',
            attributes: {
                src: { type: String },
                alt: { type: String },
            }
        },
        table: { render: 'table' },
        thead: { render: 'thead' },
        tbody: { render: 'tbody' },
        tr: { render: 'tr' },
        th: { render: 'th' },
        td: { render: 'td' },
    },
}

export default function MarkdocContent({ node }: { node: any }) {
    // Transformujemy AST do formatu renderowalnego przez Reacta
    const content = Markdoc.transform(node, markdocConfig)

    return Markdoc.renderers.react(content, React, {
        components: {
            ZoomableImage: ZoomableImage
        }
    })
}
