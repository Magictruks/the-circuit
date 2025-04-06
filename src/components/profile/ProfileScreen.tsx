import React, { useState, useEffect, useCallback } from 'react';
    import { Settings, BarChart3, ListChecks, Bookmark, MapPin, Edit3, Save, XCircle, Loader2, CheckCircle, Circle, AlertTriangle, UserPlus, UserCheck, ArrowLeft } from 'lucide-react';
    import { RouteData, AppView, UserMetadata, LogbookEntry, FollowCounts, ActivityLogDetails, NavigationData } from '../../types';
    import { supabase, followUser, unfollowUser, checkFollowing, getFollowCounts } from '../../supabaseClient';
    import type { User } from '@supabase/supabase-js';

    // Helper functions (keep as is)
    const getGradeColorClass = (colorName: string | undefined): string => {
      if (!colorName) return 'bg-gray-400';
      const colorMap: { [key: string]: string } = { 'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow', 'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray', 'brand-brown': 'bg-brand-brown' };
      return colorMap[colorName] || colorMap[colorName.replace('_', '-')] || 'bg-gray-400';
    };

    const getVGradeValue = (grade: string): number => {
        if (grade && grade.toUpperCase().startsWith('V')) {
            const numPart = grade.substring(1);
            const rangeParts = numPart.split('-');
            const numericValue = parseInt(rangeParts[rangeParts.length - 1], 10);
            return isNaN(numericValue) ? -1 : numericValue;
        }
        return -1;
    };

    interface ProfileScreenProps {
       currentUser: User | null;
       viewingProfileId: string | null;
       onNavigate: (view: AppView, data?: NavigationData) => void;
       getGymNameById: (id: string | null) => string;
       // Add previousAppView if needed for back navigation logic within ProfileScreen itself
       // previousAppView?: AppView;
    }

    type ProfileTab = 'logbook' | 'wishlist' | 'stats';

    interface UserStats {
        totalSends: number;
        uniqueRoutes: number;
        highestGrade: string | null;
    }

    const ProfileScreen: React.FC<ProfileScreenProps> = ({ currentUser, viewingProfileId, onNavigate, getGymNameById /*, previousAppView */ }) => {
      const [profileData, setProfileData] = useState<UserMetadata | null>(null);
      const [isLoadingProfile, setIsLoadingProfile] = useState(true); // Still track loading for header
      const [profileError, setProfileError] = useState<string | null>(null);

      const [activeTab, setActiveTab] = useState<ProfileTab>('logbook');
      const [isEditing, setIsEditing] = useState(false);
      const [editDisplayName, setEditDisplayName] = useState('');
      const [editError, setEditError] = useState<string | null>(null);
      const [isSaving, setIsSaving] = useState(false);

      // State for Logbook
      const [logbookEntries, setLogbookEntries] = useState<LogbookEntry[]>([]);
      const [isLoadingLogbook, setIsLoadingLogbook] = useState(true); // Start as true
      const [logbookError, setLogbookError] = useState<string | null>(null);

      // State for Wishlist
      const [wishlistItems, setWishlistItems] = useState<RouteData[]>([]);
      const [isLoadingWishlist, setIsLoadingWishlist] = useState(true); // Start as true
      const [wishlistError, setWishlistError] = useState<string | null>(null);

      // State for Stats
      const [userStats, setUserStats] = useState<UserStats | null>(null);
      const [isLoadingStats, setIsLoadingStats] = useState(true); // Start as true
      const [statsError, setStatsError] = useState<string | null>(null);

      // State for Following
      const [isFollowing, setIsFollowing] = useState(false);
      const [isLoadingFollowStatus, setIsLoadingFollowStatus] = useState(true); // Start as true
      const [isUpdatingFollow, setIsUpdatingFollow] = useState(false);
      const [followCounts, setFollowCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
      const [isLoadingFollowCounts, setIsLoadingFollowCounts] = useState(true); // Start as true

      // Determine the actual user ID to fetch data for
      const profileUserId = viewingProfileId || currentUser?.id;
      const isOwnProfile = !viewingProfileId || viewingProfileId === currentUser?.id;

      // --- Fetch Profile Data ---
      const fetchProfileData = useCallback(async () => {
        if (!profileUserId) {
          setProfileData(null); setIsLoadingProfile(false); setProfileError("No user ID provided.");
          return;
        }
        setIsLoadingProfile(true); setProfileError(null);
        try {
          const { data, error } = await supabase.from('profiles').select('*').eq('user_id', profileUserId).single();
          if (error) {
            console.error("Error fetching profile data:", error);
            setProfileError(error.code === 'PGRST116' ? "Profile not found." : "Failed to load profile.");
            setProfileData(null);
          } else {
            setProfileData(data);
            setEditDisplayName(data?.display_name || ''); // Initialize edit name here
          }
        } catch (err: any) {
          console.error("Unexpected error fetching profile:", err);
          setProfileError(err.message || "An unexpected error occurred.");
          setProfileData(null);
        } finally {
          setIsLoadingProfile(false);
        }
      }, [profileUserId]);

      // --- Fetch Follow Status ---
      const fetchFollowStatus = useCallback(async () => {
        if (isOwnProfile || !currentUser || !profileUserId) { setIsFollowing(false); setIsLoadingFollowStatus(false); return; }
        setIsLoadingFollowStatus(true);
        try {
          const followingStatus = await checkFollowing(currentUser.id, profileUserId);
          setIsFollowing(followingStatus);
        } catch (error) {
          console.error("Error checking follow status:", error);
        } finally {
          setIsLoadingFollowStatus(false);
        }
      }, [currentUser, profileUserId, isOwnProfile]);

      // --- Fetch Follow Counts ---
      const fetchFollowCounts = useCallback(async () => {
        if (!profileUserId) { setFollowCounts({ followers: 0, following: 0 }); setIsLoadingFollowCounts(false); return; }
        setIsLoadingFollowCounts(true);
        try {
          const counts = await getFollowCounts(profileUserId);
          setFollowCounts({ followers: counts.followers, following: counts.following });
        } catch (error) {
          console.error("Error fetching follow counts:", error);
        } finally {
          setIsLoadingFollowCounts(false);
        }
      }, [profileUserId]);

      // --- Fetch Logbook Data ---
      const fetchLogbook = useCallback(async () => {
        if (!profileUserId) { setLogbookEntries([]); setIsLoadingLogbook(false); setLogbookError(null); return; }
        setIsLoadingLogbook(true); setLogbookError(null);
        try {
          const { data, error } = await supabase
            .from('user_route_progress')
            .select(`
              attempts, sent_at, rating, notes, wishlist, updated_at,
              route:routes!inner(
                id, gym_id, name, grade, grade_color, date_set, location_id,
                location_name:locations ( name )
              )
            `)
            .eq('user_id', profileUserId)
            .or('sent_at.not.is.null,attempts.gt.0')
            .order('updated_at', { ascending: false });

          if (error) {
            console.error("Error fetching logbook:", error);
            setLogbookError("Failed to load climb log.");
            setLogbookEntries([]);
          } else if (data) {
            const mappedEntries = data.map(item => {
              const routeData = item.route as any;
              const locationInfo = routeData?.location_name as any;
              return {
                ...(routeData as RouteData),
                location_name: locationInfo?.name || null,
                user_progress_attempts: item.attempts,
                user_progress_sent_at: item.sent_at,
                user_progress_rating: item.rating,
                user_progress_notes: item.notes,
                user_progress_wishlist: item.wishlist,
                user_progress_updated_at: item.updated_at,
              };
            });
            setLogbookEntries(mappedEntries as LogbookEntry[]);
          } else {
            setLogbookEntries([]);
          }
        } catch (err: any) {
          console.error("Unexpected error fetching logbook:", err);
          setLogbookError(err.message || "An unexpected error occurred.");
          setLogbookEntries([]);
        } finally {
          setIsLoadingLogbook(false);
        }
      }, [profileUserId]);

      // --- Fetch Wishlist Data ---
      const fetchWishlist = useCallback(async () => {
        if (!profileUserId) { setWishlistItems([]); setIsLoadingWishlist(false); setWishlistError(null); return; }
        setIsLoadingWishlist(true); setWishlistError(null);
        try {
          const { data, error } = await supabase
            .from('user_route_progress')
            .select(`
              route:routes!inner(
                id, gym_id, name, grade, grade_color, date_set, location_id,
                location_name:locations ( name )
              )
            `)
            .eq('user_id', profileUserId)
            .eq('wishlist', true)
            .order('created_at', { referencedTable: 'routes', ascending: false });

          if (error) {
            console.error("Error fetching wishlist:", error);
            setWishlistError("Failed to load wishlist.");
            setWishlistItems([]);
          } else if (data) {
            const mappedItems = data.map(item => {
               const routeData = item.route as any;
               const locationInfo = routeData?.location_name as any;
               return {
                 ...(routeData as RouteData),
                 location_name: locationInfo?.name || null,
               };
            });
            setWishlistItems(mappedItems as RouteData[]);
          } else {
            setWishlistItems([]);
          }
        } catch (err: any) {
          console.error("Unexpected error fetching wishlist:", err);
          setWishlistError(err.message || "An unexpected error occurred.");
          setWishlistItems([]);
        } finally {
          setIsLoadingWishlist(false);
        }
      }, [profileUserId]);

      // --- Fetch Stats Data ---
      const fetchStats = useCallback(async () => {
          if (!profileUserId) { setUserStats(null); setIsLoadingStats(false); setStatsError(null); return; }
          setIsLoadingStats(true); setStatsError(null);
          try {
              const { data, error } = await supabase
                  .from('user_route_progress')
                  .select(` route_id, route:routes ( grade ) `)
                  .eq('user_id', profileUserId)
                  .not('sent_at', 'is', null);

              if (error) {
                  console.error("Error fetching stats data:", error);
                  throw new Error("Failed to load data for stats calculation.");
              }

              if (data) {
                  const totalSends = data.length;
                  const uniqueRoutes = new Set(data.map(item => item.route_id)).size;
                  let highestGrade: string | null = null;
                  let maxGradeValue = -1;
                  data.forEach(item => {
                      const grade = (item.route as any)?.grade;
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
                  setUserStats({ totalSends: 0, uniqueRoutes: 0, highestGrade: null });
              }

          } catch (err: any) {
              console.error("Unexpected error fetching stats:", err);
              setStatsError(err.message || "An unexpected error occurred while calculating stats.");
              setUserStats(null);
          } finally {
              setIsLoadingStats(false);
          }
      }, [profileUserId]);

      // Fetch all data when profileUserId changes
      useEffect(() => {
        // Reset loading states when ID changes
        setIsLoadingProfile(true);
        setIsLoadingLogbook(true);
        setIsLoadingWishlist(true);
        setIsLoadingStats(true);
        setIsLoadingFollowStatus(true);
        setIsLoadingFollowCounts(true);
        setProfileError(null);
        setLogbookError(null);
        setWishlistError(null);
        setStatsError(null);

        // Fetch data
        fetchProfileData();
        fetchFollowStatus();
        fetchFollowCounts();
        fetchLogbook();
        fetchWishlist();
        fetchStats();
      }, [profileUserId, fetchProfileData, fetchFollowStatus, fetchFollowCounts, fetchLogbook, fetchWishlist, fetchStats]);

      // --- Handlers ---
      const handleEditClick = () => { setEditError(null); setEditDisplayName(profileData?.display_name || ''); setIsEditing(true); };
      const handleCancelEdit = () => { setIsEditing(false); setEditError(null); };
      const handleSaveEdit = async () => {
        if (!currentUser || !isOwnProfile) return;
        const trimmedName = editDisplayName.trim();
        if (!trimmedName) { setEditError("Display name cannot be empty."); return; }
        if (trimmedName === profileData?.display_name) { setIsEditing(false); return; }
        setIsSaving(true); setEditError(null);

        try {
            const { error: profileUpdateError } = await supabase.from('profiles').update({ display_name: trimmedName }).eq('user_id', currentUser.id);
            if (profileUpdateError) throw profileUpdateError;
            const { error: authUpdateError } = await supabase.auth.updateUser({ data: { display_name: trimmedName } });
            if (authUpdateError) { console.error("Auth metadata update failed after profile update:", authUpdateError); throw new Error(`Auth update failed: ${authUpdateError.message}. Profile might be updated.`); }
            console.log("Profile and auth metadata updated successfully.");
            // Update local state immediately for responsiveness
            setProfileData(prev => prev ? { ...prev, display_name: trimmedName } : null);
            setIsEditing(false);
        } catch (error: any) {
            console.error("Error saving display name:", error);
            setEditError(`Failed to update name: ${error.message}`);
            // Optionally refetch profile data on error to revert
            // await fetchProfileData();
        } finally {
            setIsSaving(false);
        }
      };

      // --- Follow/Unfollow Handler ---
      const handleFollowToggle = async () => {
        if (!currentUser || !profileUserId || isOwnProfile || isUpdatingFollow) return;
        setIsUpdatingFollow(true);
        try {
          if (isFollowing) {
            await unfollowUser(currentUser.id, profileUserId);
            setIsFollowing(false);
            setFollowCounts(prev => ({ ...prev, followers: Math.max(0, prev.followers - 1) }));
          } else {
            await followUser(currentUser.id, profileUserId);
            setIsFollowing(true);
            setFollowCounts(prev => ({ ...prev, followers: prev.followers + 1 }));
            const activityDetails: ActivityLogDetails = {
                followed_user_id: profileUserId,
                followed_user_name: profileData?.display_name || 'User',
            };
            const { error: logError } = await supabase.from('activity_log').insert({
                user_id: currentUser.id,
                gym_id: profileData?.current_gym_id,
                activity_type: 'follow_user',
                details: activityDetails,
            });
            if (logError) console.error('Error logging follow activity:', logError);
          }
        } catch (error: any) {
          console.error("Error updating follow status:", error);
          await fetchFollowStatus();
          await fetchFollowCounts();
        } finally {
          setIsUpdatingFollow(false);
        }
      };

      // --- Rendering Functions ---
      const renderLogbookItem = (entry: LogbookEntry) => {
        const displayLocation = entry.location_name || 'Unknown Location';
        return (
          <div key={entry.id} onClick={() => onNavigate('routeDetail', { routeId: entry.id })} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer">
            <div className={`w-8 h-8 ${getGradeColorClass(entry.grade_color)} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}> {entry.grade} </div>
            <div className="flex-grow overflow-hidden">
              <p className="font-medium text-brand-gray truncate">{entry.name}</p>
              <p className="text-xs text-gray-500"> {displayLocation} - Logged: {new Date(entry.user_progress_updated_at).toLocaleDateString()} </p>
            </div>
            {entry.user_progress_sent_at ? ( <CheckCircle size={18} className="text-green-500 flex-shrink-0" title={`Sent (${entry.user_progress_attempts} attempts)`} /> ) : entry.user_progress_attempts > 0 ? ( <Circle size={18} className="text-orange-400 flex-shrink-0" title={`Attempted (${entry.user_progress_attempts} attempts)`} /> ) : null}
          </div>
        );
      };

      const renderWishlistItem = (route: RouteData) => {
         const displayLocation = route.location_name || 'Unknown Location';
         return (
            <div key={route.id} onClick={() => onNavigate('routeDetail', { routeId: route.id })} className="flex items-center gap-3 p-3 border-b last:border-b-0 hover:bg-gray-50 cursor-pointer">
               <div className={`w-8 h-8 ${getGradeColorClass(route.grade_color)} rounded-full flex items-center justify-center text-white font-bold text-xs flex-shrink-0`}> {route.grade} </div>
               <div className="flex-grow overflow-hidden">
                  <p className="font-medium text-brand-gray truncate">{route.name}</p>
                  <p className="text-xs text-gray-500">{displayLocation}</p>
               </div>
               <Bookmark size={18} className="text-accent-yellow flex-shrink-0" />
            </div>
         );
      };

      const renderStats = () => {
          if (isLoadingStats) { return <div className="flex justify-center items-center p-6"> <Loader2 className="animate-spin text-accent-blue mr-2" size={24} /> Loading stats... </div>; }
          if (statsError) { return <div className="p-6 text-center text-red-500"> <AlertTriangle size={20} className="inline mr-1 mb-0.5"/> {statsError} </div>; }
          if (!userStats) { return <p className="text-center text-gray-500 p-6">No stats available yet.</p>; }
          return (
              <div className="p-4 space-y-3">
                  <div className="flex justify-between items-center p-3 bg-accent-blue/10 rounded-lg"> <span className="text-sm font-medium text-brand-gray">Total Sends</span> <span className="font-bold text-accent-blue">{userStats.totalSends}</span> </div>
                  <div className="flex justify-between items-center p-3 bg-accent-purple/10 rounded-lg"> <span className="text-sm font-medium text-brand-gray">Unique Routes Climbed</span> <span className="font-bold text-accent-purple">{userStats.uniqueRoutes}</span> </div>
                  <div className="flex justify-between items-center p-3 bg-accent-red/10 rounded-lg"> <span className="text-sm font-medium text-brand-gray">Highest Grade Sent</span> <span className="font-bold text-accent-red">{userStats.highestGrade || 'N/A'}</span> </div>
              </div>
          );
      };
      // --- End Rendering Functions ---

      // --- Loading / Error States for Profile ---
      // REMOVED the top-level loading check that caused the black screen
      // if (isLoadingProfile) { return <div className="min-h-screen flex items-center justify-center"><Loader2 className="animate-spin text-accent-blue" size={32} /></div>; }

      // Handle profile-specific errors after the main layout renders
      if (profileError) {
        return (
          <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4 text-center">
            <AlertTriangle size={48} className="text-red-500 mb-4" />
            <h2 className="text-xl font-semibold text-brand-gray mb-2">Error Loading Profile</h2>
            <p className="text-red-600 mb-6">{profileError}</p>
            {/* Provide a way back if possible */}
            {/* <button onClick={() => onNavigate(previousAppView || 'dashboard')} className="mt-4 text-sm text-accent-blue underline">Go Back</button> */}
          </div>
        );
      }
      // --- End Loading / Error States ---

      // Use placeholder data while loading profile details for the header
      const currentDisplayName = isLoadingProfile ? 'Loading...' : (profileData?.display_name || 'Climber');
      const userAvatar = isLoadingProfile ? '' : (profileData?.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(currentDisplayName)}&background=random&color=fff`);
      const userHomeGymIds = isLoadingProfile ? [] : (profileData?.selected_gym_ids || []);

      return (
        <div className="min-h-screen bg-gray-100 pb-16">
          {/* Header */}
          <header className="bg-gradient-to-r from-brand-green to-brand-gray p-4 pt-8 pb-20 text-white relative">
             {/* Back Button for non-own profiles */}
             {!isOwnProfile && (
                <button onClick={() => onNavigate('discover')} /* Simplified back for now */ className="absolute top-4 left-4 text-white/80 hover:text-white z-10">
                   <ArrowLeft size={24} />
                </button>
             )}
             {/* Settings Button for own profile */}
             {isOwnProfile && (
                <div className="absolute top-4 right-4 flex gap-2 z-10">
                   <button onClick={() => onNavigate('settings')} className="text-white/80 hover:text-white"> <Settings size={20} /> </button>
                </div>
             )}

             <div className="flex items-center gap-4 relative z-0">
                {/* Avatar: Show placeholder or actual image */}
                {isLoadingProfile ? (
                  <div className="w-20 h-20 rounded-full border-4 border-white shadow-lg bg-gray-300 animate-pulse"></div>
                ) : (
                  <img src={userAvatar} alt={currentDisplayName} className="w-20 h-20 rounded-full border-4 border-white shadow-lg object-cover bg-gray-300" />
                )}
                <div className="flex-grow min-w-0">
                   {/* Display Name: Show loading or actual name/edit input */}
                   {isLoadingProfile ? (
                     <div className="h-8 bg-white/30 rounded w-3/4 animate-pulse mb-1"></div>
                   ) : isEditing && isOwnProfile ? (
                     <div className="relative">
                       <input type="text" value={editDisplayName} onChange={(e) => setEditDisplayName(e.target.value)} className="text-2xl font-bold bg-transparent border-b-2 border-white/50 focus:border-white outline-none text-white w-full pr-16" autoFocus maxLength={50} disabled={isSaving} />
                       <div className="absolute top-0 right-0 flex gap-1 items-center h-full">
                          <button onClick={handleSaveEdit} disabled={isSaving} className="text-green-300 hover:text-white disabled:opacity-50 p-1"> {isSaving ? <Loader2 size={20} className="animate-spin"/> : <Save size={20} />} </button>
                          <button onClick={handleCancelEdit} disabled={isSaving} className="text-red-300 hover:text-white disabled:opacity-50 p-1"> <XCircle size={20} /> </button>
                       </div>
                       {editError && <p className="text-red-300 text-xs mt-1 absolute -bottom-5">{editError}</p>}
                     </div>
                   ) : (
                     <div className="flex items-center gap-2">
                        <h1 className="text-2xl font-bold truncate">{currentDisplayName}</h1>
                        {isOwnProfile && <button onClick={handleEditClick} className="text-white/70 hover:text-white flex-shrink-0"> <Edit3 size={18} /> </button>}
                     </div>
                   )}
                   {/* Gym Info: Show loading or actual gyms */}
                   {isLoadingProfile ? (
                     <div className="h-4 bg-white/30 rounded w-1/2 animate-pulse mt-1"></div>
                   ) : (
                     <div className="text-sm opacity-90 mt-1 flex items-start gap-1">
                       <MapPin size={14} className="mt-0.5 flex-shrink-0"/>
                       <span className="truncate"> {userHomeGymIds.length > 0 ? userHomeGymIds.map(id => getGymNameById(id)).join(', ') : 'No gyms selected'} </span>
                     </div>
                   )}
                   {/* Follow Counts: Show loading or actual counts */}
                   <div className="text-sm opacity-90 mt-2 flex items-center gap-4">
                      {isLoadingFollowCounts ? <Loader2 size={14} className="animate-spin"/> : (
                         <>
                            <span><strong className="font-bold">{followCounts.followers}</strong> Followers</span>
                            <span><strong className="font-bold">{followCounts.following}</strong> Following</span>
                         </>
                      )}
                   </div>
                </div>
             </div>
             {/* Follow/Unfollow Button */}
             {!isOwnProfile && currentUser && (
                <div className="absolute bottom-4 right-4 z-10">
                   <button
                      onClick={handleFollowToggle}
                      disabled={isLoadingFollowStatus || isUpdatingFollow || isLoadingProfile} // Disable while profile loads too
                      className={`px-4 py-1.5 rounded-full text-sm font-semibold transition-colors duration-200 flex items-center gap-1.5 disabled:opacity-60 ${
                         isFollowing
                            ? 'bg-white text-brand-green hover:bg-gray-200'
                            : 'bg-accent-blue text-white hover:bg-opacity-90'
                      }`}
                   >
                      {isLoadingFollowStatus || isUpdatingFollow ? (
                         <Loader2 size={16} className="animate-spin" />
                      ) : isFollowing ? (
                         <><UserCheck size={16} /> Following</>
                      ) : (
                         <><UserPlus size={16} /> Follow</>
                      )}
                   </button>
                </div>
             )}
          </header>

          {/* Main Content Area */}
          <main className="p-4 -mt-12 relative z-0">
            {/* Tab Navigation */}
            <div className="bg-white rounded-lg shadow mb-4 flex">
               <button onClick={() => setActiveTab('logbook')} className={`flex-1 py-3 text-center text-sm font-medium flex items-center justify-center gap-1 ${activeTab === 'logbook' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50 rounded-t-lg'}`}> <ListChecks size={16}/> Logbook </button>
               {isOwnProfile && <button onClick={() => setActiveTab('wishlist')} className={`flex-1 py-3 text-center text-sm font-medium flex items-center justify-center gap-1 ${activeTab === 'wishlist' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50 rounded-t-lg'}`}> <Bookmark size={16}/> Wishlist </button>}
               <button onClick={() => setActiveTab('stats')} className={`flex-1 py-3 text-center text-sm font-medium flex items-center justify-center gap-1 ${activeTab === 'stats' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50 rounded-t-lg'}`}> <BarChart3 size={16}/> Stats </button>
            </div>

            {/* Tab Content */}
            <div className="bg-white rounded-lg shadow min-h-[200px]">
              {/* Logbook Tab */}
              {activeTab === 'logbook' && (
                <div>
                  {isLoadingLogbook ? (
                    <div className="flex justify-center items-center p-6"> <Loader2 className="animate-spin text-accent-blue mr-2" size={24} /> Loading logbook... </div>
                  ) : logbookError ? (
                    <p className="text-center text-red-500 p-6">{logbookError}</p>
                  ) : logbookEntries.length > 0 ? (
                    logbookEntries.map(renderLogbookItem)
                  ) : (
                    <p className="text-center text-gray-500 p-6">No climbs logged yet.</p>
                  )}
                </div>
              )}
              {/* Wishlist Tab */}
              {activeTab === 'wishlist' && isOwnProfile && (
                <div>
                  {isLoadingWishlist ? (
                    <div className="flex justify-center items-center p-6"> <Loader2 className="animate-spin text-accent-blue mr-2" size={24} /> Loading wishlist... </div>
                  ) : wishlistError ? (
                    <p className="text-center text-red-500 p-6">{wishlistError}</p>
                  ) : wishlistItems.length > 0 ? (
                    wishlistItems.map(renderWishlistItem)
                  ) : (
                    <p className="text-center text-gray-500 p-6">Your wishlist is empty.</p>
                  )}
                </div>
              )}
              {/* Stats Tab */}
              {activeTab === 'stats' && renderStats()}
            </div>
          </main>
        </div>
      );
    };

    export default ProfileScreen;
