import React, { useState, useEffect, useCallback } from 'react';
    import { ChevronDown, Search, Bell, CheckCircle, Circle, HelpCircle, PlusCircle, Loader2, Route as RouteIcon, MessageSquare, Video as VideoIcon, PencilLine as DrawingIcon, AlertTriangle } from 'lucide-react';
    import { AppView, ActivityLogEntry, QuickStatsData } from '../../types'; // Import QuickStatsData
    import { supabase } from '../../supabaseClient';
    import { User } from '@supabase/supabase-js';

    // Helper function from ProfileScreen (consider moving to a utils file)
    // NOTE: This JS version is still needed for display logic if highestGradeSent is used elsewhere,
    // but the core calculation is now done in SQL.
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
      // Try direct lookup first, then check if it matches the key format (replace _ with -)
      return colorMap[colorName] || (colorMap[colorName.replace('_', '-')] || 'text-brand-gray');
    };


    interface DashboardScreenProps {
        currentUser: User | null;
        selectedGyms: string[];
        activeGymId: string | null;
        onSwitchGym: (gymId: string) => void;
        getGymNameById: (id: string | null) => string;
        onNavigateToGymSelection: () => void;
        onNavigate: (view: AppView, data?: string | { routeId?: string; searchTerm?: string }) => void;
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

    // Helper to get avatar URL
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
        const [searchTerm, setSearchTerm] = useState('');
        const [activityLog, setActivityLog] = useState<ActivityLogEntry[]>([]);
        const [loadingActivity, setLoadingActivity] = useState(false);
        const [activityError, setActivityError] = useState<string | null>(null);

        // State for Quick Stats
        const [quickStats, setQuickStats] = useState<QuickStatsData | null>(null);
        const [loadingQuickStats, setLoadingQuickStats] = useState(false);
        const [quickStatsError, setQuickStatsError] = useState<string | null>(null);

        const handleGymSelect = (gymId: string) => { onSwitchGym(gymId); setShowGymSelector(false); };
        const handleChooseMoreGyms = () => { setShowGymSelector(false); onNavigateToGymSelection(); };
        const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => { setSearchTerm(event.target.value); };
        const handleSearchSubmit = (event: React.FormEvent<HTMLFormElement>) => { event.preventDefault(); if (searchTerm.trim()) { onNavigate('routes', { searchTerm: searchTerm.trim() }); } };

        // --- Fetch Activity Log ---
        const fetchActivityLog = useCallback(async () => {
            if (!activeGymId) { setActivityLog([]); setLoadingActivity(false); setActivityError(null); return; }
            setLoadingActivity(true); setActivityError(null);
            try {
                // Select grade_color from the joined routes table
                const { data, error } = await supabase
                    .from('activity_log')
                    .select(`
                        *,
                        profile:profiles!user_id(display_name, avatar_url),
                        route:routes(name, grade, grade_color)
                    `)
                    .eq('gym_id', activeGymId)
                    .order('created_at', { ascending: false })
                    .limit(20);

                if (error) {
                    console.error("Error fetching activity log:", error);
                    if (error.code === 'PGRST200') { setActivityError("DB relation error."); }
                    else { setActivityError("Failed to load activity."); }
                    setActivityLog([]);
                } else if (data) {
                    // Map the data, including the grade_color
                    const mappedLogs = data.map(log => ({
                        ...log,
                        user_display_name: (log.profile as any)?.display_name,
                        user_avatar_url: (log.profile as any)?.avatar_url,
                        route_name: (log.route as any)?.name || log.details?.route_name,
                        route_grade: (log.route as any)?.grade || log.details?.route_grade,
                        route_grade_color: (log.route as any)?.grade_color || log.details?.route_grade_color, // Get color from route or details
                        details: log.details,
                    }));
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

        // --- Fetch Quick Stats (MODIFIED to use RPC) ---
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
                // Call the RPC function
                const { data, error: rpcError } = await supabase.rpc('get_user_gym_quick_stats', {
                    user_id_in: currentUser.id,
                    gym_id_in: gymId
                });

                if (rpcError) {
                    console.error("Error calling RPC get_user_gym_quick_stats:", rpcError);
                    throw new Error(`Failed to load quick stats: ${rpcError.message}`);
                }

                if (data) {
                    // Data should be the JSON object returned by the function
                    // Ensure the structure matches QuickStatsData
                    const statsData: QuickStatsData = {
                        sendsThisMonth: data.sendsThisMonth,
                        highestGradeSent: data.highestGradeSent,
                        betaAddedThisMonth: data.betaAddedThisMonth,
                    };
                    setQuickStats(statsData);
                } else {
                    // Handle case where RPC returns no data (shouldn't happen with json_build_object)
                    console.warn("RPC get_user_gym_quick_stats returned no data.");
                    setQuickStats({ sendsThisMonth: 0, highestGradeSent: null, betaAddedThisMonth: 0 }); // Set default zero stats
                }

            } catch (err: any) {
                console.error("Unexpected error fetching quick stats via RPC:", err);
                setQuickStatsError(err.message || "An unexpected error occurred fetching stats.");
                setQuickStats(null);
            } finally {
                setLoadingQuickStats(false);
            }
        }, [currentUser]); // Dependency remains currentUser

        // Fetch data on mount or when user/gym changes
        useEffect(() => {
            fetchActivityLog();
            fetchQuickStats(activeGymId); // Pass activeGymId here
        }, [fetchActivityLog, fetchQuickStats, activeGymId]); // Add activeGymId dependency


        // --- Render Activity Item ---
        const renderActivityItem = (log: ActivityLogEntry) => {
            let icon = <HelpCircle size={18} className="text-gray-500" />; let text = `performed an action.`;
            const userName = <span className="font-medium">{log.user_display_name || `User ${log.user_id.substring(0, 6)}`}</span>;

            // Determine if the route exists and create the link/span
            const routeName = log.route_name || log.details?.route_name || 'a route';
            const routeGrade = log.route_grade || log.details?.route_grade || 'N/A';
            const routeGradeColor = log.route_grade_color || log.details?.route_grade_color; // Get color
            const textColorClass = getGradeTextColorClass(routeGradeColor); // Get text color class

            const routeDisplay = (
                <>
                    {/* REMOVED color indicator span */}
                    {log.route_id && log.route_name ? (
                        <button
                            onClick={() => onNavigate('routeDetail', { routeId: log.route_id })}
                            // Apply text color class here
                            className={`font-medium hover:underline ${textColorClass}`}
                        >
                            {routeName} ({routeGrade})
                        </button>
                    ) : (
                        // Apply text color class here
                        <span className={`font-medium ${textColorClass}`}>
                            {routeName} ({routeGrade})
                        </span>
                    )}
                </>
            );

            switch (log.activity_type) {
                case 'log_send': icon = <CheckCircle size={18} className="text-green-500" />; text = <>sent {routeDisplay}. {log.details?.attempts ? `(${log.details.attempts} attempts)` : ''}</>; break;
                case 'log_attempt': icon = <Circle size={18} className="text-orange-400" />; text = <>attempted {routeDisplay}.</>; break;
                case 'add_beta': icon = log.details?.beta_type === 'video' ? <VideoIcon size={18} className="text-blue-500" /> : log.details?.beta_type === 'drawing' ? <DrawingIcon size={18} className="text-purple-500" /> : <HelpCircle size={18} className="text-blue-500" />; text = <>added {log.details?.beta_type || ''} beta for {routeDisplay}.</>; break;
                case 'add_comment': icon = <MessageSquare size={18} className="text-indigo-500" />; text = <>commented on {routeDisplay}: "{log.details?.comment_snippet || '...'}"</>; break;
                case 'add_route': icon = <RouteIcon size={18} className="text-brand-green" />; text = <>added a new route: {routeDisplay}.</>; break;
            }
            return (
                <div key={log.id} className="bg-white p-3 rounded-lg shadow flex items-start space-x-3">
                    <img src={getUserAvatarUrl(log)} alt={log.user_display_name || 'User Avatar'} className="w-10 h-10 rounded-full object-cover flex-shrink-0 mt-1"/>
                    <div className="flex-grow">
                        {/* Wrap text in a div to allow inline elements */}
                        <div className="text-sm">{userName} {text}</div>
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
                // Changed to show 0/N/A instead of 'unavailable' when data is fetched but empty
                return (
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                        <div className="p-3 bg-accent-blue/10 rounded"> <p className="text-2xl font-bold text-accent-blue">0</p> <p className="text-sm text-brand-gray">Sends This Month</p> </div>
                        <div className="p-3 bg-accent-purple/10 rounded"> <p className="text-2xl font-bold text-accent-purple">N/A</p> <p className="text-sm text-brand-gray">Highest Grade</p> </div>
                        <div className="p-3 bg-accent-yellow/10 rounded"> <p className="text-2xl font-bold text-accent-yellow">0</p> <p className="text-sm text-brand-gray">Beta Added (Month)</p> </div>
                    </div>
                );
            }
            // Display updated stats including betaAddedThisMonth
            return (
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <div className="p-3 bg-accent-blue/10 rounded"> <p className="text-2xl font-bold text-accent-blue">{quickStats.sendsThisMonth}</p> <p className="text-sm text-brand-gray">Sends This Month</p> </div>
                    <div className="p-3 bg-accent-purple/10 rounded"> <p className="text-2xl font-bold text-accent-purple">{quickStats.highestGradeSent || 'N/A'}</p> <p className="text-sm text-brand-gray">Highest Grade</p> </div>
                    {/* Updated stat */}
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
                    <form onSubmit={handleSearchSubmit} className="relative mt-4"> <input type="text" placeholder={`Search routes at ${activeGymName}...`} value={searchTerm} onChange={handleSearchChange} className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-accent-blue bg-gray-100" /> <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} /> <button type="submit" className="hidden"></button> </form>
                </header>

                {/* Main Content Area */}
                <main className="flex-grow p-4 space-y-6 overflow-y-auto pb-20">
                    {/* Quick Stats Section */}
                    <section className="bg-white p-4 rounded-lg shadow">
                        <h2 className="text-lg font-semibold text-brand-gray mb-3">Quick Stats ({activeGymName})</h2> {/* Indicate filtered gym */}
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
