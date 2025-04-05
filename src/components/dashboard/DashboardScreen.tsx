import React, { useState, useEffect, useCallback, useRef } from 'react'; // Added useRef
    import { ChevronDown, Search, Bell, CheckCircle, Circle, HelpCircle, PlusCircle, Loader2, Route as RouteIcon, MessageSquare, Video as VideoIcon, PencilLine as DrawingIcon, AlertTriangle, MapPin, User as UserIcon } from 'lucide-react'; // Added UserIcon
    import { AppView, ActivityLogEntry, QuickStatsData, NavigationData } from '../../types'; // Added NavigationData
    import { supabase } from '../../supabaseClient';
    import { User } from '@supabase/supabase-js';

    // Helper function from ProfileScreen (consider moving to a utils file)
    const getVGradeValue = (grade: string): number => {
        if (grade && grade.toUpperCase().startsWith('V')) {
            const numPart = grade.substring(1);
            const rangeParts = numPart.split('-');
            const numericValue = parseInt(rangeParts[rangeParts.length - 1], 10);
            return isNaN(numericValue) ? -1 : numericValue;
        }
        return -1;
    };

    // Helper to get Tailwind TEXT color class
    const getGradeTextColorClass = (colorName: string | undefined): string => {
      if (!colorName) return 'text-brand-gray'; // Default text color if missing
      const colorMap: { [key: string]: string } = {
        'accent-red': 'text-accent-red', 'accent-blue': 'text-accent-blue', 'accent-yellow': 'text-accent-yellow',
        'brand-green': 'text-brand-green', 'accent-purple': 'text-accent-purple', 'brand-gray': 'text-brand-gray',
        'brand-brown': 'text-brand-brown',
      };
      return colorMap[colorName] || (colorMap[colorName.replace('_', '-')] || 'text-brand-gray');
    };


    interface DashboardScreenProps {
        currentUser: User | null;
        selectedGyms: string[];
        activeGymId: string | null;
        onSwitchGym: (gymId: string) => void;
        getGymNameById: (id: string | null) => string;
        onNavigateToGymSelection: () => void;
        onNavigate: (view: AppView, data?: NavigationData) => void; // Use NavigationData
    }

    // Helper to format time difference
    const timeAgo = (timestamp: string): string => {
        const now = new Date();
        const past = new Date(timestamp);
        const diffInSeconds = Math.floor((now.getTime() - past.getTime()) / 1000);
        const diffInMinutes = Math.floor(diffInSeconds / 60);
        const diffInHours = Math.floor(diffInMinutes / 60);
        const diffInDays = Math.floor(diffInHours / 24);

        if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
        if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
        if (diffInHours < 24) return `${diffInHours}h ago`;
        if (diffInDays === 1) return `Yesterday`;
        if (diffInDays < 7) return `${diffInDays}d ago`;
        return past.toLocaleDateString();
    };

    // Helper to get avatar URL (for the user performing the action)
    const getUserAvatarUrl = (log: ActivityLogEntry): string => {
        const defaultName = log.user_display_name || `User ${log.user_id.substring(0, 6)}`;
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(defaultName)}&background=random&color=fff`;
        return log.user_avatar_url || fallbackUrl;
    };


    const DashboardScreen: React.FC<DashboardScreenProps> = ({
        currentUser,
        selectedGyms,
        activeGymId,
        onSwitchGym,
        getGymNameById,
        onNavigateToGymSelection,
        onNavigate
    }) => {
        const [showGymSelector, setShowGymSelector] = useState(false);
        const [searchTerm, setSearchTerm] = useState(''); // Keep state for temporary input
        const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
        const [loadingActivity, setLoadingActivity] = useState(false);
        const [activityError, setActivityError] = useState<string | null>(null);

        // State for Quick Stats
        const [quickStats, setQuickStats] = useState<QuickStatsData | null>(null);
        const [loadingQuickStats, setLoadingQuickStats] = useState(false);
        const [quickStatsError, setQuickStatsError] = useState<string | null>(null);

        const handleGymSelect = (gymId: string) => { onSwitchGym(gymId); setShowGymSelector(false); };
        const handleChooseMoreGyms = () => { setShowGymSelector(false); onNavigateToGymSelection(); };
        // Keep handleSearchChange to update the temporary search term
        const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(event.target.value); };
        // NEW: Handle click/tap on the search area
        const handleSearchClick = () => {
            onNavigate('routes', { searchTerm: searchTerm.trim() });
        };

        // --- Fetch Activity Log ---
        const fetchActivityLog = useCallback(async () => {
            if (!activeGymId) { setActivityLog([]); setLoadingActivity(false); setActivityError(null); return; }
            setLoadingActivity(true); setActivityError(null);
            try {
                // Fetch activity log, joining profiles (actor) and routes (including location)
                // REMOVED the problematic followed_profile join
                const { data, error } = await supabase
                    .from('activity_log')
                    .select(`
                        *,
                        profile:profiles!user_id(display_name, avatar_url),
                        route:routes(
                          name,
                          grade,
                          grade_color,
                          location_info:locations ( name )
                        )
                    `)
                    .eq('gym_id', activeGymId)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (error) {
                    console.error("Error fetching activity log:", error);
                    // Use a more specific error message if possible, otherwise generic
                    setActivityError(`Failed to load activity: ${error.message}`);
                    setActivityLog([]);
                } else if (data) {
                    const mappedLogs = data.map(log => {
                        const routeInfo = log.route as any;
                        const locationInfo = routeInfo?.location_info as any;
                        // Note: We are NOT fetching followed_profile data here anymore.
                        // We will rely on the 'details' field for followed user info.
                        return {
                            ...log,
                            user_display_name: (log.profile as any)?.display_name,
                            user_avatar_url: (log.profile as any)?.avatar_url,
                            route_name: routeInfo?.name || log.details?.route_name,
                            route_grade: routeInfo?.grade || log.details?.route_grade,
                            route_grade_color: routeInfo?.grade_color || log.details?.route_grade_color,
                            location_name: locationInfo?.name || log.details?.location_name,
                            // Extract followed user info directly from details if available
                            followed_user_display_name: log.details?.followed_user_name,
                            // We don't have followed_user_avatar_url from this query
                            followed_user_avatar_url: null, // Set explicitly to null or undefined
                            details: log.details,
                        };
                    });
                    setActivityLog(mappedLogs as ActivityLogEntry[]);
                } else {
                    setActivityLog([]);
                }
            } catch (err: any) {
                console.error("Unexpected error fetching activity log:", err);
                setActivityError(err.message || "An unexpected error occurred.");
                setActivityLog([]);
            } finally {
                setLoadingActivity(false);
            }
        }, [activeGymId]);

        // --- Fetch Quick Stats (using RPC) ---
        const fetchQuickStats = useCallback(async (gymId: string | null) => {
            if (!currentUser || !gymId) {
                setQuickStats(null);
                setLoadingQuickStats(false);
                setQuickStatsError(null);
                return;
            }
            setLoadingQuickStats(true);
            setQuickStatsError(null);
            try {
                const { data, error: rpcError } = await supabase.rpc('get_user_gym_quick_stats', {
                    user_id_in: currentUser.id,
                    gym_id_in: gymId
                });

                if (rpcError) {
                    console.error("Error calling RPC get_user_gym_quick_stats:", rpcError);
                    throw new Error(`Failed to load quick stats: ${rpcError.message}`);
                }

                if (data) {
                    const statsData: QuickStatsData = {
                        sendsThisMonth: data.sendsThisMonth,
                        highestGradeSent: data.highestGradeSent,
                        betaAddedThisMonth: data.betaAddedThisMonth,
                    };
                    setQuickStats(statsData);
                } else {
                    console.warn("RPC get_user_gym_quick_stats returned no data.");
                    setQuickStats({ sendsThisMonth: 0, highestGradeSent: null, betaAddedThisMonth: 0 });
                }

            } catch (err: any) {
                console.error("Unexpected error fetching quick stats via RPC:", err);
                setQuickStatsError(err.message || "An unexpected error occurred fetching stats.");
                setQuickStats(null);
            } finally {
                setLoadingQuickStats(false);
            }
        }, [currentUser]);

        // Fetch data on mount or when user/gym changes
        useEffect(() => {
            fetchActivityLog();
            fetchQuickStats(activeGymId);
        }, [fetchActivityLog, fetchQuickStats, activeGymId]);


        // --- Render Activity Item ---
        const renderActivityItem = (log: ActivityLogEntry) => {
            let icon = <HelpCircle size={18} className="text-gray-500" />; let text = `performed an action.`;
            const userName = log.user_display_name || `User ${log.user_id.substring(0, 6)}`;
            const isCurrentUser = currentUser?.id === log.user_id;

            // Make username clickable, unless it's the current user
            const userNameDisplay = isCurrentUser ? (
                <span className="font-medium">{userName}</span>
            ) : (
                <button
                    onClick={() => onNavigate('publicProfile', { profileUserId: log.user_id })}
                    className="font-medium hover:underline text-brand-green"
                >
                    {userName}
                </button>
            );

            const routeName = log.route_name || log.details?.route_name || 'a route';
            const routeGrade = log.route_grade || log.details?.route_grade || 'N/A';
            const routeGradeColor = log.route_grade_color || log.details?.route_grade_color;
            const locationName = log.location_name || log.details?.location_name;
            const textColorClass = getGradeTextColorClass(routeGradeColor);

            const routeDisplay = (
                <>
                    {log.route_id && log.route_name ? (
                        <button
                            onClick={() => onNavigate('routeDetail', { routeId: log.route_id })}
                            className={`font-medium hover:underline ${textColorClass}`}
                        >
                            {routeName} ({routeGrade})
                        </button>
                    ) : (
                        <span className={`font-medium ${textColorClass}`}>
                            {routeName} ({routeGrade})
                        </span>
                    )}
                    {locationName && <span className="text-gray-500 text-xs"> at {locationName}</span>}
                </>
            );

            // Handle 'follow_user' activity type using details
            const followedUserName = log.details?.followed_user_name || 'another user';
            const followedUserId = log.details?.followed_user_id;
            const isFollowingCurrentUser = followedUserId === currentUser?.id;

            const followedUserDisplay = followedUserId ? (
                <button
                    onClick={() => onNavigate('profile', { profileUserId: followedUserId })}
                    className="font-medium hover:underline text-brand-green"
                >
                    {isFollowingCurrentUser ? 'you' : followedUserName}
                </button>
            ) : (
                <span className="font-medium">{followedUserName}</span>
            );


            switch (log.activity_type) {
                case 'log_send': icon = <CheckCircle size={18} className="text-green-500" />; text = <>sent {routeDisplay}. {log.details?.attempts ? `(${log.details.attempts} attempts)` : ''}</>; break;
                case 'log_attempt': icon = <Circle size={18} className="text-orange-400" />; text = <>attempted {routeDisplay}.</>; break;
                case 'add_beta': icon = log.details?.beta_type === 'video' ? <VideoIcon size={18} className="text-blue-500" /> : log.details?.beta_type === 'drawing' ? <DrawingIcon size={18} className="text-purple-500" /> : <HelpCircle size={18} className="text-blue-500" />; text = <>added {log.details?.beta_type || ''} beta for {routeDisplay}.</>; break;
                case 'add_comment': icon = <MessageSquare size={18} className="text-indigo-500" />; text = <>commented on {routeDisplay}: "{log.details?.comment_snippet || '...'}"</>; break;
                case 'add_route': icon = <RouteIcon size={18} className="text-brand-green" />; text = <>added a new route: {routeDisplay}.</>; break;
                case 'follow_user': icon = <UserIcon size={18} className="text-accent-purple" />; text = <>started following {followedUserDisplay}.</>; break; // Uses details info
            }
            return (
                <div key={log.id} className="bg-white p-3 rounded-lg shadow flex items-start space-x-3">
                    {/* Use actor's avatar */}
                    <img src={getUserAvatarUrl(log)} alt={userName || 'User Avatar'} className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-1"/>
                    <div className="flex-grow">
                        <div className="text-sm">{userNameDisplay} {text}</div>
                        <p className="text-xs text-gray-500 mt-0.5">{timeAgo(log.created_at)}</p>
                    </div>
                    <div className="flex-shrink-0 ml-auto mt-1">{icon}</div>
                </div>
            );
        };

        // --- Render Quick Stats Section ---
        const renderQuickStats = () => {
            if (loadingQuickStats) {
                return <div className="flex justify-center items-center p-6"> <Loader2 className="animate-spin text-accent-blue mr-2" size={24} /> Loading stats... </div>;
            }
            if (quickStatsError) {
                return <div className="p-6 text-center text-red-500"> <AlertTriangle size={20} className="inline mr-1 mb-0.5"/> {quickStatsError} </div>;
            }
            if (!quickStats) {
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-accent-blue/10 rounded"> <p className="text-2xl font-bold text-accent-blue">0</p> <p className="text-sm text-brand-gray">Sends This Month</p> </div>
                        <div className="p-3 bg-accent-purple/10 rounded"> <p className="text-2xl font-bold text-accent-purple">N/A</p> <p className="text-sm text-brand-gray">Highest Grade</p> </div>
                        <div className="p-3 bg-accent-yellow/10 rounded"> <p className="text-2xl font-bold text-accent-yellow">0</p> <p className="text-sm text-brand-gray">Beta Added (Month)</p> </div>
                    </div>
                );
            }
            return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-accent-blue/10 rounded"> <p className="text-2xl font-bold text-accent-blue">{quickStats.sendsThisMonth}</p> <p className="text-sm text-brand-gray">Sends This Month</p> </div>
                    <div className="p-3 bg-accent-purple/10 rounded"> <p className="text-2xl font-bold text-accent-purple">{quickStats.highestGradeSent || 'N/A'}</p> <p className="text-sm text-brand-gray">Highest Grade</p> </div>
                    <div className="p-3 bg-accent-yellow/10 rounded"> <p className="text-2xl font-bold text-accent-yellow">{quickStats.betaAddedThisMonth}</p> <p className="text-sm text-brand-gray">Beta Added (Month)</p> </div>
                </div>
            );
        };

        const activeGymName = getGymNameById(activeGymId);

        return (
            <div className="min-h-screen bg-gray-50 flex flex-col">
                {/* Header Area */}
                <header className="bg-white shadow-sm p-4 sticky top-0 z-10">
                    <div className="flex justify-between items-center relative">
                        <button onClick={() => setShowGymSelector(!showGymSelector)} className="flex items-center text-brand-green hover:text-opacity-80"> <h1 className="text-xl font-bold mr-1 truncate max-w-[200px] sm:max-w-xs">{activeGymName}</h1> <ChevronDown size={20} className={`transition-transform ${showGymSelector ? 'rotate-180' : ''}`} /> </button>
                        {showGymSelector && ( <div className="absolute top-full left-0 mt-2 w-60 bg-white rounded-md shadow-lg border z-20 max-h-60 overflow-y-auto"> {selectedGyms.length > 1 && selectedGyms.map(gymId => ( <button key={gymId} onClick={() => handleGymSelect(gymId)} className={`block w-full text-left px-4 py-2 text-sm truncate ${activeGymId === gymId ? 'bg-accent-blue/10 text-accent-blue font-semibold' : 'text-brand-gray hover:bg-gray-100'}`}> {getGymNameById(gymId)} </button> ))} {selectedGyms.length > 1 && <hr className="my-1 border-gray-200" />} <button onClick={handleChooseMoreGyms} className="flex items-center w-full text-left px-4 py-2 text-sm text-accent-blue hover:bg-accent-blue/10"> <PlusCircle size={16} className="mr-2" /> Choose more gyms... </button> </div> )}
                        <button className="text-brand-gray hover:text-brand-green"> <Bell size={24} /> </button>
                    </div>
                    {/* Search Area - Modified */}
                    <div className="relative mt-4">
                        {/* Hidden input to capture typing */}
                        <input
                            type="text"
                            value={searchTerm}
                            onChange={handleSearchChange}
                            className="absolute inset-0 opacity-0 pointer-events-none" // Hide visually but allow typing
                            aria-hidden="true"
                         />
                         {/* Clickable area styled as input */}
                        <button
                            onClick={handleSearchClick}
                            className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue bg-gray-100 text-left flex items-center text-gray-500 hover:border-gray-400"
                        >
                            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
                            {searchTerm || `Search routes at ${activeGymName}...`}
                        </button>
                    </div>
                </header>

                {/* Main Content Area */}
                <main className="flex-grow p-4 space-y-6 overflow-y-auto pb-20">
                    {/* Quick Stats Section */}
                    <section className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold text-brand-gray mb-3">Quick Stats ({activeGymName})</h2>
                        {renderQuickStats()}
                    </section>

                    {/* Recent Activity Feed Section */}
                    <section>
                        <h2 className="text-lg font-semibold text-brand-gray mb-3">Recent Activity</h2>
                        {loadingActivity ? ( <div className="flex justify-center items-center p-6 bg-white rounded-lg shadow"> <Loader2 className="animate-spin text-accent-blue mr-2" size={24} /> <p className="text-brand-gray">Loading activity...</p> </div> )
                         : activityError ? ( <p className="text-center text-red-500 p-6 bg-white rounded-lg shadow">{activityError}</p> )
                         : activityLog.length > 0 ? ( <div className="space-y-3"> {activityLog.map(renderActivityItem)} </div> )
                         : ( <p className="text-center text-gray-500 p-6 bg-white rounded-lg shadow">No recent activity in this gym yet.</p> )}
                    </section>
                </main>
            </div>
        );
    };

    export default DashboardScreen;
