'use client'

import { useEffect, useRef } from 'react'
import PhotoSwipeLightbox from 'photoswipe/lightbox'
import 'photoswipe/style.css'

interface Photo {
  src: string
  thumbnail: string
  width: number
  height: number
  title: string
  location: string
  year: string
  description?: string
  source?: string
}

interface PhotoGalleryProps {
  photos: Photo[]
}

export default function PhotoGallery({ photos }: PhotoGalleryProps) {
  const galleryRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!galleryRef.current) return

    const lightbox = new PhotoSwipeLightbox({
      gallery: galleryRef.current,
      children: 'a',
      pswpModule: () => import('photoswipe'),
      paddingFn: (viewportSize) => {
        return {
          top: 30,
          bottom: 30,
          left: 30,
          right: 30
        }
      }
    })

    lightbox.init()

    return () => {
      lightbox.destroy()
    }
  }, [photos])

  return (
      <div ref={galleryRef} className="grid grid-cols-4 gap-3">
        {photos.map((photo, index) => (
            <a
                key={index}
                href={photo.src}
                data-pswp-width={photo.width}
                data-pswp-height={photo.height}
                target="_blank"
                rel="noreferrer"
                className="block group border border-[#d1d5db] dark:border-[#4b5563] hover:border-gray-400 dark:hover:border-gray-500 transition-colors overflow-hidden"
            >
              <div className="aspect-square bg-gray-100 dark:bg-gray-800 overflow-hidden">
                <img
                    src={photo.thumbnail}
                    alt={photo.title}
                    loading="lazy"
                    className="w-full h-full object-cover transition-transform group-hover:scale-105"
                />
              </div>
              <div className="p-2 text-xs space-y-1">
                <div className="font-bold truncate lowercase">{photo.title}</div>
                <div className="text-gray-500 dark:text-gray-400 lowercase">
                  {photo.location} • {photo.year}
                </div>
              </div>
            </a>
        ))}
      </div>
  )
}
