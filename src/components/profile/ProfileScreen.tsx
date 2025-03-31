import React, { useState } from 'react';
import { Settings, LogOut, UserCircle, BarChart3, ListChecks, Bookmark, MapPin, Edit3 } from 'lucide-react';
import { RouteData, AppView } from '../../types'; // Assuming types are defined

// --- Placeholder Data ---
const placeholderUser = {
  username: 'ClimberPro',
  homeGymIds: ['gym1', 'gym7'], // IDs referencing gyms
  avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D', // Example avatar
};

const placeholderStats = {
  totalSends: 152,
  uniqueRoutes: 85,
  highestBoulder: 'V8',
  highestRope: '5.12c', // Add if supporting rope climbing
};

// Use existing placeholderRoutes for logbook/wishlist examples
const placeholderLogbook: RouteData[] = [
  { id: 'r1', name: 'Crimson Dyno', grade: 'V5', gradeColor: 'accent-red', location: 'Overhang Cave', dateSet: '2024-03-10', status: 'sent', betaAvailable: true },
  { id: 'r4', name: 'Green Slab Master', grade: 'V2', gradeColor: 'brand-green', location: 'Slab Wall', dateSet: '2024-03-01', status: 'sent', betaAvailable: false },
  { id: 'r2', name: 'Blue Traverse', grade: 'V3', gradeColor: 'accent-blue', location: 'Slab Wall', dateSet: '2024-03-08', status: 'attempted', betaAvailable: false },
];

const placeholderWishlist: RouteData[] = [
  { id: 'r5', name: 'Purple Pain', grade: 'V6', gradeColor: 'accent-purple', location: 'Overhang Cave', dateSet: '2024-02-28', status: 'unseen', betaAvailable: true },
  { id: 'r3', name: 'Sunshine Arete', grade: 'V4', gradeColor: 'accent-yellow', location: 'Main Boulder', dateSet: '2024-03-05', status: 'unseen', betaAvailable: true },
];

// Placeholder function to get gym name from ID
const getGymNameById = (id: string): string => {
    const gyms: { [key: string]: string } = { gym1: 'Summit Climbing', gym2: 'Movement', gym3: 'Brooklyn Boulders', gym4: 'Sender One', gym5: 'The Cliffs', gym6: 'Planet Granite', gym7: 'Austin Bouldering Project', gym8: 'Vertical World' };
    return gyms[id] || 'Unknown Gym';
};
// --- End Placeholder Data ---

// Helper to get Tailwind color class
const getGradeColorClass = (colorName: string): string => {
  const colorMap: { [key: string]: string } = { 'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow', 'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray', 'brand-brown': 'bg-brand-brown' };
  return colorMap[colorName] || 'bg-gray-400';
};


interface ProfileScreenProps {
  // Add props if needed, e.g., onNavigate to route detail
   onNavigate: (view: AppView, routeId?: string) => void;
}

type ProfileTab = 'logbook' | 'wishlist' | 'stats';

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onNavigate }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('logbook');

  const renderLogbookItem = (route: RouteData) => (
    <div
      key={route.id}
      onClick={() => onNavigate('routeDetail', route.id)} // Navigate on click
      className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
    >
      <div className={`w-8 h-8 ${getGradeColorClass(route.gradeColor)} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
        {route.grade}
      </div>
      <div className="flex-grow overflow-hidden">
        <p className="font-medium text-brand-gray truncate">{route.name}</p>
        <p className="text-xs text-gray-500">{route.location} - {new Date(route.dateSet).toLocaleDateString()}</p>
      </div>
      {/* Add status icon if needed */}
      {route.status === 'sent' && <ListChecks size={18} className="text-green-500 flex-shrink-0" />}
      {route.status === 'attempted' && <ListChecks size={18} className="text-orange-400 flex-shrink-0" />}
    </div>
  );

  const renderWishlistItem = (route: RouteData) => (
     <div
       key={route.id}
       onClick={() => onNavigate('routeDetail', route.id)} // Navigate on click
       className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"
     >
       <div className={`w-8 h-8 ${getGradeColorClass(route.gradeColor)} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}>
         {route.grade}
       </div>
       <div className="flex-grow overflow-hidden">
         <p className="font-medium text-brand-gray truncate">{route.name}</p>
         <p className="text-xs text-gray-500">{route.location}</p>
       </div>
       <Bookmark size={18} className="text-accent-yellow flex-shrink-0" />
     </div>
   );

  const renderStats = () => (
     <div className="p-4 space-y-3">
        <div className="flex justify-between items-center p-3 bg-accent-blue/10 rounded-lg">
           <span className="text-sm font-medium text-brand-gray">Total Sends</span>
           <span className="font-bold text-accent-blue">{placeholderStats.totalSends}</span>
        </div>
         <div className="flex justify-between items-center p-3 bg-accent-purple/10 rounded-lg">
           <span className="text-sm font-medium text-brand-gray">Unique Routes Climbed</span>
           <span className="font-bold text-accent-purple">{placeholderStats.uniqueRoutes}</span>
        </div>
         <div className="flex justify-between items-center p-3 bg-accent-red/10 rounded-lg">
           <span className="text-sm font-medium text-brand-gray">Highest Boulder Grade</span>
           <span className="font-bold text-accent-red">{placeholderStats.highestBoulder}</span>
        </div>
         {/* Add Highest Rope Grade if applicable */}
         {/* <div className="flex justify-between items-center p-3 bg-accent-yellow/10 rounded-lg">
           <span className="text-sm font-medium text-brand-gray">Highest Rope Grade</span>
           <span className="font-bold text-accent-yellow">{placeholderStats.highestRope}</span>
        </div> */}
        {/* Add more stats as needed */}
     </div>
  );


  return (
    // Ensure the outer div takes at least the screen height
    <div className="min-h-screen bg-gray-100">
      {/* Header: Added relative positioning */}
      <header className="bg-gradient-to-r from-brand-green to-brand-gray p-4 pt-8 pb-16 text-white relative">
         <div className="flex items-center gap-4">
            <img
              src={placeholderUser.avatarUrl}
              alt={placeholderUser.username}
              className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover"
            />
            <div>
               <h1 className="text-2xl font-bold">{placeholderUser.username}</h1>
               <div className="text-sm opacity-90 mt-1 flex items-center gap-1">
                  <MapPin size={14} />
                  {placeholderUser.homeGymIds.map(id => getGymNameById(id)).join(', ')}
               </div>
            </div>
         </div>
         {/* Edit/Settings Buttons */}
         <div className="absolute top-4 right-4 flex gap-2">
             <button className="text-white/80 hover:text-white"><Edit3 size={20} /></button>
             <button className="text-white/80 hover:text-white"><Settings size={20} /></button>
         </div>
      </header>

      {/* Main Content Area: -mt-10 pulls this section up over the header's bottom padding */}
      <main className="p-4 -mt-10 relative z-0"> {/* Ensure main is rendered after header, z-index might not be needed but added for clarity */}
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-4 flex">
           <button
              onClick={() => setActiveTab('logbook')}
              className={`flex-1 py-3 text-center text-sm font-medium flex items-center justify-center gap-1 ${activeTab === 'logbook' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50 rounded-t-lg'}`}
           >
              <ListChecks size={16}/> Logbook
           </button>
           <button
              onClick={() => setActiveTab('wishlist')}
              className={`flex-1 py-3 text-center text-sm font-medium flex items-center justify-center gap-1 ${activeTab === 'wishlist' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50 rounded-t-lg'}`}
           >
              <Bookmark size={16}/> Wishlist
           </button>
           <button
              onClick={() => setActiveTab('stats')}
              className={`flex-1 py-3 text-center text-sm font-medium flex items-center justify-center gap-1 ${activeTab === 'stats' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50 rounded-t-lg'}`}
           >
              <BarChart3 size={16}/> Stats
           </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow min-h-[300px]">
          {activeTab === 'logbook' && (
             <div>
                {/* TODO: Add search/filter for logbook */}
                {placeholderLogbook.length > 0 ? (
                   placeholderLogbook.map(renderLogbookItem)
                ) : (
                   <p className="text-center text-gray-500 p-6">No climbs logged yet.</p>
                )}
             </div>
          )}
          {activeTab === 'wishlist' && (
             <div>
                {placeholderWishlist.length > 0 ? (
                   placeholderWishlist.map(renderWishlistItem)
                ) : (
                   <p className="text-center text-gray-500 p-6">Your wishlist is empty.</p>
                )}
             </div>
          )}
           {activeTab === 'stats' && renderStats()}
        </div>

        {/* Settings/Logout Section (Simplified) */}
        <div className="mt-6 text-center">
           <button className="text-sm text-brand-gray hover:text-accent-red flex items-center justify-center gap-1 mx-auto">
              <LogOut size={16} /> Logout
           </button>
           {/* TODO: Link to a dedicated settings screen */}
        </div>
      </main>
    </div>
  );
};

export default ProfileScreen;
