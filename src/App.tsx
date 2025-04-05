import React, { useState, useEffect, useCallback } from 'react';
    import WelcomeScreen from './components/onboarding/WelcomeScreen';
    import AuthScreen from './components/onboarding/AuthScreen';
    import GymSelectionScreen from './components/onboarding/GymSelectionScreen';
    import DashboardScreen from './components/dashboard/DashboardScreen';
    import RoutesScreen from './components/routes/RoutesScreen';
    import RouteDetailScreen from './components/routes/RouteDetailScreen';
    import AddBetaScreen from './components/beta/AddBetaScreen';
    import LogClimbScreen from './components/log/LogClimbScreen';
    import ProfileScreen from './components/profile/ProfileScreen';
    import DiscoverScreen from './components/discover/DiscoverScreen';
    import SettingsScreen from './components/settings/SettingsScreen'; // Import SettingsScreen
    import BottomNavBar from './components/dashboard/BottomNavBar';
    import { AppView, RouteData, UserMetadata, GymData, LocationData, NavigationData } from './types'; // Added LocationData, NavigationData
    import { supabase } from './supabaseClient';
    import type { User } from '@supabase/supabase-js';
    import { Loader2 } from 'lucide-react'; // Import Loader

    // --- Global State ---
    type OnboardingStep = 'welcome' | 'auth' | 'gymSelection' | 'complete';

    function App() {
      const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');
      const [appView, setAppView] = useState<AppView>('onboarding');
      const [previousAppView, setPreviousAppView] = useState<AppView>('dashboard');
      const [selectedGymIds, setSelectedGymIds] = useState<string[]>([]);
      const [activeGymId, setActiveGymId] = useState<string | null>(null);
      const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
      const [viewingProfileId, setViewingProfileId] = useState<string | null>(null); // State for the profile being viewed
      const [isAuthenticated, setIsAuthenticated] = useState(false);
      const [currentUser, setCurrentUser] = useState<User | null>(null);
      const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null); // Current logged-in user's metadata
      const [gymDetails, setGymDetails] = useState<Map<string, GymData>>(new Map());
      const [isLoadingAuth, setIsLoadingAuth] = useState(true);
      const [isLoadingData, setIsLoadingData] = useState(false);
      const [isLoadingGymDetails, setIsLoadingGymDetails] = useState(false);
      const [initialSearchTerm, setInitialSearchTerm] = useState<string | undefined>(undefined);

      // State for fetched route details (used by RouteDetailScreen and AddBetaScreen)
      const [selectedRouteData, setSelectedRouteData] = useState<RouteData | null | undefined>(undefined); // undefined: not fetched, null: error/not found
      const [isLoadingRouteDetail, setIsLoadingRouteDetail] = useState(false);
      const [routeDetailError, setRouteDetailError] = useState<string | null>(null);

      // State for routes available in the active gym (for LogClimbScreen)
      const [activeGymRoutes, setActiveGymRoutes] = useState<RouteData[]>([]);
      const [isLoadingActiveGymRoutes, setIsLoadingActiveGymRoutes] = useState(false);


      // --- Utility Functions ---
      const getGymNameById = useCallback((id: string | null): string => {
        if (!id) return 'Unknown Gym';
        return gymDetails.get(id)?.name || 'Loading Gym...';
      }, [gymDetails]);


      // --- Effect to Fetch Gym Details ---
      useEffect(() => {
        const fetchGymDetails = async () => {
          const idsToFetchSet = new Set<string>();
          selectedGymIds.forEach(id => idsToFetchSet.add(id));
          if (activeGymId) idsToFetchSet.add(activeGymId);
          const idsToFetch = Array.from(idsToFetchSet).filter(Boolean);

          if (idsToFetch.length === 0) { setGymDetails(new Map()); return; }

          setIsLoadingGymDetails(true);
          try {
            const { data, error } = await supabase.from('gyms').select('id, name, city, state, country').in('id', idsToFetch);
            if (error) { console.error('[Gym Details Effect] Error fetching gym details:', error); setGymDetails(new Map()); }
            else if (data) { const newDetails = new Map<string, GymData>(); data.forEach(gym => newDetails.set(gym.id, gym)); setGymDetails(newDetails); }
          } catch (err) { console.error("[Gym Details Effect] Unexpected error fetching gym details:", err); setGymDetails(new Map()); }
          finally { setIsLoadingGymDetails(false); }
        };
        fetchGymDetails();
      }, [activeGymId, selectedGymIds]);


      // --- User Data Fetching (for the logged-in user) ---
      const fetchUserMetadata = useCallback(async (userId: string): Promise<UserMetadata | null> => {
        console.log("[fetchUserMetadata] Fetching metadata for logged-in user:", userId);
        setIsLoadingData(true);
        let metadataResult: UserMetadata | null = null;
        try {
          const { data, error } = await supabase.from('profiles').select('*').eq('user_id', userId).single();
          if (error && error.code !== 'PGRST116') { console.error('[fetchUserMetadata] Error fetching user metadata:', error.message); setUserMetadata(null); setSelectedGymIds([]); setActiveGymId(null); }
          else if (data) {
            console.log("[fetchUserMetadata] User metadata fetched successfully:", data);
            setUserMetadata(data); metadataResult = data;
            const fetchedGymIds = data.selected_gym_ids || [];
            const fetchedCurrentGym = data.current_gym_id || null;
            setSelectedGymIds(fetchedGymIds);
            const newActiveGym = fetchedCurrentGym || (fetchedGymIds.length > 0 ? fetchedGymIds[0] : null);
            setActiveGymId(newActiveGym);
            if (fetchedGymIds.length > 0) { setOnboardingStep('complete'); setAppView(prev => prev === 'onboarding' ? 'dashboard' : prev); }
            else { setOnboardingStep('gymSelection'); setAppView('onboarding'); }
          } else { console.log("[fetchUserMetadata] No user metadata found for user:", userId); setUserMetadata(null); setSelectedGymIds([]); setActiveGymId(null); setOnboardingStep('gymSelection'); setAppView('onboarding'); }
        } catch (err) { console.error("[fetchUserMetadata] Unexpected error during fetch:", err); setUserMetadata(null); setSelectedGymIds([]); setActiveGymId(null); setOnboardingStep('gymSelection'); setAppView('onboarding'); }
        finally { setIsLoadingData(false); }
        return metadataResult;
      }, []);


      // --- Authentication Handling ---
      useEffect(() => {
        let isMounted = true;
        setIsLoadingAuth(true);
        const handleLogoutCleanup = () => {
          if (!isMounted) return;
          setIsAuthenticated(false); setCurrentUser(null); setUserMetadata(null);
          setSelectedGymIds([]); setActiveGymId(null); setSelectedRouteId(null); setViewingProfileId(null); // Reset viewing profile ID
          setGymDetails(new Map()); setAppView('onboarding'); setOnboardingStep('auth');
          setPreviousAppView('dashboard'); setIsLoadingData(false); setIsLoadingGymDetails(false);
          setSelectedRouteData(undefined); setIsLoadingRouteDetail(false); setRouteDetailError(null);
          setInitialSearchTerm(undefined); setActiveGymRoutes([]); setIsLoadingActiveGymRoutes(false);
        };

        supabase.auth.getSession().then(({ data: { session } }) => {
          if (isMounted) { setCurrentUser(session?.user ?? null); setIsAuthenticated(!!session?.user); if (!session?.user) handleLogoutCleanup(); setIsLoadingAuth(false); }
        }).catch(error => { console.error("[Auth Effect] Error getting initial session:", error); if (isMounted) { handleLogoutCleanup(); setIsLoadingAuth(false); } });

        const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
          if (!isMounted) return;
          const currentUserIdInClosure = currentUser?.id;
          const userChanged = session?.user?.id !== currentUserIdInClosure;
          const loggingOut = !session?.user && !!currentUserIdInClosure;
          if (userChanged || loggingOut) {
            setCurrentUser(session?.user ?? null); setIsAuthenticated(!!session?.user);
            if (!session?.user) { handleLogoutCleanup(); }
            else { setIsLoadingData(true); setSelectedRouteData(undefined); setIsLoadingRouteDetail(false); setRouteDetailError(null); setInitialSearchTerm(undefined); setActiveGymRoutes([]); setIsLoadingActiveGymRoutes(false); setViewingProfileId(null); } // Reset viewing profile ID on login
          }
        });
        return () => { isMounted = false; authListener?.subscription.unsubscribe(); };
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, []);


      // --- Effect for Fetching Logged-in User Data based on Current User ---
      useEffect(() => {
        let isMounted = true;
        if (currentUser && !isLoadingAuth) { fetchUserMetadata(currentUser.id).catch(error => { console.error("[Data Fetch Effect] Error during metadata fetch:", error); }); }
        else if (!currentUser) { setIsLoadingData(false); }
        return () => { isMounted = false; };
      }, [currentUser, fetchUserMetadata, isLoadingAuth]);


      // --- Effect for Fetching Selected Route Details (MODIFIED to include location) ---
      useEffect(() => {
        const fetchRouteDetails = async () => {
          if (!selectedRouteId) { setSelectedRouteData(undefined); setIsLoadingRouteDetail(false); setRouteDetailError(null); return; }
          setIsLoadingRouteDetail(true); setRouteDetailError(null); setSelectedRouteData(undefined);
          try {
            // Fetch route and join locations table to get location name
            const { data, error } = await supabase
              .from('routes')
              .select(`
                *,
                location_name:locations ( name )
              `)
              .eq('id', selectedRouteId)
              .single();

            if (error) {
              console.error('[Route Detail Effect] Error fetching route details:', error);
              setRouteDetailError(error.code === 'PGRST116' ? 'Route not found.' : `Failed to load route details: ${error.message}`);
              setSelectedRouteData(null);
            } else if (data) {
              // Map the data to include location_name directly
              const mappedData: RouteData = {
                ...data,
                location_name: (data.location_name as any)?.name || null, // Extract name, handle null
              };
              setSelectedRouteData(mappedData);
            } else {
              setRouteDetailError('Route not found.');
              setSelectedRouteData(null);
            }
          } catch (err) {
            console.error("[Route Detail Effect] Unexpected error fetching route details:", err);
            setRouteDetailError("An unexpected error occurred while fetching route details.");
            setSelectedRouteData(null);
          } finally {
            setIsLoadingRouteDetail(false);
          }
        };
        // Fetch only when needed for detail or beta screen
        if ((appView === 'routeDetail' || appView === 'addBeta') && selectedRouteId) {
          fetchRouteDetails();
        } else {
          // Clear data if not on relevant screens or no route selected
          setSelectedRouteData(undefined);
          setIsLoadingRouteDetail(false);
          setRouteDetailError(null);
        }
      }, [selectedRouteId, appView]); // Re-run when route ID or view changes


      // --- Effect for Fetching Routes for the Active Gym (for Log Screen) ---
      useEffect(() => {
        const fetchActiveGymRoutes = async () => {
          if (!activeGymId || appView !== 'log') { // Only fetch if needed for log screen
            setActiveGymRoutes([]);
            setIsLoadingActiveGymRoutes(false);
            return;
          }
          setIsLoadingActiveGymRoutes(true);
          try {
            // Include location join here as well if needed for LogClimbScreen display
            const { data, error } = await supabase
              .from('routes')
              .select(`
                id, gym_id, name, grade, grade_color, date_set, location_id,
                location_name:locations ( name )
              `) // Select needed fields + location name
              .eq('gym_id', activeGymId)
              .order('name', { ascending: true });

            if (error) {
              console.error('[Active Gym Routes Effect] Error fetching routes:', error);
              setActiveGymRoutes([]);
            } else {
               // Map the data to include location_name directly
              const mappedRoutes = data.map(r => ({
                ...r,
                location_name: (r.location_name as any)?.name || null,
              }));
              setActiveGymRoutes(mappedRoutes as RouteData[]);
            }
          } catch (err) {
            console.error("[Active Gym Routes Effect] Unexpected error:", err);
            setActiveGymRoutes([]);
          } finally {
            setIsLoadingActiveGymRoutes(false);
          }
        };
        fetchActiveGymRoutes();
      }, [activeGymId, appView]); // Re-run when gym changes or view becomes 'log'


      // Update previous view state
      useEffect(() => {
        // Store the previous view unless it's one we want to ignore for back navigation
        const viewsToIgnoreForBack = ['log', 'settings'];
        // Also ignore profile view if navigating *to* a profile from another profile
        const isNavigatingBetweenProfiles = appView === 'profile' && previousAppView === 'profile';
        setPreviousAppView(currentView => (viewsToIgnoreForBack.includes(appView) || isNavigatingBetweenProfiles ? currentView : appView));
      }, [appView, previousAppView]); // Include previousAppView dependency


      // --- Navigation and Action Handlers ---
      const handleNavigate = (view: AppView, data?: NavigationData) => {
        // Reset specific states based on the target view
        if (view !== 'routeDetail' && view !== 'addBeta') setSelectedRouteId(null);
        if (view !== 'routes') setInitialSearchTerm(undefined);
        if (view !== 'profile') setViewingProfileId(null); // Reset viewing profile ID if not navigating to profile

        // Set states based on incoming data
        if (data?.routeId && (view === 'routeDetail' || view === 'addBeta')) setSelectedRouteId(data.routeId);
        if (data?.searchTerm && view === 'routes') setInitialSearchTerm(data.searchTerm);
        if (data?.profileUserId && view === 'profile') setViewingProfileId(data.profileUserId); // Set viewing profile ID

        setAppView(view);
      };

      const handleNavigateToGymSelection = () => { setActiveGymId(null); setAppView('onboarding'); setOnboardingStep('gymSelection'); };

      const persistGymSelection = async (userId: string, gymsToSave: string[], currentGym: string | null) => {
        setIsLoadingData(true);
        try {
          const { error } = await supabase.from('profiles').upsert({ user_id: userId, selected_gym_ids: gymsToSave, current_gym_id: currentGym }, { onConflict: 'user_id' });
          if (error) { console.error('Error saving selected gyms (upsert):', error); alert(`Error saving gym selection: ${error.message}`); await fetchUserMetadata(userId); }
          else {
            setSelectedGymIds(gymsToSave); setActiveGymId(currentGym);
            setUserMetadata(prev => prev ? { ...prev, selected_gym_ids: gymsToSave, current_gym_id: currentGym } : { user_id: userId, display_name: currentUser?.user_metadata?.display_name || 'Climber', selected_gym_ids: gymsToSave, current_gym_id: currentGym, created_at: new Date().toISOString(), updated_at: new Date().toISOString(), });
            setOnboardingStep('complete'); setAppView('dashboard');
          }
        } catch (err) { console.error("Unexpected error persisting gym selection:", err); alert("An unexpected error occurred while saving your gym selection."); if (currentUser) await fetchUserMetadata(currentUser.id); }
        finally { setIsLoadingData(false); }
      };

      const handleGymSelectionComplete = async () => {
        if (selectedGymIds.length > 0 && currentUser) { const firstGym = selectedGymIds[0]; const currentGymToSet = activeGymId && selectedGymIds.includes(activeGymId) ? activeGymId : firstGym; await persistGymSelection(currentUser.id, selectedGymIds, currentGymToSet); }
        else if (!currentUser) { alert("Error: User session not found. Please try logging in again."); handleLogout(); }
        else { alert("Please select at least one gym."); }
      };

      const handleGymSelectionChange = (gymIds: string[]) => { setSelectedGymIds(gymIds); };
      const handleAuthSuccess = () => { setIsLoadingData(true); };

      const handleSwitchGym = async (gymId: string) => {
        if (currentUser && gymId !== activeGymId) {
          const previousActiveGymId = activeGymId; setActiveGymId(gymId); setAppView('dashboard'); setSelectedRouteId(null); setIsLoadingData(true);
          try {
            const { error } = await supabase.from('profiles').update({ current_gym_id: gymId }).eq('user_id', currentUser.id);
            if (error) { console.error('Error updating current gym:', error); setActiveGymId(previousActiveGymId); alert(`Failed to switch gym: ${error.message}`); }
            else { setUserMetadata(prev => prev ? { ...prev, current_gym_id: gymId } : null); }
          } catch (err) { console.error("Unexpected error switching gym:", err); setActiveGymId(previousActiveGymId); alert("An unexpected error occurred while switching gyms."); }
          finally { setIsLoadingData(false); }
        }
      };

      const handleBack = () => {
        if (appView === 'routeDetail' || appView === 'addBeta') { setAppView('routes'); setSelectedRouteId(null); }
        else if (appView === 'routes') { setAppView('dashboard'); setInitialSearchTerm(undefined); }
        else if (appView === 'log' || appView === 'settings') { setAppView(previousAppView); } // Go back from log or settings
        else if (appView === 'profile') {
            // If viewing someone else's profile, go back to the previous view
            // If viewing own profile, go back to dashboard
            if (viewingProfileId && viewingProfileId !== currentUser?.id) {
                setAppView(previousAppView);
                setViewingProfileId(null); // Clear the viewing ID when going back
            } else {
                setAppView('dashboard');
            }
        }
        else if (appView === 'discover') { setAppView('dashboard'); }
        else if (appView === 'onboarding' && onboardingStep === 'gymSelection') { setOnboardingStep('auth'); }
        else if (appView === 'onboarding' && onboardingStep === 'gymSelection' && isAuthenticated && userMetadata?.selected_gym_ids && userMetadata.selected_gym_ids.length > 0) { setAppView('dashboard'); setOnboardingStep('complete'); }
        else { setAppView('dashboard'); } // Default back to dashboard
      };

      const handleBetaSubmitted = () => { setAppView('routeDetail'); /* TODO: Refetch beta? */ };
      const handleLogSubmitted = () => { setAppView(previousAppView); /* TODO: Refetch activity log on dashboard? */ };
      const handleLogout = async () => { setIsLoadingAuth(true); const { error } = await supabase.auth.signOut(); if (error) { alert(`Logout failed: ${error.message}`); setIsLoadingAuth(false); } };


      // --- Rendering Logic ---
      const renderOnboarding = () => {
        switch (onboardingStep) {
          case 'welcome': return <WelcomeScreen onNext={() => setOnboardingStep('auth')} />;
          case 'auth': return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
          case 'gymSelection': return <GymSelectionScreen preSelectedGymsIds={selectedGymIds} onGymsSelected={handleGymSelectionChange} onNext={handleGymSelectionComplete} />;
          default: return null;
        }
      };

      const renderApp = () => {
        const showLoading = isLoadingAuth || (isAuthenticated && (isLoadingData || isLoadingGymDetails));
        if (showLoading) { return <div className="min-h-screen flex items-center justify-center text-brand-gray"><Loader2 className="animate-spin mr-2" />Loading App...</div>; }
        if (!isAuthenticated || (isAuthenticated && onboardingStep !== 'complete') || appView === 'onboarding') { if (isAuthenticated && onboardingStep !== 'complete' && appView !== 'onboarding') { setAppView('onboarding'); return <div className="min-h-screen flex items-center justify-center text-brand-gray"><Loader2 className="animate-spin mr-2" />Loading Onboarding...</div>; } return renderOnboarding(); }
        if (isAuthenticated && currentUser && onboardingStep === 'complete') {
          if (appView === 'onboarding') { setAppView('dashboard'); return <div className="min-h-screen flex items-center justify-center text-brand-gray"><Loader2 className="animate-spin mr-2" />Redirecting...</div>; }
          const activeGymName = getGymNameById(activeGymId);
          // Determine if the bottom nav should be shown
          // Show nav unless on settings, addBeta, or routeDetail
          const showNavBar = !['settings', 'addBeta', 'routeDetail', 'log'].includes(appView);
          const navBar = showNavBar ? <BottomNavBar currentView={appView} onNavigate={handleNavigate} /> : null;
          let currentScreen;
          switch (appView) {
            case 'dashboard': currentScreen = <DashboardScreen currentUser={currentUser} selectedGyms={selectedGymIds} activeGymId={activeGymId} onSwitchGym={handleSwitchGym} getGymNameById={getGymNameById} onNavigateToGymSelection={handleNavigateToGymSelection} onNavigate={handleNavigate} />; break;
            case 'routes': currentScreen = <RoutesScreen currentUser={currentUser} activeGymId={activeGymId} activeGymName={activeGymName} onNavigate={handleNavigate} initialSearchTerm={initialSearchTerm} />; break;
            case 'routeDetail': currentScreen = <RouteDetailScreen currentUser={currentUser} route={selectedRouteData} isLoading={isLoadingRouteDetail} error={routeDetailError} onBack={handleBack} onNavigate={handleNavigate} />; break;
            case 'addBeta':
               if (isLoadingRouteDetail) { currentScreen = <div className="p-4 pt-16 text-center text-brand-gray"><Loader2 className="animate-spin mr-2" />Loading Route Info...</div>; }
               else if (routeDetailError || !selectedRouteData) { currentScreen = <div className="p-4 pt-16 text-center text-red-500">Error loading route context: {routeDetailError || 'Route not found.'} <button onClick={handleBack} className="underline">Go Back</button></div>; }
               else { currentScreen = <AddBetaScreen currentUser={currentUser} route={selectedRouteData} onBack={handleBack} onSubmitSuccess={handleBetaSubmitted} />; }
               break;
            case 'log':
              if (isLoadingActiveGymRoutes) { currentScreen = <div className="p-4 pt-16 text-center text-brand-gray"><Loader2 className="animate-spin mr-2" />Loading Routes...</div>; }
              else { currentScreen = <LogClimbScreen currentUser={currentUser} activeGymId={activeGymId} availableRoutes={activeGymRoutes} onBack={handleBack} onSubmitSuccess={handleLogSubmitted} />; }
              break;
            case 'discover':
              // Pass currentUser and onNavigate to DiscoverScreen
              currentScreen = <DiscoverScreen currentUser={currentUser} onNavigate={handleNavigate} />;
              break;
            case 'profile':
              // Pass viewingProfileId to ProfileScreen. If null, it defaults to showing currentUser's profile.
              currentScreen = <ProfileScreen
                                currentUser={currentUser}
                                viewingProfileId={viewingProfileId} // Pass the ID of the profile to view
                                onNavigate={handleNavigate}
                                getGymNameById={getGymNameById}
                              />;
              break;
            case 'settings': // Add case for settings
              currentScreen = <SettingsScreen currentUser={currentUser} userMetadata={userMetadata} onNavigate={handleNavigate} onLogout={handleLogout} onNavigateToGymSelection={handleNavigateToGymSelection} onBack={handleBack} />;
              break;
            default: setAppView('dashboard'); currentScreen = <DashboardScreen currentUser={currentUser} selectedGyms={selectedGymIds} activeGymId={activeGymId} onSwitchGym={handleSwitchGym} getGymNameById={getGymNameById} onNavigateToGymSelection={handleNavigateToGymSelection} onNavigate={handleNavigate} />;
          }
          return ( <div className="font-sans"> <div className={showNavBar ? "pb-16" : ""}> {currentScreen} </div> {navBar} </div> );
        }
        return renderOnboarding();
      }
      return renderApp();
    }
    export default App;
