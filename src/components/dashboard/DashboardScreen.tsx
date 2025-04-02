import React, { useState } from 'react';
import { ChevronDown, Search, Bell, CheckCircle, Circle, HelpCircle } from 'lucide-react';

interface DashboardScreenProps {
  selectedGyms: string[]; // Now gym IDs
  activeGymId: string | null;
  onSwitchGym: (gymId: string) => void;
  getGymNameById: (id: string | null) => string; // Function to get gym name
}

const DashboardScreen: React.FC<DashboardScreenProps> = ({ selectedGyms, activeGymId, onSwitchGym, getGymNameById }) => {
  const [showGymSelector, setShowGymSelector] = useState(false);

  const handleGymSelect = (gymId: string) => {
    onSwitchGym(gymId);
    setShowGymSelector(false); // Close selector after choosing
  };

  const activeGymName = getGymNameById(activeGymId); // Use the passed function

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header Area */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
        <div className="flex justify-between items-center relative">
          {/* Gym Selector */}
          <button
            onClick={() => setShowGymSelector(!showGymSelector)}
            className="flex items-center text-brand-green hover:text-opacity-80"
            disabled={selectedGyms.length <= 1} // Disable if only one gym or none selected
          >
            <h1 className="text-xl font-bold mr-1 truncate max-w-[200px] sm:max-w-xs">{activeGymName}</h1>
            {selectedGyms.length > 1 && <ChevronDown size={20} className={`transition-transform ${showGymSelector ? 'rotate-180' : ''}`} />}
          </button>

          {/* Gym Selection Dropdown */}
          {showGymSelector && selectedGyms.length > 1 && (
            <div className="absolute top-full left-0 mt-2 w-60 bg-white rounded-md shadow-lg border z-20 max-h-60 overflow-y-auto">
              {selectedGyms.map(gymId => (
                <button
                  key={gymId}
                  onClick={() => handleGymSelect(gymId)}
                  className={`block w-full text-left px-4 py-2 text-sm truncate ${activeGymId === gymId ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-brand-gray hover:bg-gray-100'}`}
                >
                  {getGymNameById(gymId)} {/* Use function to get name */}
                </button>
              ))}
            </div>
          )}

          {/* Placeholder for Notifications or other icons */}
          <button className="text-brand-gray hover:text-brand-green">
            <Bell size={24} />
          </button>
        </div>
         {/* Search Bar - Placed below Gym Selector for focus */}
         <div className="relative mt-4">
            <input
              type="text"
              placeholder={`Search routes at ${activeGymName}...`}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue bg-gray-100"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
          </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-grow p-4 space-y-6 overflow-y-auto pb-20"> {/* Add padding-bottom for nav bar */}
        {/* Quick Stats Section */}
        <section className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold text-brand-gray mb-3">Quick Stats</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
            <div className="p-3 bg-accent-blue/10 rounded">
              <p className="text-2xl font-bold text-accent-blue">12</p> {/* Placeholder */}
              <p className="text-sm text-brand-gray">Sends This Month</p>
            </div>
            <div className="p-3 bg-accent-purple/10 rounded">
              <p className="text-2xl font-bold text-accent-purple">V7</p> {/* Placeholder */}
              <p className="text-sm text-brand-gray">Highest Grade</p>
            </div>
            <div className="p-3 bg-accent-yellow/10 rounded">
              <p className="text-2xl font-bold text-accent-yellow">5</p> {/* Placeholder */}
              <p className="text-sm text-brand-gray">Routes to Try</p>
            </div>
          </div>
        </section>

        {/* Recent Activity Feed Section */}
        <section>
          <h2 className="text-lg font-semibold text-brand-gray mb-3">Recent Activity</h2>
          <div className="space-y-3">
            {/* Placeholder Activity Items */}
            <div className="bg-white p-3 rounded-lg shadow flex items-center space-x-3">
              <img src="https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="User" className="w-10 h-10 rounded-full object-cover"/>
              <div>
                <p className="text-sm"><span className="font-medium">Alex Johnson</span> sent <span className="font-medium text-accent-red">Crimson Dyno (V5)</span>.</p>
                <p className="text-xs text-gray-500">2 hours ago</p>
              </div>
              <CheckCircle size={18} className="ml-auto text-green-500 flex-shrink-0" />
            </div>
            <div className="bg-white p-3 rounded-lg shadow flex items-center space-x-3">
               <div className="w-10 h-10 rounded-full bg-brand-green flex items-center justify-center text-white font-bold flex-shrink-0">
                 <span>+</span> {/* Icon for new route */}
               </div>
              <div>
                <p className="text-sm">New route added: <span className="font-medium text-accent-blue">Blue Traverse (V3)</span>.</p>
                <p className="text-xs text-gray-500">Yesterday</p>
              </div>
            </div>
             <div className="bg-white p-3 rounded-lg shadow flex items-center space-x-3">
              <img src="https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="User" className="w-10 h-10 rounded-full object-cover"/>
              <div>
                <p className="text-sm"><span className="font-medium">Maria Garcia</span> attempted <span className="font-medium text-accent-yellow">Sunshine Arete (V4)</span>.</p>
                <p className="text-xs text-gray-500">3 days ago</p>
              </div>
               <Circle size={18} className="ml-auto text-orange-400 flex-shrink-0" />
            </div>
             <div className="bg-white p-3 rounded-lg shadow flex items-center space-x-3">
              <img src="https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D" alt="User" className="w-10 h-10 rounded-full object-cover"/>
              <div>
                <p className="text-sm"><span className="font-medium">Sam Lee</span> added beta for <span className="font-medium text-accent-purple">Purple Pain (V6)</span>.</p>
                <p className="text-xs text-gray-500">4 days ago</p>
              </div>
               <HelpCircle size={18} className="ml-auto text-blue-500 flex-shrink-0" />
            </div>
            {/* Add more activity items */}
          </div>
        </section>
      </main>

      {/* Bottom Navigation is now rendered in App.tsx */}
    </div>
  );
};

export default DashboardScreen;
