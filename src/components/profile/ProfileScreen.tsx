import React, { useState, useEffect, useCallback } from 'react';
import { Settings, LogOut, BarChart3, ListChecks, Bookmark, MapPin, Edit3, Save, XCircle, Loader2, CheckCircle, Circle, AlertTriangle } from 'lucide-react'; // Added AlertTriangle
import { RouteData, AppView, UserMetadata, LogbookEntry } from '../../types';
import { supabase } from '../../supabaseClient';
import type { User } from '@supabase/supabase-js';

// --- Placeholder Data --- (Removed placeholder stats)
// --- End Placeholder Data ---

const getGradeColorClass = (colorName: string | undefined): string => {
  if (!colorName) return 'bg-gray-400';
  const colorMap: { [key: string]: string } = { 'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow', 'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray', 'brand-brown': 'bg-brand-brown' };
  return colorMap[colorName] || colorMap[colorName.replace('_', '-')] || 'bg-gray-400';
};

// Helper function to sort V-grades (simplistic)
// Handles "V" prefix and sorts numerically. Returns a high value for non-V grades.
const getVGradeValue = (grade: string): number => {
    if (grade && grade.toUpperCase().startsWith('V')) {
        const numPart = grade.substring(1);
        // Handle potential ranges like V3-V5, take the higher number
        const rangeParts = numPart.split('-');
        const numericValue = parseInt(rangeParts[rangeParts.length - 1], 10);
        return isNaN(numericValue) ? -1 : numericValue; // Return -1 if parsing fails
    }
    return -1; // Treat non-V grades or invalid formats as lowest
};


interface ProfileScreenProps {
   currentUser: User | null;
   userMetadata: UserMetadata | null;
   onNavigate: (view: AppView, routeId?: string) => void;
   onLogout: () => Promise<void>;
   getGymNameById: (id: string | null) => string;
}

type ProfileTab = 'logbook' | 'wishlist' | 'stats';

// Define state structure for stats
interface UserStats {
    totalSends: number;
    uniqueRoutes: number;
    highestGrade: string | null;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, userMetadata, onNavigate, onLogout, getGymNameById }) => {
  const [activeTab, setActiveTab] = useState<ProfileTab>('logbook');
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editError, setEditError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // State for Logbook
  const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>([]);
  const [isLoadingLogbook, setIsLoadingLogbook] = useState(false);
  const [logbookError, setLogbookError] = useState<string | null>(null);

  // State for Wishlist
  const [wishlistItems, setWishlistItems] = useState<RouteData[]>([]);
  const [isLoadingWishlist, setIsLoadingWishlist] = useState(false);
  const [wishlistError, setWishlistError] = useState<string | null>(null);

  // State for Stats
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [isLoadingStats, setIsLoadingStats] = useState(false);
  const [statsError, setStatsError] = useState<string | null>(null);


  const currentDisplayName = userMetadata?.display_name || currentUser?.user_metadata?.display_name || currentUser?.email?.split('@')[0] || 'Climber';

  useEffect(() => { if (isEditing) { setEditDisplayName(currentDisplayName); } }, [isEditing, currentDisplayName]);

  // --- Fetch Logbook Data ---
  const fetchLogbook = useCallback(async () => {
    if (!currentUser) { setLogbookEntries([]); setIsLoadingLogbook(false); setLogbookError(null); return; }
    setIsLoadingLogbook(true); setLogbookError(null);
    try {
      const { data, error } = await supabase.from('user_route_progress').select(` attempts, sent_at, rating, notes, wishlist, updated_at, route:routes!inner( id, gym_id, name, grade, grade_color, location, date_set ) `).eq('user_id', currentUser.id).or('sent_at.not.is.null,attempts.gt.0')
				//.eq('wishlist', false)
				.order('updated_at', { ascending: false });
      if (error) { console.error("Error fetching logbook:", error); setLogbookError("Failed to load your climb log."); setLogbookEntries([]); }
      else if (data) { const mappedEntries = data.map(item => ({ ...(item.route as RouteData), user_progress_attempts: item.attempts, user_progress_sent_at: item.sent_at, user_progress_rating: item.rating, user_progress_notes: item.notes, user_progress_wishlist: item.wishlist, user_progress_updated_at: item.updated_at, })); setLogbookEntries(mappedEntries as LogbookEntry[]); }
      else { setLogbookEntries([]); }
    } catch (err: any) { console.error("Unexpected error fetching logbook:", err); setLogbookError(err.message || "An unexpected error occurred."); setLogbookEntries([]); }
    finally { setIsLoadingLogbook(false); }
  }, [currentUser]);

  // --- Fetch Wishlist Data ---
  const fetchWishlist = useCallback(async () => {
    if (!currentUser) { setWishlistItems([]); setIsLoadingWishlist(false); setWishlistError(null); return; }
    setIsLoadingWishlist(true); setWishlistError(null);
    try {
      const { data, error } = await supabase.from('user_route_progress').select(` route:routes!inner( id, gym_id, name, grade, grade_color, location, date_set ) `).eq('user_id', currentUser.id).eq('wishlist', true).order('created_at', { referencedTable: 'routes', ascending: false });
      if (error) { console.error("Error fetching wishlist:", error); setWishlistError("Failed to load your wishlist."); setWishlistItems([]); }
      else if (data) { const mappedItems = data.map(item => item.route as RouteData); setWishlistItems(mappedItems); }
      else { setWishlistItems([]); }
    } catch (err: any) { console.error("Unexpected error fetching wishlist:", err); setWishlistError(err.message || "An unexpected error occurred."); setWishlistItems([]); }
    finally { setIsLoadingWishlist(false); }
  }, [currentUser]);

  // --- Fetch Stats Data ---
  const fetchStats = useCallback(async () => {
      if (!currentUser) { setUserStats(null); setIsLoadingStats(false); setStatsError(null); return; }
      setIsLoadingStats(true); setStatsError(null);
      try {
          // Fetch all progress entries where sent_at is not null, joining with routes for grade
          const { data, error } = await supabase
              .from('user_route_progress')
              .select(` route_id, route:routes ( grade ) `) // Select route_id and grade via join
              .eq('user_id', currentUser.id)
              .not('sent_at', 'is', null); // Only include sends

          if (error) {
              console.error("Error fetching stats data:", error);
              throw new Error("Failed to load data for stats calculation.");
          }

          if (data) {
              const totalSends = data.length;
              const uniqueRoutes = new Set(data.map(item => item.route_id)).size;

              // Find highest grade (simplistic V-grade sort)
              let highestGrade: string | null = null;
              let maxGradeValue = -1;

              data.forEach(item => {
                  const grade = (item.route as any)?.grade; // Access grade from joined route
                  if (grade) {
                      const gradeValue = getVGradeValue(grade);
                      if (gradeValue > maxGradeValue) {
                          maxGradeValue = gradeValue;
                          highestGrade = grade;
                      }
                  }
              });

              setUserStats({ totalSends, uniqueRoutes, highestGrade });
          } else {
              setUserStats({ totalSends: 0, uniqueRoutes: 0, highestGrade: null }); // No sends found
          }

      } catch (err: any) {
          console.error("Unexpected error fetching stats:", err);
          setStatsError(err.message || "An unexpected error occurred while calculating stats.");
          setUserStats(null);
      } finally {
          setIsLoadingStats(false);
      }
  }, [currentUser]);


  // Fetch all data on mount/user change
  useEffect(() => {
    fetchLogbook();
    fetchWishlist();
    fetchStats(); // Fetch stats as well
  }, [fetchLogbook, fetchWishlist, fetchStats]); // Add fetchStats dependency

  // --- Handlers ---
  const handleLogoutClick = async () => { setIsLoggingOut(true); await onLogout(); };
  const handleEditClick = () => { setEditError(null); setEditDisplayName(currentDisplayName); setIsEditing(true); };
  const handleCancelEdit = () => { setIsEditing(false); setEditError(null); };
  const handleSaveEdit = async () => {
    const trimmedName = editDisplayName.trim();
    if (!trimmedName) { setEditError("Display name cannot be empty."); return; }
    if (trimmedName === currentDisplayName) { setIsEditing(false); return; }
    setIsSaving(true); setEditError(null);
    const { error: authUpdateError } = await supabase.auth.updateUser({ data: { display_name: trimmedName } });
    if (authUpdateError) { console.error("Error updating auth user metadata:", authUpdateError); setEditError(`Failed to update name: ${authUpdateError.message}`); setIsSaving(false); return; }
    console.log("Auth metadata updated, trigger should sync user_metadata.");
    setIsEditing(false); setIsSaving(false);
    // Consider refetching userMetadata or relying on App.tsx update
  };

  // --- Rendering Functions ---
  const renderLogbookItem = (entry: LogbookEntry) => ( <div key={entry.id} onClick={() => onNavigate('routeDetail', entry.id)} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"> <div className={`w-8 h-8 ${getGradeColorClass(entry.grade_color)} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}> {entry.grade} </div> <div className="flex-grow overflow-hidden"> <p className="font-medium text-brand-gray truncate">{entry.name}</p> <p className="text-xs text-gray-500">{entry.location} - Logged: {new Date(entry.user_progress_updated_at).toLocaleDateString()}</p> </div> {entry.user_progress_sent_at ? ( <CheckCircle size={18} className="text-green-500 flex-shrink-0" title={`Sent (${entry.user_progress_attempts} attempts)`} /> ) : entry.user_progress_attempts > 0 ? ( <Circle size={18} className="text-orange-400 flex-shrink-0" title={`Attempted (${entry.user_progress_attempts} attempts)`} /> ) : null} </div> );
  const renderWishlistItem = (route: RouteData) => ( <div key={route.id} onClick={() => onNavigate('routeDetail', route.id)} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer"> <div className={`w-8 h-8 ${getGradeColorClass(route.grade_color)} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}> {route.grade} </div> <div className="flex-grow overflow-hidden"> <p className="font-medium text-brand-gray truncate">{route.name}</p> <p className="text-xs text-gray-500">{route.location}</p> </div> <Bookmark size={18} className="text-accent-yellow flex-shrink-0" /> </div> );

  // Updated renderStats function
  const renderStats = () => {
      if (isLoadingStats) {
          return <div className="flex justify-center items-center p-6"> <Loader2 className="animate-spin text-accent-blue mr-2" size={24} /> Loading stats... </div>;
      }
      if (statsError) {
          return <div className="p-6 text-center text-red-500"> <AlertTriangle size={20} className="inline mr-1 mb-0.5"/> {statsError} </div>;
      }
      if (!userStats) {
          return <p className="text-center text-gray-500 p-6">No stats available yet. Go log some climbs!</p>;
      }

      return (
          <div className="p-4 space-y-3">
              <div className="flex justify-between items-center p-3 bg-accent-blue/10 rounded-lg">
                  <span className="text-sm font-medium text-brand-gray">Total Sends</span>
                  <span className="font-bold text-accent-blue">{userStats.totalSends}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-accent-purple/10 rounded-lg">
                  <span className="text-sm font-medium text-brand-gray">Unique Routes Climbed</span>
                  <span className="font-bold text-accent-purple">{userStats.uniqueRoutes}</span>
              </div>
              <div className="flex justify-between items-center p-3 bg-accent-red/10 rounded-lg">
                  <span className="text-sm font-medium text-brand-gray">Highest Grade Sent</span>
                  <span className="font-bold text-accent-red">{userStats.highestGrade || 'N/A'}</span>
              </div>
              {/* Add more stats here if needed */}
          </div>
      );
  };
  // --- End Rendering Functions ---

  const userAvatar = userMetadata?.avatar_url || currentUser?.user_metadata?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDisplayName)}&background=random&color=fff`;
  const userHomeGymIds = userMetadata?.selected_gym_ids || [];

  return (
    <div className="min-h-screen bg-gray-100 pb-16">
      {/* Header */}
      <header className="bg-gradient-to-r from-brand-green to-brand-gray p-4 pt-8 pb-16 text-white relative">
         <div className="flex items-center gap-4">
            <img src={userAvatar} alt={currentDisplayName} className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover bg-gray-300" />
            <div className="flex-grow min-w-0">
               {isEditing ? (
                 <div className="relative">
                   <input type="text" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} className="text-2xl font-bold bg-transparent border-b-2 border-white/50 focus:border-white outline-none text-white w-full pr-16" autoFocus maxLength={50} disabled={isSaving} />
                   <div className="absolute top-0 right-0 flex gap-1 items-center h-full">
                      <button onClick={handleSaveEdit} disabled={isSaving} className="text-green-300 hover:text-white disabled:opacity-50 p-1"> {isSaving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20} />} </button>
                      <button onClick={handleCancelEdit} disabled={isSaving} className="text-red-300 hover:text-white disabled:opacity-50 p-1"> <XCircle size={20} /> </button>
                   </div>
                   {editError && <p className="text-red-300 text-xs mt-1 absolute -bottom-5">{editError}</p>}
                 </div>
               ) : (
                 <div className="flex items-center gap-2"> <h1 className="text-2xl font-bold truncate">{currentDisplayName}</h1> <button onClick={handleEditClick} className="text-white/70 hover:text-white flex-shrink-0"> <Edit3 size={18} /> </button> </div>
               )}
               <div className="text-sm opacity-90 mt-1 flex items-start gap-1"> <MapPin size={14} className="mt-0.5 flex-shrink-0"/> <span className="truncate"> {userHomeGymIds.length > 0 ? userHomeGymIds.map(id => getGymNameById(id)).join(', ') : 'No gyms selected'} </span> </div>
            </div>
         </div>
         <div className="absolute top-4 right-4 flex gap-2"> <button className="text-white/80 hover:text-white"><Settings size={20} /></button> </div>
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
        <div className="bg-white rounded-lg shadow min-h-[200px]">
          {activeTab === 'logbook' && ( <div> {isLoadingLogbook ? ( <div className="flex justify-center items-center p-6"> <Loader2 className="animate-spin text-accent-blue mr-2" size={24} /> Loading logbook... </div> ) : logbookError ? ( <p className="text-center text-red-500 p-6">{logbookError}</p> ) : logbookEntries.length > 0 ? ( logbookEntries.map(renderLogbookItem) ) : ( <p className="text-center text-gray-500 p-6">No climbs logged yet.</p> )} </div> )}
          {activeTab === 'wishlist' && ( <div> {isLoadingWishlist ? ( <div className="flex justify-center items-center p-6"> <Loader2 className="animate-spin text-accent-blue mr-2" size={24} /> Loading wishlist... </div> ) : wishlistError ? ( <p className="text-center text-red-500 p-6">{wishlistError}</p> ) : wishlistItems.length > 0 ? ( wishlistItems.map(renderWishlistItem) ) : ( <p className="text-center text-gray-500 p-6">Your wishlist is empty.</p> )} </div> )}
          {/* Use the updated renderStats function */}
          {activeTab === 'stats' && renderStats()}
        </div>

        {/* Logout Section */}
        <div className="mt-6 text-center">
           <button onClick={handleLogoutClick} disabled={isLoggingOut} className="text-sm text-brand-gray hover:text-accent-red flex items-center justify-center gap-1 mx-auto disabled:opacity-50 disabled:cursor-wait"> {isLoggingOut ? ( <> <Loader2 size={16} className="animate-spin mr-1"/> Logging out... </> ) : ( <> <LogOut size={16} /> Logout </> )} </button>
        </div>
      </main>
    </div>
  );
};

export default ProfileScreen;
