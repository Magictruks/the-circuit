import React, { useState, useEffect } from 'react';
import { Settings, LogOut, BarChart3, ListChecks, Bookmark, MapPin, Edit3, Save, XCircle } from 'lucide-react';
import { RouteData, AppView } from '../../types'; // Assuming types are defined
import { supabase } from '../../supabaseClient'; // Import supabase
import type { User } from '@supabase/supabase-js'; // Import User type

// --- Placeholder Data --- (Keep some for structure, but user data will override)
const placeholderStats = {
  totalSends: 152,
  uniqueRoutes: 85,
  highestBoulder: 'V8',
  highestRope: '5.12c',
};
const placeholderLogbook: RouteData[] = [
  { id: 'r1', name: 'Crimson Dyno', grade: 'V5', gradeColor: 'accent-red', location: 'Overhang Cave', dateSet: '2024-03-10', status: 'sent', betaAvailable: true },
  { id: 'r4', name: 'Green Slab Master', grade: 'V2', gradeColor: 'brand-green', location: 'Slab Wall', dateSet: '2024-03-01', status: 'sent', betaAvailable: false },
];
const placeholderWishlist: RouteData[] = [
  { id: 'r5', name: 'Purple Pain', grade: 'V6', gradeColor: 'accent-purple', location: 'Overhang Cave', dateSet: '2024-02-28', status: 'unseen', betaAvailable: true },
];
const getGymNameById = (id: string): string => {
    const gyms: { [key: string]: string } = { gym1: 'Summit Climbing', gym2: 'Movement', gym3: 'Brooklyn Boulders', gym4: 'Sender One', gym5: 'The Cliffs', gym6: 'Planet Granite', gym7: 'Austin Bouldering Project', gym8: 'Vertical World' };
    return gyms[id] || 'Unknown Gym';
};
// --- End Placeholder Data ---

const getGradeColorClass = (colorName: string): string => {
  const colorMap: { [key: string]: string } = { 'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow', 'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray', 'brand-brown': 'bg-brand-brown' };
  return colorMap[colorName] || 'bg-gray-400';
};

interface ProfileScreenProps {
   currentUser: User | null; // Receive the authenticated user object
   onNavigate: (view: AppView, routeId?: string) => void;
   onLogout: () => Promise<void>;
}

type ProfileTab = 'logbook' | 'wishlist' | 'stats';

const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, onNavigate, onLogout }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('logbook');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false); // State for editing display name
  const [displayName, setDisplayName] = useState(''); // State to hold the display name being shown/edited
  const [editError, setEditError] = useState<string | null>(null); // State for edit errors
  const [isSaving, setIsSaving] = useState(false); // State for save loading indicator

  // Initialize display name from currentUser when component mounts or currentUser changes
  useEffect(() => {
    if (currentUser?.user_metadata?.display_name) {
      setDisplayName(currentUser.user_metadata.display_name);
    } else if (currentUser?.email) {
      // Fallback to email prefix if display name isn't set
      setDisplayName(currentUser.email.split('@')[0]);
    } else {
        setDisplayName('Climber'); // Default fallback
    }
  }, [currentUser]);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await onLogout();
  };

  const handleEditClick = () => {
    setEditError(null); // Clear previous errors
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    // Reset display name to the original value from currentUser
    if (currentUser?.user_metadata?.display_name) {
      setDisplayName(currentUser.user_metadata.display_name);
    } else if (currentUser?.email) {
       setDisplayName(currentUser.email.split('@')[0]);
    } else {
        setDisplayName('Climber');
    }
    setIsEditing(false);
    setEditError(null);
  };

  const handleSaveEdit = async () => {
    if (!displayName.trim()) {
      setEditError("Display name cannot be empty.");
      return;
    }
    if (displayName.trim() === currentUser?.user_metadata?.display_name) {
        setIsEditing(false); // No change, just exit edit mode
        return;
    }

    setIsSaving(true);
    setEditError(null);

    const { data, error } = await supabase.auth.updateUser({
      data: { display_name: displayName.trim() }
    });

    setIsSaving(false);

    if (error) {
      console.error("Error updating display name:", error);
      setEditError(`Failed to update name: ${error.message}`);
    } else if (data.user?.user_metadata?.display_name) {
      // Successfully updated, update local state and exit edit mode
      setDisplayName(data.user.user_metadata.display_name);
      setIsEditing(false);
      console.log("Display name updated successfully");
    } else {
        // Handle unexpected success state (should have user data)
        setEditError("An unexpected error occurred. Please try again.");
        // Optionally revert local state or try refetching user
    }
  };


  // --- Rendering Functions (Logbook, Wishlist, Stats) ---
  // These remain largely the same, using placeholder data for now
  const renderLogbookItem = (route: RouteData) => ( /* ... */ <div key={route.id} onClick={() => onNavigate('routeDetail', route.id)} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"> <div className={`w-8 h-8 ${getGradeColorClass(route.gradeColor)} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}> {route.grade} </div> <div className="flex-grow overflow-hidden"> <p className="font-medium text-brand-gray truncate">{route.name}</p> <p className="text-xs text-gray-500">{route.location} - {new Date(route.dateSet).toLocaleDateString()}</p> </div> {route.status === 'sent' && <ListChecks size={18} className="text-green-500 flex-shrink-0" />} {route.status === 'attempted' && <ListChecks size={18} className="text-orange-400 flex-shrink-0" />} </div> );
  const renderWishlistItem = (route: RouteData) => ( /* ... */ <div key={route.id} onClick={() => onNavigate('routeDetail', route.id)} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"> <div className={`w-8 h-8 ${getGradeColorClass(route.gradeColor)} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}> {route.grade} </div> <div className="flex-grow overflow-hidden"> <p className="font-medium text-brand-gray truncate">{route.name}</p> <p className="text-xs text-gray-500">{route.location}</p> </div> <Bookmark size={18} className="text-accent-yellow flex-shrink-0" /> </div> );
  const renderStats = () => ( /* ... */ <div className="p-4 space-y-3"> <div className="flex justify-between items-center p-3 bg-accent-blue/10 rounded-lg"> <span className="text-sm font-medium text-brand-gray">Total Sends</span> <span className="font-bold text-accent-blue">{placeholderStats.totalSends}</span> </div> <div className="flex justify-between items-center p-3 bg-accent-purple/10 rounded-lg"> <span className="text-sm font-medium text-brand-gray">Unique Routes Climbed</span> <span className="font-bold text-accent-purple">{placeholderStats.uniqueRoutes}</span> </div> <div className="flex justify-between items-center p-3 bg-accent-red/10 rounded-lg"> <span className="text-sm font-medium text-brand-gray">Highest Boulder Grade</span> <span className="font-bold text-accent-red">{placeholderStats.highestBoulder}</span> </div> </div> );
  // --- End Rendering Functions ---

  // Use actual user data if available, otherwise fallbacks
  const userAvatar = currentUser?.user_metadata?.avatar_url || 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D'; // Placeholder avatar if none
  // TODO: Fetch actual user home gyms if stored
  const userHomeGyms = currentUser?.user_metadata?.selected_gyms || ['gym1']; // Example fallback

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-green to-brand-gray p-4 pt-8 pb-16 text-white relative">
         <div className="flex items-center gap-4">
            <img
              src={userAvatar}
              alt={displayName}
              className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover bg-gray-300" // Added bg-gray-300 for loading state
            />
            <div className="flex-grow">
               {isEditing ? (
                 <div className="relative">
                   <input
                     type="text"
                     value={displayName}
                     onChange={(e) => setDisplayName(e.target.value)}
                     className="text-2xl font-bold bg-transparent border-b-2 border-white/50 focus:border-white outline-none text-white w-full pr-16" // Added padding-right
                     autoFocus
                     maxLength={50} // Example max length
                   />
                   {/* Save/Cancel Buttons */}
                   <div className="absolute top-0 right-0 flex gap-1">
                      <button onClick={handleSaveEdit} disabled={isSaving} className="text-green-300 hover:text-white disabled:opacity-50">
                         {isSaving ? <svg className="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> : <Save size={20} />}
                      </button>
                      <button onClick={handleCancelEdit} disabled={isSaving} className="text-red-300 hover:text-white disabled:opacity-50">
                         <XCircle size={20} />
                      </button>
                   </div>
                   {editError && <p className="text-red-300 text-xs mt-1">{editError}</p>}
                 </div>
               ) : (
                 <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold truncate">{displayName}</h1>
                    <button onClick={handleEditClick} className="text-white/70 hover:text-white">
                       <Edit3 size={18} />
                    </button>
                 </div>
               )}
               <div className="text-sm opacity-90 mt-1 flex items-center gap-1">
                  <MapPin size={14} />
                  {/* TODO: Replace with actual user data */}
                  {userHomeGyms.map(id => getGymNameById(id)).join(', ')}
               </div>
            </div>
         </div>
         {/* Settings Button (Top Right) */}
         <div className="absolute top-4 right-4 flex gap-2">
             {/* Removed Edit3 from here, moved next to name */}
             <button className="text-white/80 hover:text-white"><Settings size={20} /></button>
         </div>
      </header>

      {/* Main Content Area */}
      <main className="p-4 -mt-10 relative z-0">
        {/* Tab Navigation */}
        <div className="bg-white rounded-lg shadow mb-4 flex">
           <button onClick={() => setActiveTab('logbook')} className={`flex-1 py-3 text-center text-sm font-medium flex items-center justify-center gap-1 ${activeTab === 'logbook' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50 rounded-t-lg'}`}> <ListChecks size={16}/> Logbook </button>
           <button onClick={() => setActiveTab('wishlist')} className={`flex-1 py-3 text-center text-sm font-medium flex items-center justify-center gap-1 ${activeTab === 'wishlist' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50 rounded-t-lg'}`}> <Bookmark size={16}/> Wishlist </button>
           <button onClick={() => setActiveTab('stats')} className={`flex-1 py-3 text-center text-sm font-medium flex items-center justify-center gap-1 ${activeTab === 'stats' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50 rounded-t-lg'}`}> <BarChart3 size={16}/> Stats </button>
        </div>

        {/* Tab Content */}
        <div className="bg-white rounded-lg shadow min-h-[300px]">
          {activeTab === 'logbook' && ( <div> {placeholderLogbook.length > 0 ? placeholderLogbook.map(renderLogbookItem) : <p className="text-center text-gray-500 p-6">No climbs logged yet.</p>} </div> )}
          {activeTab === 'wishlist' && ( <div> {placeholderWishlist.length > 0 ? placeholderWishlist.map(renderWishlistItem) : <p className="text-center text-gray-500 p-6">Your wishlist is empty.</p>} </div> )}
          {activeTab === 'stats' && renderStats()}
        </div>

        {/* Logout Section */}
        <div className="mt-6 text-center">
           <button onClick={handleLogoutClick} disabled={isLoggingOut} className="text-sm text-brand-gray hover:text-accent-red flex items-center justify-center gap-1 mx-auto disabled:opacity-50 disabled:cursor-wait">
              {isLoggingOut ? ( <> <svg className="animate-spin -ml-1 mr-1 h-4 w-4 text-brand-gray" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"> <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle> <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path> </svg> Logging out... </> ) : ( <> <LogOut size={16} /> Logout </> )}
           </button>
        </div>
      </main>
    </div>
  );
};

export default ProfileScreen;
