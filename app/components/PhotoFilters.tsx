'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

interface PhotoFiltersProps {
  locations: string[]
  categories: string[]
  years: string[]
  onFilterChange: (filters: FilterState) => void
}

export interface FilterState {
  location: string
  category: string
  year: string
  search: string
}

export default function PhotoFilters({ locations, categories, years, onFilterChange }: PhotoFiltersProps) {
  const [filters, setFilters] = useState<FilterState>({
    location: 'wszystkie',
    category: 'wszystkie',
    year: 'wszystkie',
    search: ''
  })

  useEffect(() => {
    onFilterChange(filters)
  }, [filters, onFilterChange])

  const locationLabels: { [key: string]: string } = {
    'olszanka': 'Olszanka',
    'korczowka': 'Korczówka',
    'prochenki': 'Próchenki',
    'szydlowka': 'Szydłówka',
    'bejdy': 'Bejdy',
    'dawidy': 'Dawidy',
    'lepki stare': 'Łepki Stare',
    'lepki nowe': 'Łepki Nowe',
    'hadynow': 'Hadynów',
    'pietrusy': 'Pietrusy',
    'mszanna': 'Mszanna',
    'bolesty': 'Bolesty',
    'szawly': 'Szawły',
    'wyczolki': 'Wyczółki',
    'radlnia': 'Radlnia',
    'losice': 'Łosice',
    'luniew': 'Łuniew',
    'luby': 'Łuby',
    'kozuszki': 'Kożuszki',
    'krzewica': 'Krzewica',
    'poscisze': 'Pościsze',
    'krzesk': 'Krzesk',
    'miedzyrzec': 'Międzyrzec Podlaski',
    'inne': 'Inne'
  }

  const categoryLabels: { [key: string]: string } = {
    'osoby': 'Osoby',
    'koscioly': 'Kościoły',
    'szkoly': 'Szkoły',
    'budynki': 'Budynki',
    'uroczystosci': 'Uroczystości',
    'krajobrazy': 'Krajobrazy',
    'zycie-codzienne': 'Życie codzienne'
  }

  return (
      <div>
        {/* Wyszukiwarka */}
        <Input
            type="text"
            placeholder="szukaj..."
            value={filters.search}
            onChange={(e) => setFilters({ ...filters, search: e.target.value })}
            className="lowercase h-10 text-base px-4"
        />

        {/* Filtry */}
        <div className="flex flex-wrap gap-4 mt-6">
          {/* Miejscowości */}
          <Select
              value={filters.location}
              onValueChange={(value) => setFilters({ ...filters, location: value })}
          >
            <SelectTrigger className="w-[220px] h-10 text-base lowercase px-4">
              <SelectValue placeholder="wszystkie miejsca" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wszystkie">wszystkie miejsca</SelectItem>
              {locations.map(loc => (
                  <SelectItem key={loc} value={loc} className="lowercase">
                    {locationLabels[loc] || loc}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Kategorie */}
          <Select
              value={filters.category}
              onValueChange={(value) => setFilters({ ...filters, category: value })}
          >
            <SelectTrigger className="w-[220px] h-10 text-base lowercase px-4">
              <SelectValue placeholder="wszystkie kategorie" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wszystkie">wszystkie kategorie</SelectItem>
              {categories.map(cat => (
                  <SelectItem key={cat} value={cat} className="lowercase">
                    {categoryLabels[cat] || cat}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Lata */}
          <Select
              value={filters.year}
              onValueChange={(value) => setFilters({ ...filters, year: value })}
          >
            <SelectTrigger className="w-[180px] h-10 text-base lowercase px-4">
              <SelectValue placeholder="wszystkie lata" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="wszystkie">wszystkie lata</SelectItem>
              {years.sort().reverse().map(year => (
                  <SelectItem key={year} value={year}>
                    {year}
                  </SelectItem>
              ))}
            </SelectContent>
          </Select>

          {/* Reset */}
          <Button
              variant="outline"
              size="default"
              onClick={() => setFilters({ location: 'wszystkie', category: 'wszystkie', year: 'wszystkie', search: '' })}
              className="h-10 text-base lowercase px-6"
          >
            wyczyść
          </Button>
        </div>
      </div>
  )
}