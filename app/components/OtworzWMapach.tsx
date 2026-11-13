// Link „otwórz w Mapach Google” zamiast suchych współrzędnych (współrzędne w podpowiedzi po najechaniu).

export default function OtworzWMapach({ wspolrzedne, przyblizone }: { wspolrzedne: [number, number]; przyblizone?: boolean }) {
    const [lat, lng] = wspolrzedne
    const tekst = `${lat}, ${lng}`
    return (
        <span>
            <a href={`https://www.google.com/maps/search/?api=1&query=${lat},${lng}`} target="_blank" rel="noopener noreferrer" title={tekst}>
                otwórz w Mapach Google ↗
            </a>
            {przyblizone && <span className="text-gray-500"> (położenie przybliżone)</span>}
        </span>
    )
}
