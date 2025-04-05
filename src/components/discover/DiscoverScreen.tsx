import React, { useState, useEffect, useCallback, useRef } from 'react';
    import { Search, MapPin, TrendingUp, Users, Compass, Loader2, UserPlus, UserCheck, AlertTriangle } from 'lucide-react';
    import { supabase, followUser, unfollowUser, checkFollowing } from '../../supabaseClient'; // Import follow/unfollow
    import { UserMetadata, AppView, NavigationData, ActivityLogDetails } from '../../types'; // Import types
    import type { User } from '@supabase/supabase-js';

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

    // Helper to get avatar URL
    const getUserAvatarUrl = (profile: UserMetadata | null): string => {
        const defaultName = profile?.display_name || 'User';
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=random&color=fff`;
        return profile?.avatar_url || fallbackUrl;
    };

    interface DiscoverScreenProps {
      currentUser: User | null;
      onNavigate: (view: AppView, data?: NavigationData) => void;
    }

    const DiscoverScreen: React.FC<DiscoverScreenProps> = ({ currentUser, onNavigate }) => {
      const [gymSearchTerm, setGymSearchTerm] = useState('');
      const [climberSearchTerm, setClimberSearchTerm] = useState('');
      const [searchResults, setSearchResults] = useState<UserMetadata[]>([]);
      const [isLoadingSearch, setIsLoadingSearch] = useState(false);
      const [searchError, setSearchError] = useState<string | null>(null);
      const [followStatusMap, setFollowStatusMap] = useState<Map<string, boolean>>(new Map());
      const [isUpdatingFollowMap, setIsUpdatingFollowMap] = useState<Map<string, boolean>>(new Map());

      const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);

      // --- Fetch Follow Statuses for Search Results ---
      const fetchFollowStatuses = useCallback(async (userIds: string[]) => {
        if (!currentUser || userIds.length === 0) {
          setFollowStatusMap(new Map()); // Clear if no user or results
          return;
        }
        try {
          // Fetch all follow relationships where the current user is the follower
          // and the followed user is in the search results
          const { data, error } = await supabase
            .from('user_follows')
            .select('following_id')
            .eq('follower_id', currentUser.id)
            .in('following_id', userIds);

          if (error) {
            console.error("Error fetching follow statuses:", error);
            setFollowStatusMap(new Map()); // Clear on error
            return;
          }

          const newFollowStatusMap = new Map<string, boolean>();
          userIds.forEach(id => {
            // Check if the user ID exists in the fetched following_ids
            const isFollowing = data?.some(follow => follow.following_id === id) ?? false;
            newFollowStatusMap.set(id, isFollowing);
          });
          setFollowStatusMap(newFollowStatusMap);

        } catch (err) {
          console.error("Unexpected error fetching follow statuses:", err);
          setFollowStatusMap(new Map()); // Clear on unexpected error
        }
      }, [currentUser]);


      // --- Search Climbers ---
      const searchClimbers = useCallback(async (term: string) => {
        if (!term.trim() || !currentUser) {
          setSearchResults([]);
          setIsLoadingSearch(false);
          setSearchError(null);
          setFollowStatusMap(new Map()); // Clear follow statuses when search term is empty
          return;
        }
        setIsLoadingSearch(true);
        setSearchError(null);
        try {
          const { data, error } = await supabase
            .from('profiles')
            .select('*')
            .ilike('display_name', `%${term.trim()}%`) // Case-insensitive search
            .neq('user_id', currentUser.id) // Exclude current user
            .limit(10); // Limit results for performance

          if (error) {
            throw new Error(`Failed to search climbers: ${error.message}`);
          }

          setSearchResults(data || []);
          // Fetch follow statuses for the new results
          if (data && data.length > 0) {
            fetchFollowStatuses(data.map(profile => profile.user_id));
          } else {
            setFollowStatusMap(new Map()); // Clear if no results
          }

        } catch (err: any) {
          console.error("Error searching climbers:", err);
          setSearchError(err.message || "An unexpected error occurred.");
          setSearchResults([]);
          setFollowStatusMap(new Map()); // Clear on error
        } finally {
          setIsLoadingSearch(false);
        }
      }, [currentUser, fetchFollowStatuses]);

      // --- Debounced Search Effect ---
      useEffect(() => {
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }
        // Only start searching if term is not empty, otherwise clear results
        if (climberSearchTerm.trim()) {
          debounceTimeoutRef.current = setTimeout(() => {
            searchClimbers(climberSearchTerm);
          }, 300); // 300ms debounce
        } else {
          // Clear results immediately if search term is empty
          setSearchResults([]);
          setIsLoadingSearch(false);
          setSearchError(null);
          setFollowStatusMap(new Map());
        }

        return () => {
          if (debounceTimeoutRef.current) {
            clearTimeout(debounceTimeoutRef.current);
          }
        };
      }, [climberSearchTerm, searchClimbers]);


      // --- Handle Follow/Unfollow Toggle ---
      const handleFollowToggle = async (targetUserId: string, targetUserName: string) => {
        if (!currentUser || isUpdatingFollowMap.get(targetUserId)) return;

        setIsUpdatingFollowMap(prev => new Map(prev).set(targetUserId, true));
        const currentlyFollowing = followStatusMap.get(targetUserId) || false;

        try {
          if (currentlyFollowing) {
            await unfollowUser(currentUser.id, targetUserId);
            setFollowStatusMap(prev => new Map(prev).set(targetUserId, false));
          } else {
            await followUser(currentUser.id, targetUserId);
            setFollowStatusMap(prev => new Map(prev).set(targetUserId, true));

            // Log follow activity
            const activityDetails: ActivityLogDetails = {
                followed_user_id: targetUserId,
                followed_user_name: targetUserName,
            };
            const { error: logError } = await supabase.from('activity_log').insert({
                user_id: currentUser.id,
                // gym_id: null, // Or maybe the user's current gym? Decide later.
                activity_type: 'follow_user',
                details: activityDetails,
            });
            if (logError) console.error('Error logging follow activity:', logError);
          }
        } catch (error: any) {
          console.error("Error updating follow status:", error);
          // Re-fetch status on error to be safe
          const check = await checkFollowing(currentUser.id, targetUserId);
          setFollowStatusMap(prev => new Map(prev).set(targetUserId, check));
        } finally {
          setIsUpdatingFollowMap(prev => new Map(prev).set(targetUserId, false));
        }
      };


      // TODO: Implement actual search logic for gyms

      return (
        <div className="min-h-screen bg-gray-100 pb-16"> {/* Added padding-bottom */}
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
              {/* Placeholder for gym search results */}
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

            {/* Connect Section */}
            <section>
              <h2 className="text-lg font-semibold text-brand-gray mb-3 flex items-center gap-2">
                 <Users size={20} /> Connect with Climbers
              </h2>
              {/* Climber Search Input */}
              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search climbers by display name..."
                  value={climberSearchTerm}
                  onChange={(e) => setClimberSearchTerm(e.target.value)}
                  className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue bg-white"
                  disabled={!currentUser}
                />
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              </div>

              {/* Search Results Area */}
              <div className="bg-white p-4 rounded-lg shadow space-y-3 min-h-[100px]">
                {isLoadingSearch && (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="animate-spin text-accent-blue" size={24} />
                  </div>
                )}
                {searchError && (
                  <p className="text-center text-red-500 text-sm py-4 flex items-center justify-center gap-2">
                    <AlertTriangle size={18} /> {searchError}
                  </p>
                )}
                {!isLoadingSearch && !searchError && searchResults.length > 0 && (
                  searchResults.map(profile => {
                    const isFollowing = followStatusMap.get(profile.user_id) || false;
                    const isUpdating = isUpdatingFollowMap.get(profile.user_id) || false;
                    return (
                      <div key={profile.user_id} className="flex items-center justify-between gap-3 p-2 border-b last:border-b-0">
                        <button
                          onClick={() => onNavigate('profile', { profileUserId: profile.user_id })}
                          className="flex items-center gap-3 flex-grow hover:opacity-80"
                        >
                          <img src={getUserAvatarUrl(profile)} alt={profile.display_name} className="w-10 h-10 rounded-full object-cover bg-gray-300" />
                          <div>
                            <p className="font-medium text-brand-gray text-sm">{profile.display_name}</p>
                            {/* Optional: Add home gym info later */}
                            {/* <p className="text-xs text-gray-500">Gym Name</p> */}
                          </div>
                        </button>
                        <button
                          onClick={() => handleFollowToggle(profile.user_id, profile.display_name)}
                          disabled={isUpdating}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 flex items-center gap-1 disabled:opacity-60 ${
                            isFollowing
                              ? 'bg-gray-200 text-brand-gray hover:bg-gray-300'
                              : 'bg-accent-blue text-white hover:bg-opacity-90'
                          }`}
                        >
                          {isUpdating ? (
                            <Loader2 size={14} className="animate-spin" />
                          ) : isFollowing ? (
                            <><UserCheck size={14} /> Following</>
                          ) : (
                            <><UserPlus size={14} /> Follow</>
                          )}
                        </button>
                      </div>
                    );
                  })
                )}
                {!isLoadingSearch && !searchError && searchResults.length === 0 && climberSearchTerm.trim() && (
                  <p className="text-center text-gray-500 text-sm py-4">No climbers found matching "{climberSearchTerm}".</p>
                )}
                 {!isLoadingSearch && !searchError && searchResults.length === 0 && !climberSearchTerm.trim() && (
                  <p className="text-center text-gray-500 text-sm py-4">Search for climbers above.</p>
                )}
                 {!currentUser && (
                    <p className="text-center text-gray-500 text-sm py-4">Log in to connect with climbers.</p>
                 )}
              </div>
            </section>
          </main>
        </div>
      );
    };

    export default DiscoverScreen;
