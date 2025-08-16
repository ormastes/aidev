import React, { useState, useCallback, useEffect } from 'react';
import { useLogger } from '../hooks/useLogger';

export interface FilterOptions {
  priceRange: [number, number];
  distance: number;
  rating: number;
  categories: string[];
  availability: 'all' | 'available' | 'out_of_stock';
}

interface SearchFilterProps {
  onSearch: (searchTerm: string) => void;
  onFilterChange: (filters: FilterOptions) => void;
  categories?: string[];
  resultCount?: number;
}

export const SearchFilter: React.FC<SearchFilterProps> = ({
  onSearch,
  onFilterChange,
  categories = [],
  resultCount = 0
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [0, 100],
    distance: 50,
    rating: 0,
    categories: [],
    availability: 'all'
  });
  const [searchSuggestions, setSearchSuggestions] = useState<string[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { logAction } = useLogger({ componentName: 'SearchFilter' });

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      onSearch(searchTerm);
      logAction('search_performed', { searchTerm, length: searchTerm.length });
    }, 300);

    return () => clearTimeout(timer);
  }, [searchTerm, onSearch, logAction]);

  // Generate search suggestions
  useEffect(() => {
    if (searchTerm.length > 2) {
      // In a real app, this would call an API
      const suggestions = [
        'Traditional Mate',
        'Organic Mate',
        'Flavored Mate',
        'Mate Accessories',
        'Premium Yerba'
      ].filter(s => s.toLowerCase().includes(searchTerm.toLowerCase()));
      
      setSearchSuggestions(suggestions);
      setShowSuggestions(true);
    } else {
      setShowSuggestions(false);
    }
  }, [searchTerm]);

  const handleFilterChange = useCallback((newFilters: Partial<FilterOptions>) => {
    const updatedFilters = { ...filters, ...newFilters };
    setFilters(updatedFilters);
    onFilterChange(updatedFilters);
    
    logAction('filter_changed', {
      filterType: Object.keys(newFilters)[0],
      value: Object.values(newFilters)[0]
    });
  }, [filters, onFilterChange, logAction]);

  const handleSuggestionClick = (suggestion: string) => {
    setSearchTerm(suggestion);
    setShowSuggestions(false);
    logAction('search_suggestion_clicked', { suggestion });
  };

  const clearFilters = () => {
    const defaultFilters: FilterOptions = {
      priceRange: [0, 100],
      distance: 50,
      rating: 0,
      categories: [],
      availability: 'all'
    };
    setFilters(defaultFilters);
    onFilterChange(defaultFilters);
    logAction('filters_cleared');
  };

  const activeFilterCount = 
    (filters.priceRange[0] > 0 || filters.priceRange[1] < 100 ? 1 : 0) +
    (filters.distance < 50 ? 1 : 0) +
    (filters.rating > 0 ? 1 : 0) +
    (filters.categories.length > 0 ? 1 : 0) +
    (filters.availability !== 'all' ? 1 : 0);

  return (
    <div className="search-filter-container">
      <div className="search-bar">
        <div className="search-input-wrapper">
          <span className="search-icon">🔍</span>
          <input
            type="text"
            className="search-input"
            placeholder="Search dealers, products, or categories..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onFocus={() => searchSuggestions.length > 0 && setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
          />
          {searchTerm && (
            <button
              className="clear-search"
              onClick={() => setSearchTerm('')}
              aria-label="Clear search"
            >
              ✕
            </button>
          )}
        </div>
        
        <button
          className={`filter-toggle ${showFilters ? 'active' : ''}`}
          onClick={() => {
            setShowFilters(!showFilters);
            logAction('filter_panel_toggled', { isOpen: !showFilters });
          }}
        >
          <span className="filter-icon">⚙️</span>
          Filters
          {activeFilterCount > 0 && (
            <span className="filter-badge">{activeFilterCount}</span>
          )}
        </button>

        {showSuggestions && searchSuggestions.length > 0 && (
          <div className="search-suggestions">
            {searchSuggestions.map((suggestion, index) => (
              <div
                key={index}
                className="suggestion-item"
                onClick={() => handleSuggestionClick(suggestion)}
              >
                🔍 {suggestion}
              </div>
            ))}
          </div>
        )}
      </div>

      {showFilters && (
        <div className="filter-panel">
          <div className="filter-header">
            <h3>Filter Results</h3>
            <button onClick={clearFilters} className="clear-filters-btn">
              Clear All
            </button>
          </div>

          <div className="filter-group">
            <label className="filter-label">Price Range</label>
            <div className="price-range-controls">
              <input
                type="range"
                min="0"
                max="100"
                value={filters.priceRange[0]}
                onChange={(e) => handleFilterChange({
                  priceRange: [parseInt(e.target.value), filters.priceRange[1]]
                })}
                className="range-slider"
              />
              <input
                type="range"
                min="0"
                max="100"
                value={filters.priceRange[1]}
                onChange={(e) => handleFilterChange({
                  priceRange: [filters.priceRange[0], parseInt(e.target.value)]
                })}
                className="range-slider"
              />
              <div className="price-range-display">
                ${filters.priceRange[0]} - ${filters.priceRange[1]}
              </div>
            </div>
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Maximum Distance: {filters.distance} km
            </label>
            <input
              type="range"
              min="1"
              max="50"
              value={filters.distance}
              onChange={(e) => handleFilterChange({ distance: parseInt(e.target.value) })}
              className="range-slider"
            />
          </div>

          <div className="filter-group">
            <label className="filter-label">
              Minimum Rating: {filters.rating} ⭐
            </label>
            <div className="rating-buttons">
              {[0, 1, 2, 3, 4, 5].map((rating) => (
                <button
                  key={rating}
                  className={`rating-btn ${filters.rating === rating ? 'active' : ''}`}
                  onClick={() => handleFilterChange({ rating })}
                >
                  {rating === 0 ? 'Any' : `${rating}+`}
                </button>
              ))}
            </div>
          </div>

          {categories.length > 0 && (
            <div className="filter-group">
              <label className="filter-label">Categories</label>
              <div className="category-checkboxes">
                {categories.map((category) => (
                  <label key={category} className="checkbox-label">
                    <input
                      type="checkbox"
                      checked={filters.categories.includes(category)}
                      onChange={(e) => {
                        const newCategories = e.target.checked
                          ? [...filters.categories, category]
                          : filters.categories.filter(c => c !== category);
                        handleFilterChange({ categories: newCategories });
                      }}
                    />
                    {category}
                  </label>
                ))}
              </div>
            </div>
          )}

          <div className="filter-group">
            <label className="filter-label">Availability</label>
            <div className="availability-options">
              <label className="radio-label">
                <input
                  type="radio"
                  name="availability"
                  value="all"
                  checked={filters.availability === 'all'}
                  onChange={(e) => handleFilterChange({ availability: 'all' })}
                />
                All
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="availability"
                  value="available"
                  checked={filters.availability === 'available'}
                  onChange={(e) => handleFilterChange({ availability: 'available' })}
                />
                Available
              </label>
              <label className="radio-label">
                <input
                  type="radio"
                  name="availability"
                  value="out_of_stock"
                  checked={filters.availability === 'out_of_stock'}
                  onChange={(e) => handleFilterChange({ availability: 'out_of_stock' })}
                />
                Out of Stock
              </label>
            </div>
          </div>

          <div className="filter-results">
            <p>Showing {resultCount} results</p>
          </div>
        </div>
      )}
    </div>
  );
};