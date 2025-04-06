import React, { useState, useEffect, useCallback } from 'react';
    import { X, Loader2, UserPlus, UserCheck, AlertTriangle } from 'lucide-react';
    import { supabase, followUser, unfollowUser, checkFollowing } from '../../supabaseClient';
    import { UserMetadata, AppView, NavigationData } from '../../types';
    import type { User } from '@supabase/supabase-js';

    // Helper to get avatar URL (consider moving to utils)
    const getUserAvatarUrl = (profile: Partial<UserMetadata> | null): string => {
        const defaultName = profile?.display_name || 'User';
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=random&color=fff`;
        return profile?.avatar_url || fallbackUrl;
    };

    interface FollowListDialogProps {
        userId: string; // The user whose list we are viewing
        dialogType: 'followers' | 'following';
        currentUser: User | null; // The logged-in user
        onClose: () => void;
        onNavigate: (view: AppView, data?: NavigationData) => void;
    }

    const PAGE_SIZE = 15; // Number of users per page

    const FollowListDialog: React.FC<FollowListDialogProps> = ({ userId, dialogType, currentUser, onClose, onNavigate }) => {
        const [users, setUsers] = useState<UserMetadata[]>([]);
        const [isLoading, setIsLoading] = useState(true);
        const [loadingMore, setLoadingMore] = useState(false);
        const [error, setError] = useState<string | null>(null);
        const [currentPage, setCurrentPage] = useState(0);
        const [hasMore, setHasMore] = useState(true);

        // State for follow status of the listed users relative to the *current logged-in user*
        const [followStatusMap, setFollowStatusMap] = useState<Map<string, boolean>>(new Map());
        const [isUpdatingFollowMap, setIsUpdatingFollowMap] = useState<Map<string, boolean>>(new Map());

        // --- Fetch Users (Followers or Following) ---
        const fetchUsers = useCallback(async (page = 0, loadMore = false) => {
            if (loadMore) { setLoadingMore(true); }
            else { setIsLoading(true); setUsers([]); setCurrentPage(0); setHasMore(true); }
            setError(null);

            const from = page * PAGE_SIZE;
            const to = from + PAGE_SIZE - 1;

            try {
                let query;
                if (dialogType === 'followers') {
                    // Fetch users who are following the target userId
                    query = supabase
                        .from('user_follows')
                        .select('follower:profiles!follower_id(*)') // Select profile of the follower
                        .eq('following_id', userId);
                } else { // dialogType === 'following'
                    // Fetch users whom the target userId is following
                    query = supabase
                        .from('user_follows')
                        .select('following:profiles!following_id(*)') // Select profile of the user being followed
                        .eq('follower_id', userId);
                }

                const { data, error: fetchError } = await query
                    .order('created_at', { ascending: false })
                    .range(from, to);

                if (fetchError) {
                    throw new Error(`Failed to load ${dialogType}: ${fetchError.message}`);
                }

                if (data) {
                    // Extract the profile data correctly based on the dialog type
                    const profiles = data.map(item => dialogType === 'followers' ? item.follower : item.following).filter(Boolean) as UserMetadata[];

                    setUsers(prevUsers => loadMore ? [...prevUsers, ...profiles] : profiles);
                    setCurrentPage(page);
                    setHasMore(profiles.length === PAGE_SIZE);

                    // Fetch follow statuses for the newly loaded users relative to the current user
                    if (currentUser && profiles.length > 0) {
                        fetchFollowStatuses(profiles.map(p => p.user_id));
                    }
                } else {
                    if (!loadMore) setUsers([]);
                    setHasMore(false);
                }
            } catch (err: any) {
                console.error(`Error fetching ${dialogType}:`, err);
                setError(err.message || "An unexpected error occurred.");
                if (!loadMore) setUsers([]);
                setHasMore(false);
            } finally {
                setIsLoading(false);
                setLoadingMore(false);
            }
        }, [userId, dialogType, currentUser]); // Add currentUser dependency

        // --- Fetch Follow Statuses for listed users ---
        const fetchFollowStatuses = useCallback(async (userIds: string[]) => {
            if (!currentUser || userIds.length === 0) return;
            try {
                const { data, error } = await supabase
                    .from('user_follows')
                    .select('following_id')
                    .eq('follower_id', currentUser.id)
                    .in('following_id', userIds);

                if (error) { console.error("Error fetching follow statuses for list:", error); return; }

                const newFollowStatusMap = new Map<string, boolean>();
                userIds.forEach(id => {
                    const isFollowing = data?.some(follow => follow.following_id === id) ?? false;
                    newFollowStatusMap.set(id, isFollowing);
                });

                // Merge with existing map to update statuses correctly
                setFollowStatusMap(prevMap => {
                    const mergedMap = new Map(prevMap);
                    newFollowStatusMap.forEach((status, id) => mergedMap.set(id, status));
                    return mergedMap;
                });
            } catch (err) {
                console.error("Unexpected error fetching follow statuses for list:", err);
            }
        }, [currentUser]);

        // Initial fetch
        useEffect(() => {
            fetchUsers(0);
        }, [fetchUsers]);

        // --- Handle Follow/Unfollow Toggle ---
        const handleFollowToggle = async (targetUserId: string, targetUserName: string) => {
            if (!currentUser || currentUser.id === targetUserId || isUpdatingFollowMap.get(targetUserId)) return;

            setIsUpdatingFollowMap(prev => new Map(prev).set(targetUserId, true));
            const currentlyFollowing = followStatusMap.get(targetUserId) || false;

            try {
                if (currentlyFollowing) {
                    await unfollowUser(currentUser.id, targetUserId);
                    setFollowStatusMap(prev => new Map(prev).set(targetUserId, false));
                } else {
                    await followUser(currentUser.id, targetUserId);
                    setFollowStatusMap(prev => new Map(prev).set(targetUserId, true));
                    // Optionally log activity (consider if needed here)
                }
            } catch (error: any) {
                console.error("Error updating follow status from dialog:", error);
                // Refetch status on error
                const check = await checkFollowing(currentUser.id, targetUserId);
                setFollowStatusMap(prev => new Map(prev).set(targetUserId, check));
            } finally {
                setIsUpdatingFollowMap(prev => new Map(prev).set(targetUserId, false));
            }
        };

        // --- Handle Load More ---
        const handleLoadMore = () => {
            if (!loadingMore && hasMore) {
                fetchUsers(currentPage + 1, true);
            }
        };

        // --- Handle Navigate to Profile ---
        const handleUserClick = (profileUserId: string) => {
            onClose(); // Close the dialog first
            onNavigate(profileUserId === currentUser?.id ? 'profile' : 'publicProfile', { profileUserId });
        };

        const title = dialogType === 'followers' ? 'Followers' : 'Following';

        return (
            <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
                <div className="bg-white rounded-lg shadow-xl w-full max-w-md max-h-[80vh] flex flex-col">
                    {/* Header */}
                    <div className="flex justify-between items-center p-4 border-b">
                        <h2 className="text-lg font-semibold text-brand-gray">{title}</h2>
                        <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                            <X size={24} />
                        </button>
                    </div>

                    {/* User List */}
                    <div className="flex-grow overflow-y-auto p-4">
                        {isLoading && users.length === 0 ? (
                            <div className="flex justify-center items-center py-6">
                                <Loader2 className="animate-spin text-accent-blue" size={24} />
                            </div>
                        ) : error ? (
                            <p className="text-center text-red-500 py-6 flex items-center justify-center gap-2">
                                <AlertTriangle size={18} /> {error}
                            </p>
                        ) : users.length > 0 ? (
                            <div className="space-y-3">
                                {users.map(user => {
                                    const isCurrentUserProfile = user.user_id === currentUser?.id;
                                    const isFollowingThisUser = followStatusMap.get(user.user_id) || false;
                                    const isUpdatingThisUser = isUpdatingFollowMap.get(user.user_id) || false;

                                    return (
                                        <div key={user.user_id} className="flex items-center justify-between gap-3">
                                            <button
                                                onClick={() => handleUserClick(user.user_id)}
                                                className="flex items-center gap-3 flex-grow hover:opacity-80"
                                            >
                                                <img src={getUserAvatarUrl(user)} alt={user.display_name} className="w-10 h-10 rounded-full object-cover bg-gray-300" />
                                                <div>
                                                    <p className="font-medium text-brand-gray text-sm">{user.display_name}</p>
                                                    {/* Optional: Add mutual follower info or gym */}
                                                </div>
                                            </button>
                                            {/* Show follow button only if logged in and not viewing own profile */}
                                            {currentUser && !isCurrentUserProfile && (
                                                <button
                                                    onClick={() => handleFollowToggle(user.user_id, user.display_name)}
                                                    disabled={isUpdatingThisUser}
                                                    className={`px-3 py-1 rounded-full text-xs font-semibold transition-colors duration-200 flex items-center gap-1 disabled:opacity-60 ${
                                                        isFollowingThisUser
                                                            ? 'bg-gray-200 text-brand-gray hover:bg-gray-300'
                                                            : 'bg-accent-blue text-white hover:bg-opacity-90'
                                                    }`}
                                                >
                                                    {isUpdatingThisUser ? (
                                                        <Loader2 size={14} className="animate-spin" />
                                                    ) : isFollowingThisUser ? (
                                                        <><UserCheck size={14} /> Following</>
                                                    ) : (
                                                        <><UserPlus size={14} /> Follow</>
                                                    )}
                                                </button>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        ) : (
                            <p className="text-center text-gray-500 py-6">
                                {dialogType === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
                            </p>
                        )}
                    </div>

                    {/* Footer with Load More */}
                    {hasMore && (
                        <div className="p-4 border-t text-center">
                            <button
                                onClick={handleLoadMore}
                                disabled={loadingMore}
                                className="text-sm text-accent-blue hover:underline disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center w-full"
                            >
                                {loadingMore ? (
                                    <> <Loader2 className="animate-spin mr-2" size={16} /> Loading... </>
                                ) : (
                                    'Load More'
                                )}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        );
    };

    export default FollowListDialog;
