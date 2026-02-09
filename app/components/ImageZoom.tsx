'use client'

import { useEffect } from 'react'
import mediumZoom from 'medium-zoom'

export default function ImageZoom() {
    useEffect(() => {
        const zoom = mediumZoom('.post-content img', {
            margin: 24,
            background: 'rgba(0, 0, 0, 0.85)',
        })

        return () => { zoom.detach() }
    }, [])

    return null
}