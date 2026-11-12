// Minimalny odczyt TopoJSON (https://github.com/topojson/topojson-specification): obszary jako GeoJSON
// i linie granic ze wspólnych odcinków – każdy odcinek raz, z informacją, jakie obszary rozdziela.

export interface Topologia {
    type: 'Topology'
    transform?: { scale: [number, number]; translate: [number, number] }
    arcs: number[][][]
    objects: Record<string, { type: 'GeometryCollection'; geometries: GeometriaTopo[] }>
}

export interface GeometriaTopo {
    type: 'Polygon' | 'MultiPolygon' | null
    arcs?: number[][] | number[][][]
    properties?: Record<string, unknown>
}

type Punkt = [number, number]

export function odcinki(t: Topologia): Punkt[][] {
    const [sx, sy] = t.transform?.scale ?? [1, 1]
    const [tx, ty] = t.transform?.translate ?? [0, 0]
    return t.arcs.map((arc) => {
        let x = 0
        let y = 0
        return arc.map((p) => {
            if (t.transform) {
                x += p[0]
                y += p[1]
                return [x * sx + tx, y * sy + ty] as Punkt
            }
            return [p[0], p[1]] as Punkt
        })
    })
}

function pierscien(ids: number[], luki: Punkt[][]): Punkt[] {
    const wyn: Punkt[] = []
    for (const i of ids) {
        const l = i >= 0 ? luki[i] : [...luki[~i]].reverse()
        // pierwszy punkt kolejnego odcinka = ostatni poprzedniego
        wyn.push(...(wyn.length ? l.slice(1) : l))
    }
    return wyn
}

export function obszary(t: Topologia, obiekt: string, luki = odcinki(t)): GeoJSON.Feature[] {
    return t.objects[obiekt].geometries.flatMap((g) => {
        if (!g.type || !g.arcs) return []
        const geometry: GeoJSON.Geometry =
            g.type === 'Polygon'
                ? { type: 'Polygon', coordinates: (g.arcs as number[][]).map((r) => pierscien(r, luki)) }
                : { type: 'MultiPolygon', coordinates: (g.arcs as number[][][]).map((p) => p.map((r) => pierscien(r, luki))) }
        return [{ type: 'Feature', properties: g.properties ?? {}, geometry }]
    })
}

/**
 * Linie granic: dla każdego odcinka – obszary po obu stronach (a === b na brzegu całości) – i rodzaj z funkcji.
 * Odcinki tego samego rodzaju łączone w jedną MultiLineString.
 */
export function linie(
    t: Topologia,
    obiekt: string,
    rodzaj: (a: Record<string, unknown>, b: Record<string, unknown> | null) => string | null,
    luki = odcinki(t),
): GeoJSON.Feature[] {
    const geom = t.objects[obiekt].geometries
    const uzycia: number[][] = luki.map(() => [])
    geom.forEach((g, gi) => {
        const zbierz = (a: unknown): void => {
            if (typeof a === 'number') {
                const i = a >= 0 ? a : ~a
                if (!uzycia[i].includes(gi)) uzycia[i].push(gi)
            } else if (Array.isArray(a)) a.forEach(zbierz)
        }
        zbierz(g.arcs)
    })
    const grupy = new Map<string, Punkt[][]>()
    uzycia.forEach((u, i) => {
        if (!u.length) return
        const a = geom[u[0]].properties ?? {}
        const b = u.length > 1 ? (geom[u[1]].properties ?? {}) : null
        const r = rodzaj(a, b)
        if (!r) return
        const lista = grupy.get(r) ?? []
        lista.push(luki[i])
        grupy.set(r, lista)
    })
    return [...grupy].map(([r, ls]) => ({ type: 'Feature', properties: { linia: r }, geometry: { type: 'MultiLineString', coordinates: ls } }))
}
