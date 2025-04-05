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
    import PublicProfileScreen from './components/profile/PublicProfileScreen'; // Import PublicProfileScreen
    import DiscoverScreen from './components/discover/DiscoverScreen';
    import SettingsScreen from './components/settings/SettingsScreen';
    import BottomNavBar from './components/dashboard/BottomNavBar';
    import { AppView, RouteData, UserMetadata, GymData, LocationData, NavigationData } from './types';
    import { supabase } from './supabaseClient';
    import type { User } from '@supabase/supabase-js';
    import { Loader2 } from 'lucide-react';

    // --- Global State ---
    type OnboardingStep = 'welcome' | 'auth' | 'gymSelection' | 'complete';

    function App() {
      const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');
      const [appView, setAppView] = useState<AppView>('onboarding');
      const [previousAppView, setPreviousAppView] = useState<AppView>('dashboard');
      const [selectedGymIds, setSelectedGymIds] = useState<string[]>([]);
      const [activeGymId, setActiveGymId] = useState<string | null>(null);
      const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
      const [viewingProfileId, setViewingProfileId] = useState<string | null>(null); // ID of profile being viewed (own or public)
      const [isAuthenticated, setIsAuthenticated] = useState(false);
      const [currentUser, setCurrentUser] = useState<User | null>(null);
      const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
      const [gymDetails, setGymDetails] = useState<Map<string, GymData>>(new Map());
      const [isLoadingAuth, setIsLoadingAuth] = useState(true);
      const [isLoadingData, setIsLoadingData] = useState(false);
      const [isLoadingGymDetails, setIsLoadingGymDetails] = useState(false);
      const [initialSearchTerm, setInitialSearchTerm] = useState<string | undefined>(undefined);

      const [selectedRouteData, setSelectedRouteData] = useState<RouteData | null | undefined>(undefined);
      const [isLoadingRouteDetail, setIsLoadingRouteDetail] = useState(false);
      const [routeDetailError, setRouteDetailError] = useState<string | null>(null);

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
          // Add gym IDs from userMetadata if available (for profile screens)
          if (userMetadata?.selected_gym_ids) {
            userMetadata.selected_gym_ids.forEach(id => idsToFetchSet.add(id));
          }
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
      }, [activeGymId, selectedGymIds, userMetadata]); // Add userMetadata dependency


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
          setSelectedGymIds([]); setActiveGymId(null); setSelectedRouteId(null); setViewingProfileId(null);
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
            else { setIsLoadingData(true); setSelectedRouteData(undefined); setIsLoadingRouteDetail(false); setRouteDetailError(null); setInitialSearchTerm(undefined); setActiveGymRoutes([]); setIsLoadingActiveGymRoutes(false); setViewingProfileId(null); }
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


      // --- Effect for Fetching Selected Route Details ---
      useEffect(() => {
        const fetchRouteDetails = async () => {
          // Only fetch if we are on the correct view AND have a selectedRouteId
          if ((appView !== 'routeDetail' && appView !== 'addBeta') || !selectedRouteId) {
            // If not on the right view or no ID, ensure data is cleared ONLY IF it's not already loading
            // This prevents clearing data if we quickly navigate away and back while it's loading
            if (!isLoadingRouteDetail) {
              setSelectedRouteData(undefined);
              setRouteDetailError(null);
            }
            return;
          }

          console.log(`[Route Detail Effect] Fetching details for route ID: ${selectedRouteId} (View: ${appView})`);
          setIsLoadingRouteDetail(true);
          setRouteDetailError(null);
          setSelectedRouteData(undefined); // Clear previous data before fetching new

          try {
            const { data, error } = await supabase
              .from('routes')
              .select(`*, location_name:locations ( name )`)
              .eq('id', selectedRouteId)
              .single();

            if (error) {
              console.error('[Route Detail Effect] Error fetching route details:', error);
              setRouteDetailError(error.code === 'PGRST116' ? 'Route not found.' : `Failed to load route details: ${error.message}`);
              setSelectedRouteData(null); // Explicitly set to null on error
            } else if (data) {
              const mappedData: RouteData = { ...data, location_name: (data.location_name as any)?.name || null };
              console.log('[Route Detail Effect] Route details fetched successfully:', mappedData);
              setSelectedRouteData(mappedData);
            } else {
              console.warn('[Route Detail Effect] Route not found in DB (ID:', selectedRouteId, ')');
              setRouteDetailError('Route not found.');
              setSelectedRouteData(null); // Explicitly set to null if not found
            }
          } catch (err) {
            console.error("[Route Detail Effect] Unexpected error fetching route details:", err);
            setRouteDetailError("An unexpected error occurred while fetching route details.");
            setSelectedRouteData(null); // Explicitly set to null on catch
          } finally {
            setIsLoadingRouteDetail(false);
          }
        };

        fetchRouteDetails();
        // This effect should run whenever the selectedRouteId changes OR when the appView changes
        // to 'routeDetail' or 'addBeta' (provided selectedRouteId is set).
      }, [selectedRouteId, appView]);


      // --- Effect for Fetching Routes for the Active Gym (for Log Screen) ---
      useEffect(() => {
        const fetchActiveGymRoutes = async () => {
          if (!activeGymId || appView !== 'log') {
            setActiveGymRoutes([]); setIsLoadingActiveGymRoutes(false); return;
          }
          setIsLoadingActiveGymRoutes(true);
          try {
            const { data, error } = await supabase
              .from('routes')
              .select(`id, gym_id, name, grade, grade_color, date_set, location_id, location_name:locations ( name )`)
              .eq('gym_id', activeGymId)
              .order('name', { ascending: true });

            if (error) {
              console.error('[Active Gym Routes Effect] Error fetching routes:', error); setActiveGymRoutes([]);
            } else {
              const mappedRoutes = data.map(r => ({ ...r, location_name: (r.location_name as any)?.name || null }));
              setActiveGymRoutes(mappedRoutes as RouteData[]);
            }
          } catch (err) {
            console.error("[Active Gym Routes Effect] Unexpected error:", err); setActiveGymRoutes([]);
          } finally {
            setIsLoadingActiveGymRoutes(false);
          }
        };
        fetchActiveGymRoutes();
      }, [activeGymId, appView]);


      // --- Update previous view state ---
      // This effect tracks the *last main screen* before navigating to a detail/modal screen.
      useEffect(() => {
        const viewsToIgnoreForBack = ['log', 'settings', 'addBeta', 'publicProfile', 'profile']; // Views that shouldn't overwrite previousAppView
        // Only update previousAppView if the *new* appView is NOT one to ignore
        if (!viewsToIgnoreForBack.includes(appView)) {
          setPreviousAppView(appView);
        }
      }, [appView]); // Only depends on appView


      // --- Navigation and Action Handlers ---
      const handleNavigate = (view: AppView, data?: NavigationData) => {
        console.log(`Navigating to: ${view}`, data);

        // Store the current view before changing if it's a main view
        // Let the useEffect handle this

        // Reset states based on target view *unless* data provides the ID
        // REMOVED: Explicit clearing of selectedRouteId here. Let the effect handle data clearing.
        // if (view !== 'routeDetail' && view !== 'addBeta' && !data?.routeId) {
        //   console.log("Clearing selectedRouteId because navigating away from detail/beta without new ID");
        //   setSelectedRouteId(null);
        // }
        if (view !== 'routes' && !data?.searchTerm) {
          setInitialSearchTerm(undefined);
        }
        if (view !== 'profile' && view !== 'publicProfile' && !data?.profileUserId) {
          setViewingProfileId(null);
        }

        // Set states based on incoming data
        if (data?.routeId && (view === 'routeDetail' || view === 'addBeta')) {
          console.log("Setting selectedRouteId from navigation data:", data.routeId);
          setSelectedRouteId(data.routeId);
          // Don't clear route data here, let the effect fetch it based on the new ID
        }
        if (data?.searchTerm && view === 'routes') {
          setInitialSearchTerm(data.searchTerm);
        }
        if (data?.profileUserId && (view === 'profile' || view === 'publicProfile')) {
          setViewingProfileId(data.profileUserId);
        }

        // Finally, set the new view
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
        console.log(`HandleBack called. Current view: ${appView}, Previous view: ${previousAppView}`);
        if (appView === 'routeDetail' || appView === 'addBeta') {
          console.log("Back from routeDetail/addBeta -> routes");
          setAppView('routes');
          setSelectedRouteId(null); // Clear ID when going back to the list INTENTIONALLY
        }
        else if (appView === 'routes') {
          console.log("Back from routes -> dashboard");
          setAppView('dashboard');
          setInitialSearchTerm(undefined);
        }
        else if (appView === 'log' || appView === 'settings' || appView === 'profile' || appView === 'publicProfile') {
          console.log(`Back from ${appView} -> ${previousAppView}`);
          // When going back from these views, restore the previous main view.
          // The fetch effect for routeDetail will re-run if previousAppView is 'routeDetail'
          // because appView changes back to it. selectedRouteId should still be set.
          setAppView(previousAppView);
          if (appView === 'profile' || appView === 'publicProfile') {
            setViewingProfileId(null); // Clear the viewing ID when leaving profile views
          }
        }
        else if (appView === 'discover') {
          console.log("Back from discover -> dashboard");
          setAppView('dashboard');
        }
        else if (appView === 'onboarding' && onboardingStep === 'gymSelection') {
          console.log("Back from gymSelection -> auth");
          setOnboardingStep('auth');
        }
        else if (appView === 'onboarding' && onboardingStep === 'gymSelection' && isAuthenticated && userMetadata?.selected_gym_ids && userMetadata.selected_gym_ids.length > 0) {
          console.log("Back from gymSelection (already onboarded) -> dashboard");
          setAppView('dashboard');
          setOnboardingStep('complete');
        }
        else {
          console.log("Back from unknown/default -> dashboard");
          setAppView('dashboard'); // Default back to dashboard
        }
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
          // Show nav unless on settings, addBeta, routeDetail, log, or publicProfile
          const showNavBar = !['settings', 'addBeta', 'routeDetail', 'log', 'publicProfile'].includes(appView);
          const navBar = showNavBar ? <BottomNavBar currentView={appView} onNavigate={handleNavigate} /> : null;
          let currentScreen;
          switch (appView) {
            case 'dashboard': currentScreen = <DashboardScreen currentUser={currentUser} selectedGyms={selectedGymIds} activeGymId={activeGymId} onSwitchGym={handleSwitchGym} getGymNameById={getGymNameById} onNavigateToGymSelection={handleNavigateToGymSelection} onNavigate={handleNavigate} />; break;
            case 'routes': currentScreen = <RoutesScreen currentUser={currentUser} activeGymId={activeGymId} activeGymName={activeGymName} onNavigate={handleNavigate} initialSearchTerm={initialSearchTerm} />; break;
            case 'routeDetail':
              // Pass the fetched data, loading state, and error state down
              currentScreen = <RouteDetailScreen
                                currentUser={currentUser}
                                route={selectedRouteData} // Pass the fetched data (can be null/undefined)
                                isLoading={isLoadingRouteDetail} // Pass the loading state
                                error={routeDetailError} // Pass the error state
                                onBack={handleBack}
                                onNavigate={handleNavigate}
                              />;
              break;
            case 'addBeta':
               // AddBeta also needs the route data
               if (isLoadingRouteDetail) { currentScreen = <div className="p-4 pt-16 text-center text-brand-gray"><Loader2 className="animate-spin mr-2" />Loading Route Info...</div>; }
               else if (routeDetailError || !selectedRouteData) { currentScreen = <div className="p-4 pt-16 text-center text-red-500">Error loading route context: {routeDetailError || 'Route not found.'} <button onClick={handleBack} className="underline">Go Back</button></div>; }
               else { currentScreen = <AddBetaScreen currentUser={currentUser} route={selectedRouteData} onBack={handleBack} onSubmitSuccess={handleBetaSubmitted} />; }
               break;
            case 'log':
              if (isLoadingActiveGymRoutes) { currentScreen = <div className="p-4 pt-16 text-center text-brand-gray"><Loader2 className="animate-spin mr-2" />Loading Routes...</div>; }
              else { currentScreen = <LogClimbScreen currentUser={currentUser} activeGymId={activeGymId} availableRoutes={activeGymRoutes} onBack={handleBack} onSubmitSuccess={handleLogSubmitted} />; }
              break;
            case 'discover':
              currentScreen = <DiscoverScreen currentUser={currentUser} onNavigate={handleNavigate} />;
              break;
            case 'profile': // User's own profile
              currentScreen = <ProfileScreen
                                currentUser={currentUser}
                                viewingProfileId={null} // Explicitly null for own profile
                                onNavigate={handleNavigate}
                                getGymNameById={getGymNameById}
                              />;
              break;
            case 'publicProfile': // Viewing another user's profile
              if (!viewingProfileId) {
                console.error("Error: viewingProfileId is missing for publicProfile view.");
                setAppView('discover'); // Go back to discover or dashboard
                currentScreen = <div className="p-4 pt-16 text-center text-red-500">Error: Profile ID missing.</div>;
              } else {
                currentScreen = <PublicProfileScreen
                                  currentUser={currentUser} // Pass logged-in user for follow button logic
                                  viewingProfileId={viewingProfileId} // Pass the ID of the profile to view
                                  onNavigate={handleNavigate}
                                  getGymNameById={getGymNameById}
                                  onBack={handleBack} // Pass handleBack
                                />;
              }
              break;
            case 'settings':
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
