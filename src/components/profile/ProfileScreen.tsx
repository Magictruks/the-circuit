import React, { useState, useEffect } from 'react';
import { Settings, LogOut, BarChart3, ListChecks, Bookmark, MapPin, Edit3, Save, XCircle, Loader2 } from 'lucide-react'; // Added Loader2
import { RouteData, AppView, UserMetadata } from '../../types'; // Import UserMetadata
import { supabase } from '../../supabaseClient';
import type { User } from '@supabase/supabase-js';

// --- Placeholder Data --- (Keep some for structure, but user data will override)
const placeholderStats = { totalSends: 152, uniqueRoutes: 85, highestBoulder: 'V8', highestRope: '5.12c' };
const placeholderLogbook: RouteData[] = [ { id: 'r1', name: 'Crimson Dyno', grade: 'V5', gradeColor: 'accent-red', location: 'Overhang Cave', dateSet: '2024-03-10', status: 'sent', betaAvailable: true }, { id: 'r4', name: 'Green Slab Master', grade: 'V2', gradeColor: 'brand-green', location: 'Slab Wall', dateSet: '2024-03-01', status: 'sent', betaAvailable: false }, ];
const placeholderWishlist: RouteData[] = [ { id: 'r5', name: 'Purple Pain', grade: 'V6', gradeColor: 'accent-purple', location: 'Overhang Cave', dateSet: '2024-02-28', status: 'unseen', betaAvailable: true }, ];
// --- End Placeholder Data ---

const getGradeColorClass = (colorName: string): string => {
  const colorMap: { [key: string]: string } = { 'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow', 'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray', 'brand-brown': 'bg-brand-brown' };
  return colorMap[colorName] || 'bg-gray-400';
};

interface ProfileScreenProps {
   currentUser: User | null;
   userMetadata: UserMetadata | null; // Receive user metadata
   onNavigate: (view: AppView, routeId?: string) => void;
   onLogout: () => Promise<void>;
   getGymNameById: (id: string | null) => string; // Function to get gym name
}

type ProfileTab = 'logbook' | 'wishlist' | 'stats';

const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, userMetadata, onNavigate, onLogout, getGymNameById }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('logbook');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState(''); // Separate state for editing input
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Initialize display name state based on userMetadata or currentUser
  const currentDisplayName = userMetadata?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'Climber';

  useEffect(() => {
    // Set the editing state only when edit mode starts
    if (isEditing) {
      setEditDisplayName(currentDisplayName);
    }
  }, [isEditing, currentDisplayName]);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await onLogout();
    // No need to setIsLoggingOut(false) as the component will unmount/re-render
  };

  const handleEditClick = () => {
    setEditError(null);
    setEditDisplayName(currentDisplayName); // Initialize edit field with current name
    setIsEditing(true);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditError(null);
    // No need to reset editDisplayName here, it will be reset on next edit click
  };

  const handleSaveEdit = async () => {
    const trimmedName = editDisplayName.trim();
    if (!trimmedName) {
      setEditError("Display name cannot be empty.");
      return;
    }
    // Check if the name actually changed
    if (trimmedName === currentDisplayName) {
        setIsEditing(false); // No change, just exit edit mode
        return;
    }

    setIsSaving(true);
    setEditError(null);

    // Update both auth metadata and user_metadata table for consistency
    // 1. Update auth.users metadata (triggers the sync trigger)
    const { data: authUpdateData, error: authUpdateError } = await supabase.auth.updateUser({
      data: { display_name: trimmedName }
    });

    if (authUpdateError) {
        console.error("Error updating auth user metadata:", authUpdateError);
        setEditError(`Failed to update name: ${authUpdateError.message}`);
        setIsSaving(false);
        return; // Stop if auth update fails
    }

    // 2. Optionally, directly update user_metadata table if trigger might be slow or for immediate UI feedback
    // Note: The trigger should handle this, but direct update can be faster for UI. Choose one approach.
    // If relying solely on the trigger, you might need to refetch userMetadata after a short delay.
    // For this example, we'll assume the trigger works and auth update is sufficient.

    console.log("Auth metadata updated, trigger should sync user_metadata.");
    // Update successful (assuming trigger works)
    setIsEditing(false);
    setIsSaving(false);
    // Note: The ProfileScreen might receive updated userMetadata prop from App.tsx
    // which will cause a re-render with the new name.
  };


  // --- Rendering Functions (Logbook, Wishlist, Stats) ---
  const renderLogbookItem = (route: RouteData) => ( <div key={route.id} onClick={() => onNavigate('routeDetail', route.id)} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"> <div className={`w-8 h-8 ${getGradeColorClass(route.gradeColor)} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}> {route.grade} </div> <div className="flex-grow overflow-hidden"> <p className="font-medium text-brand-gray truncate">{route.name}</p> <p className="text-xs text-gray-500">{route.location} - {new Date(route.dateSet).toLocaleDateString()}</p> </div> {route.status === 'sent' && <ListChecks size={18} className="text-green-500 flex-shrink-0" />} {route.status === 'attempted' && <ListChecks size={18} className="text-orange-400 flex-shrink-0" />} </div> );
  const renderWishlistItem = (route: RouteData) => ( <div key={route.id} onClick={() => onNavigate('routeDetail', route.id)} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"> <div className={`w-8 h-8 ${getGradeColorClass(route.gradeColor)} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}> {route.grade} </div> <div className="flex-grow overflow-hidden"> <p className="font-medium text-brand-gray truncate">{route.name}</p> <p className="text-xs text-gray-500">{route.location}</p> </div> <Bookmark size={18} className="text-accent-yellow flex-shrink-0" /> </div> );
  const renderStats = () => ( <div className="p-4 space-y-3"> <div className="flex justify-between items-center p-3 bg-accent-blue/10 rounded-lg"> <span className="text-sm font-medium text-brand-gray">Total Sends</span> <span className="font-bold text-accent-blue">{placeholderStats.totalSends}</span> </div> <div className="flex justify-between items-center p-3 bg-accent-purple/10 rounded-lg"> <span className="text-sm font-medium text-brand-gray">Unique Routes Climbed</span> <span className="font-bold text-accent-purple">{placeholderStats.uniqueRoutes}</span> </div> <div className="flex justify-between items-center p-3 bg-accent-red/10 rounded-lg"> <span className="text-sm font-medium text-brand-gray">Highest Boulder Grade</span> <span className="font-bold text-accent-red">{placeholderStats.highestBoulder}</span> </div> </div> );
  // --- End Rendering Functions ---

  const userAvatar = currentUser?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDisplayName)}&background=random&color=fff`; // Use UI Avatars fallback
  const userHomeGymIds = userMetadata?.selected_gym_ids || [];

  return (
    <div className="min-h-screen bg-gray-100 pb-16"> {/* Added padding-bottom */}
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-green to-brand-gray p-4 pt-8 pb-16 text-white relative">
         <div className="flex items-center gap-4">
            <img
              src={userAvatar}
              alt={currentDisplayName}
              className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover bg-gray-300"
            />
            <div className="flex-grow min-w-0"> {/* Added min-w-0 for flex truncation */}
               {isEditing ? (
                 <div className="relative">
                   <input
                     type="text"
                     value={editDisplayName}
                     onChange={(e) => setEditDisplayName(e.target.value)}
                     className="text-2xl font-bold bg-transparent border-b-2 border-white/50 focus:border-white outline-none text-white w-full pr-16"
                     autoFocus
                     maxLength={50}
                     disabled={isSaving}
                   />
                   {/* Save/Cancel Buttons */}
                   <div className="absolute top-0 right-0 flex gap-1 items-center h-full">
                      <button onClick={handleSaveEdit} disabled={isSaving} className="text-green-300 hover:text-white disabled:opacity-50 p-1">
                         {isSaving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20} />}
                      </button>
                      <button onClick={handleCancelEdit} disabled={isSaving} className="text-red-300 hover:text-white disabled:opacity-50 p-1">
                         <XCircle size={20} />
                      </button>
                   </div>
                   {editError && <p className="text-red-300 text-xs mt-1 absolute -bottom-5">{editError}</p>}
                 </div>
               ) : (
                 <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold truncate">{currentDisplayName}</h1>
                    <button onClick={handleEditClick} className="text-white/70 hover:text-white flex-shrink-0">
                       <Edit3 size={18} />
                    </button>
                 </div>
               )}
               <div className="text-sm opacity-90 mt-1 flex items-start gap-1"> {/* Changed to items-start */}
                  <MapPin size={14} className="mt-0.5 flex-shrink-0"/>
                  {/* Use getGymNameById, handle multiple gyms */}
                  <span className="truncate">
                    {userHomeGymIds.length > 0
                        ? userHomeGymIds.map(id => getGymNameById(id)).join(', ')
                        : 'No gyms selected'}
                  </span>
               </div>
            </div>
         </div>
         {/* Settings Button (Top Right) */}
         <div className="absolute top-4 right-4 flex gap-2">
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
        <div className="bg-white rounded-lg shadow min-h-[200px]"> {/* Reduced min-height */}
          {activeTab === 'logbook' && ( <div> {placeholderLogbook.length > 0 ? placeholderLogbook.map(renderLogbookItem) : <p className="text-center text-gray-500 p-6">No climbs logged yet.</p>} </div> )}
          {activeTab === 'wishlist' && ( <div> {placeholderWishlist.length > 0 ? placeholderWishlist.map(renderWishlistItem) : <p className="text-center text-gray-500 p-6">Your wishlist is empty.</p>} </div> )}
          {activeTab === 'stats' && renderStats()}
        </div>

        {/* Logout Section */}
        <div className="mt-6 text-center">
           <button onClick={handleLogoutClick} disabled={isLoggingOut} className="text-sm text-brand-gray hover:text-accent-red flex items-center justify-center gap-1 mx-auto disabled:opacity-50 disabled:cursor-wait">
              {isLoggingOut ? ( <> <Loader2 size={16} className="animate-spin mr-1"/> Logging out... </> ) : ( <> <LogOut size={16} /> Logout </> )}
           </button>
        </div>
      </main>
    </div>
  );
};

export default ProfileScreen;
