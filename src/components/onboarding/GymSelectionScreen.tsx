import React, { useState, useMemo } from 'react';
import { Search, CheckSquare, Square, MapPin } from 'lucide-react';

// Placeholder Gym Data (Replace with API call later)
const ALL_GYMS = [
  { id: 'gym1', name: 'Summit Climbing', city: 'Dallas, TX' },
  { id: 'gym2', name: 'Movement', city: 'Denver, CO' },
  { id: 'gym3', name: 'Brooklyn Boulders', city: 'Brooklyn, NY' },
  { id: 'gym4', name: 'Sender One', city: 'Santa Ana, CA' },
  { id: 'gym5', name: 'The Cliffs', city: 'Long Island City, NY' },
  { id: 'gym6', name: 'Planet Granite', city: 'Portland, OR' },
  { id: 'gym7', name: 'Austin Bouldering Project', city: 'Austin, TX' },
  { id: 'gym8', name: 'Vertical World', city: 'Seattle, WA' },
];

interface GymSelectionScreenProps {
  onGymsSelected: (selectedGymIds: string[]) => void;
  onNext: () => void;
}

const GymSelectionScreen: React.FC<GymSelectionScreenProps> = ({ onGymsSelected, onNext }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedGyms, setSelectedGyms] = useState<Set<string>>(new Set());

  const filteredGyms = useMemo(() => {
    if (!searchTerm) return ALL_GYMS;
    return ALL_GYMS.filter(gym =>
      gym.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      gym.city.toLowerCase().includes(searchTerm.toLowerCase())
    );
  }, [searchTerm]);

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
            placeholder="Search by gym name or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue"
          />
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
        </div>

        {/* Gym List */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden max-h-[50vh] overflow-y-auto mb-6 border border-gray-200">
          {filteredGyms.length > 0 ? (
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
                     <p className="text-sm text-gray-500">{gym.city}</p>
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
          onClick={onNext}
          disabled={selectedGyms.size === 0}
          className={`w-full font-bold py-3 px-6 rounded-lg transition duration-300 shadow-lg ${
            selectedGyms.size > 0
              ? 'bg-accent-green text-white hover:bg-opacity-90' // Use a green accent if available, else blue
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          } bg-accent-blue text-white`} // Defaulting to blue for now
        >
          {selectedGyms.size > 0 ? `Continue with ${selectedGyms.size} Gym(s)` : 'Select at least one gym'}
        </button>
         <p className="text-center text-xs text-gray-400 mt-4">Can't find your gym? <button className="underline hover:text-accent-blue">Suggest it</button></p> {/* TODO: Implement suggestion feature */}
      </div>
    </div>
  );
};

export default GymSelectionScreen;
