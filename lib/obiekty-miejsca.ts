// OBJ-06 (decyzja 16.11): obiekt w kilku miejscowościach. Pole „Miejscowość” (spatial) zostaje jako główna,
// dodatkowe pole „także w miejscowościach” (spatialAlso) – bez migracji plików. Główna zawsze pierwsza.
export function miejscaObiektu(glowna: string | null | undefined, takze: readonly (string | null | undefined)[] | null | undefined): string[] {
    const wyn: string[] = []
    for (const id of [glowna, ...(takze ?? [])]) if (id && !wyn.includes(id)) wyn.push(id)
    return wyn
}
