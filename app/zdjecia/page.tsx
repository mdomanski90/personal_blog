import SiteHeader from '../components/SiteHeader'
import Footer from '../components/Footer'
import ScrollToTop from '../components/ScrollToTop'
import PhotosContent from '../components/PhotosContent'

// TODO: Zastąp prawdziwymi danymi z reader.collections.zdjecia.all()
const mockPhotos = Array.from({ length: 48 }, (_, i) => ({
    id: i + 1,
    title: `Zdjęcie ${i + 1}`,
    src: `/images/gallery/photo-${i + 1}.jpg`,
    thumbnail: `/images/gallery/thumbs/photo-${(i % 10) + 1}.webp`,
    width: 1920,
    height: 1280,
    location: ['olszanka', 'korczowka', 'prochenki', 'szydlowka'][Math.floor(Math.random() * 4)],
    category: ['koscioly', 'szkoly', 'rodziny', 'budynki'][Math.floor(Math.random() * 4)],
    year: `${1950 + Math.floor(Math.random() * 70)}`,
    description: 'Opis zdjęcia',
    source: 'Jan Kowalski',
}))

export default function ZdjeciaPage() {
    return (
        <>
            <div style={{ maxWidth: '52rem', margin: '0 auto', padding: '2rem 1.25rem 5rem 1.25rem', minHeight: '100vh' }} className="font-mono">
                <div className="space-y-6 w-full">
                    <SiteHeader />

                    <PhotosContent allPhotos={mockPhotos} />

                    <Footer />
                </div>
            </div>

            <ScrollToTop />
        </>
    )
}
