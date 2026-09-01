import { useState, useRef, useEffect, useCallback } from 'react';
import { MapPin, Loader, X } from 'lucide-react';



/**
 * AddressAutocomplete — a reusable address input with live location suggestions.
 *
 * Props:
 * @param {string}   value       - Current value of the address field
 * @param {function} onChange    - Callback: (newValue: string) => void
 * @param {string}   [name]     - Input name attribute
 * @param {string}   [placeholder] - Placeholder text
 * @param {boolean}  [required] - Whether the field is required
 * @param {boolean}  [disabled] - Whether the field is disabled
 * @param {number}   [rows]     - Number of textarea rows (default 2)
 * @param {string}   [className] - Additional CSS classes for the textarea
 * @param {string}   [id]       - Optional element ID
 * @param {function} [onLocationSelect] - Optional callback when location is selected: (address, lat, lng) => void
 */
export default function AddressAutocomplete({
  value,
  onChange,
  name = 'address',
  placeholder = 'Start typing your address (city, area, locality)...',
  required = false,
  disabled = false,
  rows = 2,
  className = '',
  id,
  onLocationSelect
}) {
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [isSearching, setIsSearching] = useState(false);
  const wrapperRef = useRef(null);
  const suggestionsRef = useRef(null);
  const debounceTimer = useRef(null);

  // Close suggestions when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Scroll active suggestion into view
  useEffect(() => {
    if (suggestionsRef.current && highlightIndex >= 0) {
      const item = suggestionsRef.current.children[highlightIndex];
      if (item) {
        item.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [highlightIndex]);

  const searchLocations = useCallback(async (query) => {
    if (!query || query.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);

    try {
      const response = await fetch(`https://photon.komoot.io/api/?q=${encodeURIComponent(query + ' Karnataka')}&limit=8`);
      if (!response.ok) throw new Error('Network response was not ok');
      const data = await response.json();
      
      const results = [];
      
      data.features.forEach(feature => {
        if (feature.properties.state === 'Karnataka' || feature.properties.state === 'karnataka') {
           const p = feature.properties;
           // Build a nice address string
           const parts = [];
           if (p.name) parts.push(p.name);
           if (p.street && p.street !== p.name) parts.push(p.street);
           if (p.locality && p.locality !== p.name) parts.push(p.locality);
           if (p.district && p.district !== p.name && p.district !== p.locality) parts.push(p.district);
           if (p.city && p.city !== p.name && p.city !== p.district) parts.push(p.city);
           
           const addressString = parts.join(', ') + ', Karnataka';
           
           // Ensure uniqueness in the suggestions list
           if (!results.find(r => r.text === addressString)) {
             results.push({
               text: addressString,
               lat: feature.geometry.coordinates[1],
               lng: feature.geometry.coordinates[0]
             });
           }
        }
      });
      
      setSuggestions(results);
      setShowSuggestions(results.length > 0);
      setHighlightIndex(-1);
    } catch (error) {
      console.error('Error fetching location autocomplete:', error);
    } finally {
      setIsSearching(false);
    }
  }, []);

  const handleInputChange = useCallback((e) => {
    const newValue = e.target.value;
    onChange(newValue);

    // Debounce the search
    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      searchLocations(newValue);
    }, 150);
  }, [onChange, searchLocations]);

  const handleSelectSuggestion = useCallback((suggestion) => {
    const addressText = suggestion.text;
    onChange(addressText);
    
    if (onLocationSelect) {
      onLocationSelect(addressText, suggestion.lat, suggestion.lng);
    }
    
    setShowSuggestions(false);
    setSuggestions([]);
    setHighlightIndex(-1);
  }, [onChange, onLocationSelect]);

  const handleKeyDown = useCallback((e) => {
    if (!showSuggestions || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightIndex(prev =>
          prev < suggestions.length - 1 ? prev + 1 : 0
        );
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightIndex(prev =>
          prev > 0 ? prev - 1 : suggestions.length - 1
        );
        break;
      case 'Enter':
        if (highlightIndex >= 0 && highlightIndex < suggestions.length) {
          e.preventDefault();
          handleSelectSuggestion(suggestions[highlightIndex]);
        }
        break;
      case 'Escape':
        setShowSuggestions(false);
        setHighlightIndex(-1);
        break;
      default:
        break;
    }
  }, [showSuggestions, suggestions, highlightIndex, handleSelectSuggestion]);

  const handleFocus = useCallback(() => {
    if (value && value.trim().length >= 2) {
      searchLocations(value);
    }
  }, [value, searchLocations]);

  const highlightMatch = (text, query) => {
    if (!query || query.trim().length < 2) return text;
    const q = query.trim();
    const idx = text.toLowerCase().indexOf(q.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.substring(0, idx)}
        <strong className="text-brand-600 dark:text-brand-400 font-extrabold">{text.substring(idx, idx + q.length)}</strong>
        {text.substring(idx + q.length)}
      </>
    );
  };

  return (
    <div ref={wrapperRef} className="relative">
      <textarea
        id={id}
        name={name}
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        onFocus={handleFocus}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        rows={rows}
        autoComplete="off"
        className={className}
      />

      {/* Searching indicator */}
      {isSearching && (
        <div className="absolute right-3 top-2.5">
          <Loader className="h-3.5 w-3.5 text-brand-500 animate-spin" />
        </div>
      )}

      {/* Suggestions dropdown */}
      {showSuggestions && suggestions.length > 0 && !disabled && (
        <div
          ref={suggestionsRef}
          className="absolute left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-600 rounded-xl shadow-2xl overflow-hidden max-h-56 overflow-y-auto animate-fade-in"
          style={{
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.15), 0 4px 12px -4px rgba(0,0,0,0.1)'
          }}
        >
          {/* Header */}
          <div className="px-3 py-2 bg-slate-50 dark:bg-slate-900/60 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-wider flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              Location Suggestions
            </span>
            <button
              type="button"
              onClick={() => { setShowSuggestions(false); setHighlightIndex(-1); }}
              className="h-4 w-4 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-600 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              <X className="h-3 w-3" />
            </button>
          </div>

          {/* Items */}
          {suggestions.map((suggestion, index) => (
            <button
              key={`${suggestion}-${index}`}
              type="button"
              onClick={() => handleSelectSuggestion(suggestion)}
              onMouseEnter={() => setHighlightIndex(index)}
              className={`w-full text-left px-3 py-2.5 flex items-center gap-2.5 text-xs transition-colors duration-100 border-b border-slate-50 dark:border-slate-700/50 last:border-b-0 ${
                index === highlightIndex
                  ? 'bg-brand-50 dark:bg-brand-950/20 text-brand-700 dark:text-brand-300'
                  : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700/50'
              }`}
            >
              <MapPin className={`h-3.5 w-3.5 shrink-0 ${
                index === highlightIndex ? 'text-brand-500' : 'text-slate-400 dark:text-slate-500'
              }`} />
              <span className="font-semibold truncate">
                {highlightMatch(suggestion.text, value)}
              </span>
            </button>
          ))}

          {/* Footer hint */}
          <div className="px-3 py-1.5 bg-slate-50 dark:bg-slate-900/60 border-t border-slate-100 dark:border-slate-700">
            <p className="text-[9px] text-slate-400 dark:text-slate-500 font-medium">
              ↑↓ Navigate &bull; Enter to select &bull; Esc to close
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
