import React, { useState, useEffect } from 'react';
import { useLogger } from '../hooks/useLogger';
import { api } from '../services/api';
import { SearchFilter, FilterOptions } from '../components/SearchFilter';

interface DealerInfo {
  id: number;
  business_name: string;
  distance?: number;
  average_rating: number;
  total_customers: number;
  description?: string;
  review_count: number;
}

export const CustomerDashboard: React.FC = () => {
  const [dealers, setDealers] = useState<DealerInfo[]>([]);
  const [filteredDealers, setFilteredDealers] = useState<DealerInfo[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [filters, setFilters] = useState<FilterOptions>({
    priceRange: [0, 100],
    distance: 50,
    rating: 0,
    categories: [],
    availability: 'all'
  });
  const [isLoading, setIsLoading] = useState(true);

  const { logAction, logPerformance, measureAsync } = useLogger({ 
    componentName: 'CustomerDashboard' 
  });

  // Load dealers
  useEffect(() => {
    const loadDealers = async () => {
      try {
        const result = await measureAsync(
          async () => {
            // Try to get user location
            let locationParams = {};
            try {
              const position = await new Promise<GeolocationPosition>((resolve, reject) => {
                navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 });
              });
              locationParams = {
                lat: position.coords.latitude,
                lng: position.coords.longitude
              };
            } catch (locationError) {
              // Use default location if geolocation fails
              logger.info('Using default location', 'GEOLOCATION');
            }

            const response = await api.getDealers(locationParams);
            if (response.error) {
              throw new Error(response.error);
            }
            return response.data || [];
          },
          'load_dealers'
        );

        setDealers(result);
        setIsLoading(false);
      } catch (error) {
        logger.error('Failed to load dealers', error as Error);
        setIsLoading(false);
      }
    };

    loadDealers();
  }, [measureAsync]);

  const handleSearch = (value: string) => {
    setSearchTerm(value);
    logAction('dealer_search', { searchTerm: value, length: value.length });
  };

  const handleFilterChange = (newFilters: FilterOptions) => {
    setFilters(newFilters);
    logAction('filters_changed', { filters: newFilters });
  };

  const handleDealerClick = (dealer: DealerInfo) => {
    logAction('dealer_clicked', { 
      dealerId: dealer.id, 
      dealerName: dealer.business_name,
      distance: dealer.distance,
      rating: dealer.average_rating
    });
    
    // In a real app, this would navigate to dealer details
    alert(`Viewing details for ${dealer.business_name}`);
  };

  const handleAddToFavorites = (dealer: DealerInfo, e: React.MouseEvent) => {
    e.stopPropagation();
    logAction('add_to_favorites', { 
      dealerId: dealer.id, 
      dealerName: dealer.business_name 
    });
    
    // Visual feedback
    const target = e.currentTarget as HTMLElement;
    target.classList.add('favorited');
    setTimeout(() => target.classList.remove('favorited'), 1000);
  };

  // Filter and sort dealers
  useEffect(() => {
    const startTime = performance.now();
    
    let result = dealers.filter(dealer => {
      // Search term filter
      if (searchTerm && !(
        dealer.business_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (dealer.description && dealer.description.toLowerCase().includes(searchTerm.toLowerCase()))
      )) {
        return false;
      }

      // Distance filter
      if (dealer.distance && dealer.distance > filters.distance) {
        return false;
      }

      // Rating filter
      if (dealer.average_rating < filters.rating) {
        return false;
      }

      return true;
    });

    // Sort by distance or rating
    result.sort((a, b) => {
      if (filters.distance < 50) {
        // If filtering by distance, sort by distance
        return (a.distance || 999) - (b.distance || 999);
      }
      // Otherwise sort by rating
      return (b.average_rating || 0) - (a.average_rating || 0);
    });

    setFilteredDealers(result);

    const filterTime = performance.now() - startTime;
    logPerformance('filter_and_sort_time', filterTime, {
      searchTerm,
      resultCount: result.length,
      totalDealers: dealers.length,
      activeFilters: Object.keys(filters).filter(k => {
        const v = filters[k as keyof FilterOptions];
        if (k === 'priceRange') return (v as number[])[0] > 0 || (v as number[])[1] < 100;
        if (k === 'distance') return v < 50;
        if (k === 'rating') return v > 0;
        if (k === 'categories') return (v as string[]).length > 0;
        if (k === 'availability') return v !== 'all';
        return false;
      })
    });
  }, [dealers, searchTerm, filters, logPerformance]);

  return (
    <div className="page-container">
      <div className="page-header">
        <h1>Find Your Perfect Mate Dealer</h1>
      </div>

      <div className="page-content">
        <SearchFilter
          onSearch={handleSearch}
          onFilterChange={handleFilterChange}
          resultCount={filteredDealers.length}
          categories={['Traditional', 'Organic', 'Flavored', 'Premium']}
        />

        {isLoading ? (
          <div className="loading-state">
            <div className="spinner"></div>
            <p>Loading dealers near you...</p>
          </div>
        ) : (
          <div className="dealers-grid">
            {filteredDealers.length === 0 ? (
              <div className="no-results">
                <p>No dealers found matching "{searchTerm}"</p>
                <button onClick={() => handleSearch('')}>Clear search</button>
              </div>
            ) : (
              filteredDealers.map(dealer => (
                <div 
                  key={dealer.id} 
                  className="dealer-card"
                  onClick={() => handleDealerClick(dealer)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter') handleDealerClick(dealer);
                  }}
                >
                  <div className="dealer-header">
                    <h3>{dealer.business_name}</h3>
                    <button 
                      className="favorite-button"
                      onClick={(e) => handleAddToFavorites(dealer, e)}
                      aria-label="Add to favorites"
                    >
                      ♥
                    </button>
                  </div>
                  
                  <div className="dealer-info">
                    {dealer.distance && (
                      <span className="distance">📍 {dealer.distance.toFixed(1)} km</span>
                    )}
                    <span className="rating">
                      {'⭐'.repeat(Math.floor(dealer.average_rating || 0))} {(dealer.average_rating || 0).toFixed(1)}
                    </span>
                  </div>
                  
                  <div className="dealer-stats">
                    <span className="stat">
                      {dealer.total_customers} customers
                    </span>
                    {dealer.review_count > 0 && (
                      <span className="stat">
                        {dealer.review_count} reviews
                      </span>
                    )}
                  </div>
                  
                  {dealer.description && (
                    <p className="dealer-description">
                      {dealer.description}
                    </p>
                  )}
                  
                  <button className="view-details-button">
                    View Products →
                  </button>
                </div>
              ))
            )}
          </div>
        )}

        <div className="dashboard-stats">
          <div className="stat-card">
            <h4>Dealers Found</h4>
            <p className="stat-value">{filteredDealers.length}</p>
          </div>
          <div className="stat-card">
            <h4>Average Distance</h4>
            <p className="stat-value">
              {filteredDealers.length > 0 
                ? (filteredDealers.reduce((sum, d) => sum + (d.distance || 0), 0) / filteredDealers.filter(d => d.distance).length || 0).toFixed(1)
                : '0'} km
            </p>
          </div>
          <div className="stat-card">
            <h4>Average Rating</h4>
            <p className="stat-value">
              {filteredDealers.length > 0 
                ? (filteredDealers.reduce((sum, d) => sum + (d.average_rating || 0), 0) / filteredDealers.length).toFixed(1)
                : '0'} ⭐
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};