import React, { useState } from 'react';
import { Search, MapPin, TrendingUp, Users, Compass } from 'lucide-react';

// Placeholder data (can be expanded later)
const placeholderTrendingRoutes = [
  { id: 'tr1', name: 'Mega Roof Problem', grade: 'V9', gymName: 'Movement - Englewood', imageUrl: 'https://images.unsplash.com/photo-1605834102817-3538609e5e99?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 'tr2', name: 'Slabtastic Voyage', grade: 'V4', gymName: 'Summit - Dallas', imageUrl: 'https://images.unsplash.com/photo-1579761470270-8d58dd85884a?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 'tr3', name: 'The Cave Traverse', grade: 'V7', gymName: 'Brooklyn Boulders - Queensbridge', imageUrl: 'https://images.unsplash.com/photo-1599118139013-a69c71a5630a?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
];

const placeholderGyms = [
    { id: 'g1', name: 'Sender One - LAX', city: 'Los Angeles, CA' },
    { id: 'g2', name: 'Planet Granite - Sunnyvale', city: 'Sunnyvale, CA' },
    { id: 'g3', name: 'MetroRock - Everett', city: 'Everett, MA' },
];

const DiscoverScreen: React.FC = () => {
  const [gymSearchTerm, setGymSearchTerm] = useState('');

  // TODO: Implement actual search logic for gyms

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <h1 className="text-xl font-bold text-center text-brand-green flex items-center justify-center gap-2">
           <Compass size={24} className="text-accent-blue"/> Discover
        </h1>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-6">
        {/* Gym Search Section */}
        <section>
          <h2 className="text-lg font-semibold text-brand-gray mb-3 flex items-center gap-2">
             <MapPin size={20} /> Find a Gym
          </h2>
          <div className="relative">
            <input
              type="text"
              placeholder="Search gyms by name or location..."
              value={gymSearchTerm}
              onChange={(e) => setGymSearchTerm(e.target.value)}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue bg-white"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
          {/* Placeholder for search results */}
          <div className="mt-3 space-y-2">
             {placeholderGyms.map(gym => (
                <div key={gym.id} className="bg-white p-3 rounded-lg shadow-sm border flex items-center justify-between">
                   <div>
                      <p className="font-medium text-brand-gray">{gym.name}</p>
                      <p className="text-xs text-gray-500">{gym.city}</p>
                   </div>
                   <button className="text-xs bg-accent-blue text-white px-3 py-1 rounded-full hover:bg-opacity-90">View</button>
                </div>
             ))}
          </div>
        </section>

        {/* Community Highlights Section */}
        <section>
          <h2 className="text-lg font-semibold text-brand-gray mb-3 flex items-center gap-2">
             <TrendingUp size={20} /> Community Highlights
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Placeholder Highlight Cards */}
            {placeholderTrendingRoutes.map(route => (
               <div key={route.id} className="bg-white rounded-lg shadow overflow-hidden cursor-pointer hover:shadow-md transition-shadow">
                  <img src={route.imageUrl} alt={route.name} className="w-full h-32 object-cover" />
                  <div className="p-3">
                     <p className="font-semibold text-brand-gray truncate">{route.name} ({route.grade})</p>
                     <p className="text-xs text-gray-500 truncate">{route.gymName}</p>
                  </div>
               </div>
            ))}
          </div>
        </section>

        {/* Friend Finder/Activity Section (Placeholder) */}
        <section>
          <h2 className="text-lg font-semibold text-brand-gray mb-3 flex items-center gap-2">
             <Users size={20} /> Connect
          </h2>
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            <p>Friend activity and climber search coming soon!</p>
            {/* Placeholder for friend search or activity feed */}
          </div>
        </section>
      </main>
    </div>
  );
};

export default DiscoverScreen;
