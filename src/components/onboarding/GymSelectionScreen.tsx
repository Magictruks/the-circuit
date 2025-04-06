import React, { useState, useEffect, useCallback, useRef } from 'react';
    import { Search, CheckSquare, Square, MapPin, Loader2, X, Send, CheckCircle } from 'lucide-react'; // Added X, Send, CheckCircle
    import { supabase, submitFeedback } from '../../supabaseClient'; // Import submitFeedback
    import { GymData } from '../../types';
    import type { User } from '@supabase/supabase-js'; // Import User type

    interface GymSelectionScreenProps {
      preSelectedGymsIds: string[];
      onGymsSelected: (selectedGymIds: string[]) => void;
      onNext: (selectedGymIds: string[]) => void; // Pass selected IDs directly
      currentUser: User | null; // Pass current user
    }

    // Simple Modal Component (can be extracted later if needed)
    const FeedbackModal: React.FC<{ title: string; feedbackType: 'contact' | 'suggestion'; onClose: () => void; currentUser: User | null }> = ({ title, feedbackType, onClose, currentUser }) => {
      const [message, setMessage] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const [success, setSuccess] = useState(false);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !currentUser) {
          setError(!currentUser ? "You must be logged in to send feedback." : "Message cannot be empty.");
          return;
        }
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
          await submitFeedback(feedbackType, message);
          setSuccess(true);
          setMessage(''); // Clear message on success
          // Optionally close modal after a delay
          setTimeout(onClose, 2000);
        } catch (err: any) {
          setError(err.message || "An unexpected error occurred.");
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-brand-gray">{title}</h3>
              <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {success ? (
                <div className="text-center py-4">
                  <CheckCircle className="mx-auto text-green-500 mb-2" size={40} />
                  <p className="text-brand-gray font-medium">Suggestion Sent!</p>
                  <p className="text-sm text-gray-500">Thank you for your input.</p>
                </div>
              ) : (
                <>
                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter gym name, location, and any other details..."
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue disabled:bg-gray-100"
                    required
                    disabled={isSubmitting || !currentUser}
                  />
                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                  {!currentUser && <p className="text-yellow-600 text-sm text-center bg-yellow-50 p-2 rounded border border-yellow-200">You must be logged in to suggest a gym.</p>}
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim() || !currentUser}
                    className="w-full bg-accent-blue hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Send Suggestion</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      );
    };


    const GYM_PAGE_SIZE = 5; // Set page size to 5

    const GymSelectionScreen: React.FC<GymSelectionScreenProps> = ({ preSelectedGymsIds, onGymsSelected, onNext, currentUser }) => {
      const [searchTerm, setSearchTerm] = useState('');
      const [selectedGyms, setSelectedGyms] = useState<Set<string>>(new Set(preSelectedGymsIds));
      const [gyms, setGyms] = useState<GymData[]>([]); // Renamed from allGyms
      const [loading, setLoading] = useState(false);
      const [loadingMore, setLoadingMore] = useState(false); // State for loading more gyms
      const [error, setError] = useState<string | null>(null);
      const [currentPage, setCurrentPage] = useState(0); // 0-indexed page
      const [hasMoreGyms, setHasMoreGyms] = useState(true); // Track if more gyms are available
      const [showSuggestionForm, setShowSuggestionForm] = useState(false); // State for suggestion modal

      const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

      // --- Fetch Gyms with Pagination and Search ---
      const fetchGyms = useCallback(async (page = 0, loadMore = false, currentSearchTerm = searchTerm) => {
        if (loadMore) {
          setLoadingMore(true);
        } else {
          // setLoading(true); // Keep initial loading subtle
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
          // setLoading(false);
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
        onGymsSelected(Array.from(newSelection)); // Notify parent immediately
      };

      // --- Handle Load More ---
      const handleLoadMore = () => {
        if (!loadingMore && hasMoreGyms) {
          fetchGyms(currentPage + 1, true, searchTerm); // Fetch next page, indicate loading more
        }
      };

      const handleOnNext = () => {
        // setLoading(true); // Consider if loading state is needed here
        onNext(Array.from(selectedGyms)); // Pass the final selection
      }

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
              onClick={handleOnNext}
              disabled={selectedGyms.size === 0 || loading || !!error} // Disable if initially loading
              className={`w-full font-bold py-3 px-6 rounded-lg transition duration-300 shadow-lg ${
                selectedGyms.size > 0 && !loading && !error
                  ? 'bg-accent-blue text-white hover:bg-opacity-90'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedGyms.size > 0 ? `Continue with ${selectedGyms.size} Gym(s)` : 'Select at least one gym'}
            </button>
            <p className="text-center text-xs text-gray-400 mt-4">
              Can't find your gym?{' '}
              <button
                onClick={() => setShowSuggestionForm(true)} // Open the modal
                className="underline hover:text-accent-blue disabled:opacity-50"
                disabled={!currentUser} // Disable if not logged in
              >
                Suggest it
              </button>
            </p>
          </div>

          {/* Suggestion Modal */}
          {showSuggestionForm && (
            <FeedbackModal
              title="Suggest a Gym"
              feedbackType="suggestion"
              onClose={() => setShowSuggestionForm(false)}
              currentUser={currentUser}
            />
          )}
        </div>
      );
    };

    export default GymSelectionScreen;
