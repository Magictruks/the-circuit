import React, { useState, useEffect, useCallback, useRef } from 'react';
    import { Search, CheckSquare, Square, MapPin, Loader2 } from 'lucide-react';
    import { supabase } from '../../supabaseClient';
    import { GymData } from '../../types';

    interface GymSelectionScreenProps {
      preSelectedGymsIds: string[];
      onGymsSelected: (selectedGymIds: string[]) => void;
      onNext: () => void;
    }

    const GYM_PAGE_SIZE = 5; // Set page size to 5

    const GymSelectionScreen: React.FC<GymSelectionScreenProps> = ({ preSelectedGymsIds, onGymsSelected, onNext }) => {
      const [searchTerm, setSearchTerm] = useState('');
      const [selectedGyms, setSelectedGyms] = useState<Set<string>>(new Set(preSelectedGymsIds));
      const [gyms, setGyms] = useState<GymData[]>([]); // Renamed from allGyms
      const [loading, setLoading] = useState(true);
      const [loadingMore, setLoadingMore] = useState(false); // State for loading more gyms
      const [error, setError] = useState<string | null>(null);
      const [currentPage, setCurrentPage] = useState(0); // 0-indexed page
      const [hasMoreGyms, setHasMoreGyms] = useState(true); // Track if more gyms are available

      const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

      // --- Fetch Gyms with Pagination and Search ---
      const fetchGyms = useCallback(async (page = 0, loadMore = false, currentSearchTerm = searchTerm) => {
        if (loadMore) {
          setLoadingMore(true);
        } else {
          setLoading(true);
          setGyms([]); // Clear existing gyms on new search/initial load
          setCurrentPage(0); // Reset page number
          setHasMoreGyms(true); // Assume more gyms initially
        }
        setError(null);

        const from = page * GYM_PAGE_SIZE;
        const to = from + GYM_PAGE_SIZE - 1;

        try {
          let query = supabase
            .from('gyms')
            .select('id, name, city, state, country', { count: 'exact' }) // Request count
            .order('name', { ascending: true })
            .range(from, to);

          // Apply search filter if searchTerm exists
          if (currentSearchTerm.trim()) {
            const searchPattern = `%${currentSearchTerm.trim()}%`;
            query = query.or(`name.ilike.${searchPattern},city.ilike.${searchPattern},state.ilike.${searchPattern}`);
          }

          const { data, error: fetchError, count } = await query;

          if (fetchError) {
            throw new Error(`Failed to load gyms: ${fetchError.message}`);
          }

          if (data) {
            setGyms(prevGyms => loadMore ? [...prevGyms, ...data] : data);
            setCurrentPage(page);
            // Check if the total count indicates more gyms than currently loaded
            setHasMoreGyms((page + 1) * GYM_PAGE_SIZE < (count ?? 0));
          } else {
            if (!loadMore) setGyms([]);
            setHasMoreGyms(false);
          }
        } catch (err: any) {
          console.error('Error fetching gyms:', err);
          setError(err.message || 'An unexpected error occurred.');
          if (!loadMore) setGyms([]);
          setHasMoreGyms(false);
        } finally {
          setLoading(false);
          setLoadingMore(false);
        }
      }, [searchTerm]); // Include searchTerm dependency

      // --- Initial Fetch ---
      useEffect(() => {
        fetchGyms(0); // Fetch first page on mount
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []); // Run only once on mount

      // --- Debounced Search Fetch ---
      useEffect(() => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        // Fetch immediately if search is cleared, otherwise debounce
        if (!searchTerm.trim()) {
            fetchGyms(0, false, ''); // Fetch page 0 with empty search term
        } else {
            debounceTimeoutRef.current = setTimeout(() => {
                fetchGyms(0, false, searchTerm); // Fetch page 0 with the current search term
            }, 300); // 300ms debounce
        }

        return () => {
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
        };
      }, [searchTerm, fetchGyms]);


      // --- Toggle Selection ---
      const toggleGymSelection = (gymId: string) => {
        const newSelection = new Set(selectedGyms);
        if (newSelection.has(gymId)) {
          newSelection.delete(gymId);
        } else {
          newSelection.add(gymId);
        }
        setSelectedGyms(newSelection);
        onGymsSelected(Array.from(newSelection));
      };

      // --- Handle Load More ---
      const handleLoadMore = () => {
        if (!loadingMore && hasMoreGyms) {
          fetchGyms(currentPage + 1, true, searchTerm); // Fetch next page, indicate loading more
        }
      };

      return (
        <div className="min-h-screen bg-gray-50 flex flex-col items-center p-4 pt-12">
          <div className="w-full max-w-lg">
            <h2 className="text-3xl font-bold text-center text-brand-green mb-2">Select Your Gym(s)</h2>
            <p className="text-center text-brand-gray mb-6">Choose your primary climbing locations.</p>

            {/* Search Bar */}
            <div className="relative mb-6">
              <input
                type="text"
                placeholder="Search by gym name, city, or state..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
                disabled={loading && !loadingMore} // Disable only during initial load
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {/* Gym List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden max-h-[50vh] overflow-y-auto mb-6 border border-gray-200">
              {loading && gyms.length === 0 ? ( // Show initial loading spinner only if list is empty
                <div className="flex justify-center items-center p-10">
                  <Loader2 className="animate-spin text-accent-blue" size={32} />
                  <p className="ml-3 text-brand-gray">Loading gyms...</p>
                </div>
              ) : error ? (
                <p className="text-center text-red-500 p-6">{error}</p>
              ) : gyms.length > 0 ? (
                <>
                  {gyms.map(gym => (
                    <div
                      key={gym.id}
                      onClick={() => toggleGymSelection(gym.id)}
                      className={`flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedGyms.has(gym.id) ? 'bg-accent-blue/10' : ''}`}
                    >
                      <div className="flex items-center">
                        <MapPin size={18} className="text-brand-gray mr-3 flex-shrink-0" />
                        <div>
                          <p className="font-medium text-brand-gray">{gym.name}</p>
                          <p className="text-sm text-gray-500">{gym.city}, {gym.state}</p>
                        </div>
                      </div>
                      {selectedGyms.has(gym.id) ? (
                        <CheckSquare className="text-accent-blue" size={24} />
                      ) : (
                        <Square className="text-gray-300" size={24} />
                      )}
                    </div>
                  ))}
                  {/* Load More Button/Indicator */}
                  {hasMoreGyms && (
                    <div className="p-4 text-center border-t border-gray-100">
                      <button
                        onClick={handleLoadMore}
                        disabled={loadingMore}
                        className="text-accent-blue hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-full"
                      >
                        {loadingMore ? (
                          <>
                            <Loader2 className="animate-spin mr-2" size={16} /> Loading...
                          </>
                        ) : (
                          'Load More Gyms'
                        )}
                      </button>
                    </div>
                  )}
                </>
              ) : (
                <p className="text-center text-gray-500 p-6">No gyms found matching your search.</p>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={onNext}
              disabled={selectedGyms.size === 0 || loading || !!error} // Disable if initially loading
              className={`w-full font-bold py-3 px-6 rounded-lg transition duration-300 shadow-lg ${
                selectedGyms.size > 0 && !loading && !error
                  ? 'bg-accent-blue text-white hover:bg-opacity-90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedGyms.size > 0 ? `Continue with ${selectedGyms.size} Gym(s)` : 'Select at least one gym'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">Can't find your gym? <button className="underline hover:text-accent-blue">Suggest it</button></p>
          </div>
        </div>
      );
    };

    export default GymSelectionScreen;
