import React, { useState, useEffect, useRef } from 'react'
import { MapPin, Search, Navigation, Loader2 } from 'lucide-react'
import { searchLocations, POPULAR_CITIES } from '../services/airQualityService.js'

export default function LocationSelector({ currentLocation, onSelectLocation, t, announce }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const [detecting, setDetecting] = useState(false)
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef(null)

  // Debounced search
  useEffect(() => {
    if (!query || query.trim().length < 2) {
      setResults([])
      setIsOpen(false)
      return
    }

    const timer = setTimeout(async () => {
      setSearching(true)
      const res = await searchLocations(query)
      setResults(res)
      setSearching(false)
      setIsOpen(res.length > 0)
    }, 280)

    return () => clearTimeout(timer)
  }, [query])

  // Close dropdown on click outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleSelect = (loc) => {
    onSelectLocation(loc)
    setQuery('')
    setIsOpen(false)
    announce(`Selected location: ${loc.name}, ${loc.country}`)
  }

  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      announce('Geolocation is not supported by your browser')
      return
    }
    setDetecting(true)
    announce(t.detectingLocation)

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords
        try {
          // Reverse geocoding or fallback label
          const loc = {
            name: 'Current Location',
            display: `GPS (${latitude.toFixed(2)}°, ${longitude.toFixed(2)}°)`,
            lat: latitude,
            lon: longitude,
            country: 'Local',
          }
          onSelectLocation(loc)
          announce(`Location updated to coordinates ${latitude.toFixed(2)}, ${longitude.toFixed(2)}`)
        } catch {
          onSelectLocation({ name: 'Current Location', lat: latitude, lon: longitude })
        } finally {
          setDetecting(false)
        }
      },
      (err) => {
        setDetecting(false)
        console.warn('Geolocation failed:', err)
        announce('Could not detect location. Please search manually.')
      },
      { timeout: 8000 }
    )
  }

  return (
    <div className="bg-white dark:bg-slate-900 rounded-2xl p-4 sm:p-5 border border-slate-200 dark:border-slate-800 shadow-sm transition-colors">
      <div className="flex items-center justify-between gap-2 mb-3">
        <label htmlFor="city-search" className="text-sm font-semibold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
          <MapPin className="w-4 h-4 text-teal-600" aria-hidden="true" />
          {t.locationSection}
        </label>
        {currentLocation && (
          <span className="text-xs font-medium text-teal-700 dark:text-teal-400 bg-teal-50 dark:bg-teal-950 px-2 py-0.5 rounded-md border border-teal-200 dark:border-teal-800">
            Current: {currentLocation.name}
          </span>
        )}
      </div>

      <div className="flex flex-col sm:flex-row gap-2" ref={dropdownRef}>
        <div className="relative flex-1">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" aria-hidden="true" />
            <input
              id="city-search"
              type="text"
              role="combobox"
              aria-expanded={isOpen}
              aria-autocomplete="list"
              aria-controls="location-results"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t.searchPlaceholder}
              className="w-full pl-9 pr-8 py-2 text-sm bg-slate-50 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 rounded-xl text-slate-900 dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-teal-500 focus:border-transparent transition-all"
            />
            {searching && (
              <Loader2 className="w-4 h-4 text-teal-600 animate-spin absolute right-3 top-1/2 -translate-y-1/2" aria-hidden="true" />
            )}
          </div>

          {/* Autocomplete Dropdown */}
          {isOpen && results.length > 0 && (
            <ul
              id="location-results"
              role="listbox"
              className="absolute left-0 right-0 mt-1.5 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-lg z-30 max-h-56 overflow-auto py-1"
            >
              {results.map((loc, idx) => (
                <li
                  key={idx}
                  role="option"
                  aria-selected={false}
                  tabIndex={0}
                  onClick={() => handleSelect(loc)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSelect(loc)}
                  className="px-3 py-2 text-sm text-slate-700 dark:text-slate-200 hover:bg-teal-50 dark:hover:bg-slate-700 cursor-pointer flex items-center justify-between"
                >
                  <span className="font-medium">{loc.display}</span>
                  <span className="text-xs text-slate-400 uppercase">{loc.countryCode}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* GPS Geolocation Button */}
        <button
          onClick={handleUseCurrentLocation}
          disabled={detecting}
          className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-300 dark:border-slate-700 transition-colors focus:outline-none focus:ring-2 focus:ring-teal-500"
          aria-label={t.useMyLocation}
        >
          {detecting ? (
            <Loader2 className="w-4 h-4 animate-spin text-teal-600" aria-hidden="true" />
          ) : (
            <Navigation className="w-4 h-4 text-teal-600" aria-hidden="true" />
          )}
          <span>{detecting ? t.detectingLocation : t.useMyLocation}</span>
        </button>
      </div>

      {/* Quick Pick Popular Cities */}
      <div className="mt-3 flex flex-wrap items-center gap-1.5">
        <span className="text-xs text-slate-500 dark:text-slate-400 mr-1">{t.popularCities}:</span>
        {POPULAR_CITIES.map((c) => (
          <button
            key={c.name}
            onClick={() => handleSelect(c)}
            className={`text-xs px-2.5 py-1 rounded-lg border transition-all ${
              currentLocation?.name === c.name
                ? 'bg-teal-600 text-white border-teal-600 shadow-xs'
                : 'bg-slate-50 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-teal-400'
            }`}
          >
            {c.name}
          </button>
        ))}
      </div>
    </div>
  )
}
