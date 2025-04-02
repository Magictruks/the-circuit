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
import BottomNavBar from './components/dashboard/BottomNavBar';
import { AppView, RouteData, UserMetadata, GymData } from './types';
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';
import { Loader2 } from 'lucide-react'; // Import Loader

// --- Placeholder Data --- (Keep existing data for now, except route detail)
const placeholderRoutes: RouteData[] = [
  // Keep this for LogClimbScreen for now, but RouteDetailScreen will use fetched data
  { id: 'r1', gym_id: 'g1', name: 'Crimson Dyno', grade: 'V5', grade_color: 'accent-red', location: 'Overhang Cave', setter: 'Admin', date_set: '2024-03-10', status: 'sent', betaAvailable: true, description: 'Explosive move off the starting holds to a big jug.', image_url: 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 'r2', gym_id: 'g1', name: 'Blue Traverse', grade: 'V3', grade_color: 'accent-blue', location: 'Slab Wall', setter: 'Admin', date_set: '2024-03-08', status: 'attempted', betaAvailable: false, description: 'Technical footwork required on small holds.' },
  { id: 'r3', gym_id: 'g1', name: 'Sunshine Arete', grade: 'V4', grade_color: 'accent-yellow', location: 'Main Boulder', setter: 'Jane D.', date_set: '2024-03-05', status: 'unseen', betaAvailable: true, description: 'Balancey moves up the arete feature.', image_url: 'https://images.unsplash.com/photo-1610414870675-5579095849e1?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 'r4', gym_id: 'g1', name: 'Green Slab Master', grade: 'V2', grade_color: 'brand-green', location: 'Slab Wall', setter: 'Admin', date_set: '2024-03-01', status: 'sent', betaAvailable: false },
  { id: 'r5', gym_id: 'g1', name: 'Purple Pain', grade: 'V6', grade_color: 'accent-purple', location: 'Overhang Cave', setter: 'Mike R.', date_set: '2024-02-28', status: 'unseen', betaAvailable: true },
  { id: 'r6', gym_id: 'g1', name: 'The Gray Crack', grade: 'V1', grade_color: 'brand-gray', location: 'Training Area', setter: 'Admin', date_set: '2024-02-25', status: 'attempted', betaAvailable: false },
];
// Remove getRouteById - we will fetch directly
// const getRouteById = (id: string | null): RouteData | undefined => placeholderRoutes.find(route => route.id === id);

// --- Global State ---
type OnboardingStep = 'welcome' | 'auth' | 'gymSelection' | 'complete';

function App() {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');
  const [appView, setAppView] = useState<AppView>('onboarding');
  const [previousAppView, setPreviousAppView] = useState<AppView>('dashboard');
  const [selectedGymIds, setSelectedGymIds] = useState<string[]>([]);
  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  const [gymDetails, setGymDetails] = useState<Map<string, GymData>>(new Map());
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [isLoadingGymDetails, setIsLoadingGymDetails] = useState(false);

  // State for fetched route details
  const [selectedRouteData, setSelectedRouteData] = useState<RouteData | null | undefined>(undefined); // undefined: not fetched, null: error/not found
  const [isLoadingRouteDetail, setIsLoadingRouteDetail] = useState(false);
  const [routeDetailError, setRouteDetailError] = useState<string | null>(null);


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

      if (idsToFetch.length === 0) {
        setGymDetails(new Map());
        return;
      }

      setIsLoadingGymDetails(true);
      try {
        const { data, error } = await supabase
            .from('gyms')
            .select('id, name, city, state, country')
            .in('id', idsToFetch);

        if (error) {
          console.error('[Gym Details Effect] Error fetching gym details:', error);
          setGymDetails(new Map());
        } else if (data) {
          const newDetails = new Map<string, GymData>();
          data.forEach(gym => newDetails.set(gym.id, gym));
          setGymDetails(newDetails);
        }
      } catch (err) {
        console.error("[Gym Details Effect] Unexpected error fetching gym details:", err);
        setGymDetails(new Map());
      } finally {
        setIsLoadingGymDetails(false);
      }
    };
    // Fetch only when activeGymId changes (or selectedGymIds, but active is primary trigger)
    fetchGymDetails();
  }, [activeGymId, selectedGymIds]); // Depend on selectedGymIds as well


  // --- User Data Fetching ---
  const fetchUserMetadata = useCallback(async (userId: string): Promise<UserMetadata | null> => {
    console.log("[fetchUserMetadata] Fetching metadata for user:", userId);
    setIsLoadingData(true);
    let metadataResult: UserMetadata | null = null;
    try {
      const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('user_id', userId)
          .single();

      if (error && error.code !== 'PGRST116') {
        console.error('[fetchUserMetadata] Error fetching user metadata:', error.message);
        setUserMetadata(null); setSelectedGymIds([]); setActiveGymId(null);
      } else if (data) {
        console.log("[fetchUserMetadata] User metadata fetched successfully:", data);
        setUserMetadata(data); metadataResult = data;
        const fetchedGymIds = data.selected_gym_ids || [];
        const fetchedCurrentGym = data.current_gym_id || null;
        setSelectedGymIds(fetchedGymIds);
        const newActiveGym = fetchedCurrentGym || (fetchedGymIds.length > 0 ? fetchedGymIds[0] : null);
        setActiveGymId(newActiveGym); // Set active gym based on fetched data
        if (fetchedGymIds.length > 0) {
          setOnboardingStep('complete');
          setAppView(prev => prev === 'onboarding' ? 'dashboard' : prev);
        } else {
          setOnboardingStep('gymSelection'); setAppView('onboarding');
        }
      } else {
        console.log("[fetchUserMetadata] No user metadata found for user:", userId);
        setUserMetadata(null); setSelectedGymIds([]); setActiveGymId(null);
        setOnboardingStep('gymSelection'); setAppView('onboarding');
      }
    } catch (err) {
      console.error("[fetchUserMetadata] Unexpected error during fetch:", err);
      setUserMetadata(null); setSelectedGymIds([]); setActiveGymId(null);
      setOnboardingStep('gymSelection'); setAppView('onboarding');
    } finally {
      setIsLoadingData(false);
    }
    return metadataResult;
  }, []);


  // --- Authentication Handling ---
  useEffect(() => {
    let isMounted = true;
    setIsLoadingAuth(true);
    const handleLogoutCleanup = () => {
      if (!isMounted) return;
      setIsAuthenticated(false); setCurrentUser(null); setUserMetadata(null);
      setSelectedGymIds([]); setActiveGymId(null); setSelectedRouteId(null);
      setGymDetails(new Map()); setAppView('onboarding'); setOnboardingStep('auth');
      setPreviousAppView('dashboard'); setIsLoadingData(false); setIsLoadingGymDetails(false);
      // Clear route detail state on logout
      setSelectedRouteData(undefined); setIsLoadingRouteDetail(false); setRouteDetailError(null);
    };

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        setCurrentUser(session?.user ?? null); setIsAuthenticated(!!session?.user);
        if (!session?.user) handleLogoutCleanup();
        setIsLoadingAuth(false);
      }
    }).catch(error => {
      console.error("[Auth Effect] Error getting initial session:", error);
      if (isMounted) { handleLogoutCleanup(); setIsLoadingAuth(false); }
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!isMounted) return;
      const currentUserIdInClosure = currentUser?.id;
      const userChanged = session?.user?.id !== currentUserIdInClosure;
      const loggingOut = !session?.user && !!currentUserIdInClosure;

      if (userChanged || loggingOut) {
        setCurrentUser(session?.user ?? null); setIsAuthenticated(!!session?.user);
        if (!session?.user) {
          handleLogoutCleanup();
        } else {
          setIsLoadingData(true); // Trigger user metadata fetch for new user
          // Clear route detail state when user changes
          setSelectedRouteData(undefined); setIsLoadingRouteDetail(false); setRouteDetailError(null);
        }
      }
    });

    return () => { isMounted = false; authListener?.subscription.unsubscribe(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);


  // --- Effect for Fetching User Data based on Current User ---
  useEffect(() => {
    let isMounted = true;
    if (currentUser && !isLoadingAuth) {
      fetchUserMetadata(currentUser.id).catch(error => {
        console.error("[Data Fetch Effect] Error during metadata fetch:", error);
      });
    } else if (!currentUser) {
      setIsLoadingData(false);
    }
    return () => { isMounted = false; };
  }, [currentUser, fetchUserMetadata, isLoadingAuth]);


  // --- Effect for Fetching Selected Route Details ---
  useEffect(() => {
    const fetchRouteDetails = async () => {
      if (!selectedRouteId) {
        setSelectedRouteData(undefined); // Clear data if no ID
        setIsLoadingRouteDetail(false);
        setRouteDetailError(null);
        return;
      }

      console.log(`[Route Detail Effect] Fetching details for route ID: ${selectedRouteId}`);
      setIsLoadingRouteDetail(true);
      setRouteDetailError(null);
      setSelectedRouteData(undefined); // Clear previous data while loading

      try {
        const { data, error } = await supabase
          .from('routes')
          .select('*') // Select all columns
          .eq('id', selectedRouteId) // Filter by the selected route ID
          .single(); // Expect only one result

        if (error) {
          console.error('[Route Detail Effect] Error fetching route details:', error);
          if (error.code === 'PGRST116') { // Not found code
            setRouteDetailError('Route not found.');
          } else {
            setRouteDetailError(`Failed to load route details: ${error.message}`);
          }
          setSelectedRouteData(null); // Indicate error/not found
        } else if (data) {
          console.log('[Route Detail Effect] Route details fetched successfully:', data);
          // Map data if needed (e.g., snake_case to camelCase)
          // Supabase client might handle this, but explicit mapping is safer
          const mappedData: RouteData = {
            ...data,
            // Ensure field names match RouteData type if necessary
            // gradeColor: data.grade_color,
            // dateSet: data.date_set,
            // imageUrl: data.image_url,
            // Add placeholder status/beta for UI compatibility until implemented
            status: 'unseen', // Placeholder
            betaAvailable: Math.random() > 0.5, // Placeholder
          };
          setSelectedRouteData(mappedData);
        } else {
          // Should be covered by error handling, but as a fallback
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

    // Only fetch when the view is 'routeDetail' or 'addBeta' and an ID is selected
    if ((appView === 'routeDetail' || appView === 'addBeta') && selectedRouteId) {
        fetchRouteDetails();
    } else {
        // Clear details if navigating away or no ID selected
        setSelectedRouteData(undefined);
        setIsLoadingRouteDetail(false);
        setRouteDetailError(null);
    }

  }, [selectedRouteId, appView]); // Re-run when selectedRouteId or appView changes


  // Update previous view state
  useEffect(() => {
    setPreviousAppView(currentView => (appView !== 'log' ? appView : currentView));
  }, [appView]);


  // --- Navigation and Action Handlers ---

  const handleNavigate = (view: AppView, routeId?: string) => {
    console.log("Navigating to:", view, "Route ID:", routeId);
    // Set route ID *before* changing view to trigger fetch effect
    if ((view === 'routeDetail' || view === 'addBeta') && routeId) {
      setSelectedRouteId(routeId);
    } else if (view !== 'routeDetail' && view !== 'addBeta') {
      // Clear route ID if navigating away from detail/addBeta views
      setSelectedRouteId(null);
    }
    setAppView(view);
  };

  const handleNavigateToGymSelection = () => {
    setActiveGymId(null); setAppView('onboarding'); setOnboardingStep('gymSelection');
  };

  const persistGymSelection = async (userId: string, gymsToSave: string[], currentGym: string | null) => {
    setIsLoadingData(true);
    try {
      const { error } = await supabase.from('profiles').upsert({
        user_id: userId, selected_gym_ids: gymsToSave, current_gym_id: currentGym
      }, { onConflict: 'user_id' });

      if (error) {
        console.error('Error saving selected gyms (upsert):', error);
        alert(`Error saving gym selection: ${error.message}`);
        await fetchUserMetadata(userId); // Revert state on error
      } else {
        setSelectedGymIds(gymsToSave); setActiveGymId(currentGym);
        setUserMetadata(prev => prev ? { ...prev, selected_gym_ids: gymsToSave, current_gym_id: currentGym } : {
          user_id: userId, display_name: currentUser?.user_metadata?.display_name || 'Climber',
          selected_gym_ids: gymsToSave, current_gym_id: currentGym,
          created_at: new Date().toISOString(), updated_at: new Date().toISOString(),
        });
        setOnboardingStep('complete'); setAppView('dashboard');
      }
    } catch (err) {
      console.error("Unexpected error persisting gym selection:", err);
      alert("An unexpected error occurred while saving your gym selection.");
      if (currentUser) await fetchUserMetadata(currentUser.id);
    } finally {
      setIsLoadingData(false);
    }
  };

  const handleGymSelectionComplete = async () => {
    if (selectedGymIds.length > 0 && currentUser) {
      const firstGym = selectedGymIds[0];
      const currentGymToSet = activeGymId && selectedGymIds.includes(activeGymId) ? activeGymId : firstGym;
      await persistGymSelection(currentUser.id, selectedGymIds, currentGymToSet);
    } else if (!currentUser) {
      alert("Error: User session not found. Please try logging in again."); handleLogout();
    } else {
      alert("Please select at least one gym.");
    }
  };

  const handleGymSelectionChange = (gymIds: string[]) => { setSelectedGymIds(gymIds); };

  const handleAuthSuccess = () => { setIsLoadingData(true); };

  const handleSwitchGym = async (gymId: string) => {
    if (currentUser && gymId !== activeGymId) {
      const previousActiveGymId = activeGymId;
      setActiveGymId(gymId); setAppView('dashboard'); setSelectedRouteId(null);
      setIsLoadingData(true);
      try {
        const { error } = await supabase.from('profiles').update({ current_gym_id: gymId }).eq('user_id', currentUser.id);
        if (error) {
          console.error('Error updating current gym:', error);
          setActiveGymId(previousActiveGymId); alert(`Failed to switch gym: ${error.message}`);
        } else {
          setUserMetadata(prev => prev ? { ...prev, current_gym_id: gymId } : null);
        }
      } catch (err) {
        console.error("Unexpected error switching gym:", err);
        setActiveGymId(previousActiveGymId); alert("An unexpected error occurred while switching gyms.");
      } finally {
        setIsLoadingData(false);
      }
    }
  };

  const handleBack = () => {
    if (appView === 'routeDetail' || appView === 'addBeta') { setAppView('routes'); setSelectedRouteId(null); } // Clear ID on back
    else if (appView === 'routes') { setAppView('dashboard'); }
    else if (appView === 'log') { setAppView(previousAppView); }
    else if (appView === 'profile' || appView === 'discover') { setAppView('dashboard'); }
    else if (appView === 'onboarding' && onboardingStep === 'gymSelection') { setOnboardingStep('auth'); }
    else if (appView === 'onboarding' && onboardingStep === 'gymSelection' && isAuthenticated && userMetadata?.selected_gym_ids && userMetadata.selected_gym_ids.length > 0) {
      setAppView('dashboard'); setOnboardingStep('complete');
    }
  };

  const handleBetaSubmitted = () => {
    // Stay on route detail after submitting beta
    setAppView('routeDetail');
    // Optionally trigger a refresh of beta data here
  };

  const handleLogSubmitted = () => { setAppView(previousAppView); };

  const handleLogout = async () => {
    setIsLoadingAuth(true);
    const { error } = await supabase.auth.signOut();
    if (error) {
      alert(`Logout failed: ${error.message}`); setIsLoadingAuth(false);
    }
    // Cleanup handled by listener
  };


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
    // --- Loading State ---
    const showLoading = isLoadingAuth || (isAuthenticated && (isLoadingData || isLoadingGymDetails));
    if (showLoading) {
      return <div className="min-h-screen flex items-center justify-center text-brand-gray"><Loader2 className="animate-spin mr-2" />Loading App...</div>;
    }

    // --- Onboarding Flow ---
    if (!isAuthenticated || (isAuthenticated && onboardingStep !== 'complete') || appView === 'onboarding') {
      if (isAuthenticated && onboardingStep !== 'complete' && appView !== 'onboarding') {
        setAppView('onboarding');
        return <div className="min-h-screen flex items-center justify-center text-brand-gray"><Loader2 className="animate-spin mr-2" />Loading Onboarding...</div>;
      }
      return renderOnboarding();
    }

    // --- Authenticated App Flow ---
    if (isAuthenticated && currentUser && onboardingStep === 'complete') {
      if (appView === 'onboarding') {
        setAppView('dashboard');
        return <div className="min-h-screen flex items-center justify-center text-brand-gray"><Loader2 className="animate-spin mr-2" />Redirecting...</div>;
      }

      const activeGymName = getGymNameById(activeGymId);
      const showNavBar = ['dashboard', 'routes', 'log', 'discover', 'profile'].includes(appView);
      const navBar = showNavBar ? <BottomNavBar currentView={appView} onNavigate={handleNavigate} /> : null;

      let currentScreen;
      switch (appView) {
        case 'dashboard':
          currentScreen = <DashboardScreen selectedGyms={selectedGymIds} activeGymId={activeGymId} onSwitchGym={handleSwitchGym} getGymNameById={getGymNameById} onNavigateToGymSelection={handleNavigateToGymSelection} />;
          break;
        case 'routes':
          currentScreen = <RoutesScreen activeGymId={activeGymId} activeGymName={activeGymName} onNavigate={handleNavigate} />;
          break;
        case 'routeDetail':
          // Pass fetched data, loading state, and error state to RouteDetailScreen
          currentScreen = <RouteDetailScreen
              route={selectedRouteData} // Can be RouteData | null | undefined
              isLoading={isLoadingRouteDetail}
              error={routeDetailError}
              onBack={handleBack}
              onNavigate={handleNavigate}
          />;
          break;
        case 'addBeta':
           // Pass fetched data (or handle loading/error if needed for context)
           if (isLoadingRouteDetail) {
               currentScreen = <div className="p-4 pt-16 text-center text-brand-gray"><Loader2 className="animate-spin mr-2" />Loading Route Info...</div>;
           } else if (routeDetailError || !selectedRouteData) {
               currentScreen = <div className="p-4 pt-16 text-center text-red-500">Error loading route context: {routeDetailError || 'Route not found.'} <button onClick={handleBack} className="underline">Go Back</button></div>;
           } else {
               currentScreen = <AddBetaScreen route={selectedRouteData} onBack={handleBack} onSubmitSuccess={handleBetaSubmitted} />;
           }
           break;
        case 'log':
          currentScreen = <LogClimbScreen availableRoutes={placeholderRoutes} onBack={handleBack} onSubmitSuccess={handleLogSubmitted} />;
          break;
        case 'discover':
          currentScreen = <DiscoverScreen />;
          break;
        case 'profile':
          currentScreen = <ProfileScreen currentUser={currentUser} userMetadata={userMetadata} onNavigate={handleNavigate} onLogout={handleLogout} getGymNameById={getGymNameById} />;
          break;
        default:
          setAppView('dashboard');
          currentScreen = <DashboardScreen selectedGyms={selectedGymIds} activeGymId={activeGymId} onSwitchGym={handleSwitchGym} getGymNameById={getGymNameById} onNavigateToGymSelection={handleNavigateToGymSelection} />;
      }

      return (
          <div className="font-sans">
            <div className={showNavBar ? "pb-16" : ""}> {currentScreen} </div>
            {navBar}
          </div>
      );
    }

    // Fallback
    return renderOnboarding();
  }

  return renderApp();
}

export default App;
