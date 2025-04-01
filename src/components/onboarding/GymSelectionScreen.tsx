import React, { useState, useMemo, useEffect } from 'react';
    import { Search, CheckSquare, Square, MapPin, Loader2 } from 'lucide-react';
    import { supabase } from '../../supabaseClient'; // Import Supabase client
    import { GymData } from '../../types'; // Import GymData type

    interface GymSelectionScreenProps {
      onGymsSelected: (selectedGymIds: string[]) => void;
      onNext: () => void;
    }

    const GymSelectionScreen: React.FC<GymSelectionScreenProps> = ({ onGymsSelected, onNext }) => {
      const [searchTerm, setSearchTerm] = useState('');
      const [selectedGyms, setSelectedGyms] = useState<Set<string>>(new Set());
      const [allGyms, setAllGyms] = useState<GymData[]>([]); // State for fetched gyms
      const [loading, setLoading] = useState(true); // Loading state
      const [error, setError] = useState<string | null>(null); // Error state

      // Fetch gyms from Supabase on component mount
      useEffect(() => {
        const fetchGyms = async () => {
          setLoading(true);
          setError(null);
          const { data, error } = await supabase
            .from('gyms')
            .select('id, name, city, state, country') // Select necessary fields
            .order('name', { ascending: true }); // Order alphabetically

          if (error) {
            console.error('Error fetching gyms:', error);
            setError('Failed to load gyms. Please try again later.');
            setAllGyms([]); // Clear gyms on error
          } else {
            setAllGyms(data || []);
          }
          setLoading(false);
        };

        fetchGyms();
      }, []); // Empty dependency array ensures this runs only once on mount

      const filteredGyms = useMemo(() => {
        if (!searchTerm) return allGyms;
        return allGyms.filter(gym =>
          gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          gym.city.toLowerCase().includes(searchTerm.toLowerCase()) ||
          gym.state.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }, [searchTerm, allGyms]);

      const toggleGymSelection = (gymId: string) => {
        const newSelection = new Set(selectedGyms);
        if (newSelection.has(gymId)) {
          newSelection.delete(gymId);
        } else {
          newSelection.add(gymId);
        }
        setSelectedGyms(newSelection);
        onGymsSelected(Array.from(newSelection)); // Pass array of IDs up
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
                disabled={loading} // Disable search while loading
              />
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
            </div>

            {/* Gym List */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden max-h-[50vh] overflow-y-auto mb-6 border border-gray-200">
              {loading ? (
                <div className="flex justify-center items-center p-10">
                  <Loader2 className="animate-spin text-accent-blue" size={32} />
                  <p className="ml-3 text-brand-gray">Loading gyms...</p>
                </div>
              ) : error ? (
                <p className="text-center text-red-500 p-6">{error}</p>
              ) : filteredGyms.length > 0 ? (
                filteredGyms.map(gym => (
                  <div
                    key={gym.id}
                    onClick={() => toggleGymSelection(gym.id)}
                    className={`flex items-center justify-between p-4 border-b border-gray-100 cursor-pointer hover:bg-gray-50 ${selectedGyms.has(gym.id) ? 'bg-accent-blue/10' : ''}`}
                  >
                    <div className="flex items-center">
                       <MapPin size={18} className="text-brand-gray mr-3 flex-shrink-0" />
                       <div>
                         <p className="font-medium text-brand-gray">{gym.name}</p>
                         <p className="text-sm text-gray-500">{gym.city}, {gym.state}</p> {/* Display city and state */}
                       </div>
                    </div>
                    {selectedGyms.has(gym.id) ? (
                      <CheckSquare className="text-accent-blue" size={24} />
                    ) : (
                      <Square className="text-gray-300" size={24} />
                    )}
                  </div>
                ))
              ) : (
                <p className="text-center text-gray-500 p-6">No gyms found matching your search.</p>
              )}
            </div>

            {/* Action Button */}
            <button
              onClick={onNext} // onNext now handles saving in App.tsx
              disabled={selectedGyms.size === 0 || loading || !!error}
              className={`w-full font-bold py-3 px-6 rounded-lg transition duration-300 shadow-lg ${
                selectedGyms.size > 0 && !loading && !error
                  ? 'bg-accent-blue text-white hover:bg-opacity-90' // Changed to blue for consistency
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
              }`}
            >
              {selectedGyms.size > 0 ? `Continue with ${selectedGyms.size} Gym(s)` : 'Select at least one gym'}
            </button>
             <p className="text-center text-xs text-gray-400 mt-4">Can't find your gym? <button className="underline hover:text-accent-blue">Suggest it</button></p> {/* TODO: Implement suggestion feature */}
          </div>
        </div>
      );
    };

    export default GymSelectionScreen;
