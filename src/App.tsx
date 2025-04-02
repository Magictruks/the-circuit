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
import { AppView, RouteData, UserMetadata, GymData } from './types'; // Import UserMetadata, GymData
import { supabase } from './supabaseClient';
import type { User } from '@supabase/supabase-js';

// --- Placeholder Data --- (Keep existing data for now)
const placeholderRoutes: RouteData[] = [
  { id: 'r1', name: 'Crimson Dyno', grade: 'V5', gradeColor: 'accent-red', location: 'Overhang Cave', setter: 'Admin', dateSet: '2024-03-10', status: 'sent', betaAvailable: true, description: 'Explosive move off the starting holds to a big jug.', imageUrl: 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 'r2', name: 'Blue Traverse', grade: 'V3', gradeColor: 'accent-blue', location: 'Slab Wall', setter: 'Admin', dateSet: '2024-03-08', status: 'attempted', betaAvailable: false, description: 'Technical footwork required on small holds.' },
  { id: 'r3', name: 'Sunshine Arete', grade: 'V4', gradeColor: 'accent-yellow', location: 'Main Boulder', setter: 'Jane D.', dateSet: '2024-03-05', status: 'unseen', betaAvailable: true, description: 'Balancey moves up the arete feature.', imageUrl: 'https://images.unsplash.com/photo-1610414870675-5579095849e1?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 'r4', name: 'Green Slab Master', grade: 'V2', gradeColor: 'brand-green', location: 'Slab Wall', setter: 'Admin', dateSet: '2024-03-01', status: 'sent', betaAvailable: false },
  { id: 'r5', name: 'Purple Pain', grade: 'V6', gradeColor: 'accent-purple', location: 'Overhang Cave', setter: 'Mike R.', dateSet: '2024-02-28', status: 'unseen', betaAvailable: true },
  { id: 'r6', name: 'The Gray Crack', grade: 'V1', gradeColor: 'brand-gray', location: 'Training Area', setter: 'Admin', dateSet: '2024-02-25', status: 'attempted', betaAvailable: false },
];
const getRouteById = (id: string | null): RouteData | undefined => placeholderRoutes.find(route => route.id === id);

// --- Global State ---
type OnboardingStep = 'welcome' | 'auth' | 'gymSelection' | 'complete';

function App() {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');
  const [appView, setAppView] = useState<AppView>('onboarding');
  const [previousAppView, setPreviousAppView] = useState<AppView>('dashboard');
  const [selectedGymIds, setSelectedGymIds] = useState<string[]>([]); // Renamed from selectedGyms
  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null); // State for user metadata
  const [gymDataCache, setGymDataCache] = useState<Map<string, GymData>>(new Map()); // Cache for gym details
  const [isLoadingUser, setIsLoadingUser] = useState(true); // Loading state for initial user fetch

  // --- Utility Functions ---
  const getGymNameById = useCallback((id: string | null): string => {
    if (!id) return 'Unknown Gym';
    return gymDataCache.get(id)?.name || 'Loading Gym...';
  }, [gymDataCache]);

  // Fetch details for a list of gym IDs and update cache
  const fetchAndCacheGymDetails = useCallback(async (gymIds: string[]) => {
    if (gymIds.length === 0) return;

    const idsToFetch = gymIds.filter(id => !gymDataCache.has(id));
    if (idsToFetch.length === 0) return; // All needed gyms are already cached

    console.log("Fetching details for gym IDs:", idsToFetch);
    const { data, error } = await supabase
      .from('gyms')
      .select('id, name, city, state, country')
      .in('id', idsToFetch);

    if (error) {
      console.error('Error fetching gym details:', error);
    } else if (data) {
      setGymDataCache(prevCache => {
        const newCache = new Map(prevCache);
        data.forEach(gym => newCache.set(gym.id, gym));
        return newCache;
      });
    }
  }, [gymDataCache]); // Dependency on cache

  // --- User Authentication and Data Fetching ---
  const fetchUserMetadata = useCallback(async (userId: string) => {
    console.log("Fetching metadata for user:", userId);
    const { data, error } = await supabase
      .from('user_metadata')
      .select('*')
      .eq('user_id', userId)
      .single(); // Expect only one row per user

    console.log("Fetched metadata:", data, "Error:", error);

    if (error && error.code !== 'PGRST116') { // Ignore 'PGRST116' (No rows found) error initially
      console.error('Error fetching user metadata:', error);
      setUserMetadata(null); // Clear metadata on error
      return null;
    } else if (data) {
      console.log("User metadata fetched:", data);
      setUserMetadata(data);
      // Update local state based on fetched metadata
      setSelectedGymIds(data.selected_gym_ids || []);
      setActiveGymId(data.current_gym_id || (data.selected_gym_ids?.length > 0 ? data.selected_gym_ids[0] : null));
      // Fetch details for the gyms found in metadata
      fetchAndCacheGymDetails([...(data.selected_gym_ids || []), data.current_gym_id].filter(Boolean) as string[]);
      return data; // Return fetched data
    } else {
        console.log("No user metadata found for user:", userId);
        setUserMetadata(null); // No metadata found
        return null;
    }
  }, [fetchAndCacheGymDetails]); // Dependency on fetchAndCacheGymDetails

  // Effect for handling auth state changes and fetching initial data
  useEffect(() => {
    setIsLoadingUser(true); // Start loading
    console.log("Auth effect running. Current appView:", appView);

    const fetchInitialData = async (user: User) => {
      console.log("Fetching initial data for user:", user.id);
      setCurrentUser(user);
      setIsAuthenticated(true);
      const metadata = await fetchUserMetadata(user.id);

      if (metadata && metadata.selected_gym_ids && metadata.selected_gym_ids.length > 0) {
        console.log("User has completed onboarding.");
        setOnboardingStep('complete');
        // Navigate to dashboard only if currently in onboarding or initial load state
        if (appView === 'onboarding') {
            setAppView('dashboard');
        }
      } else {
        console.log("User exists but hasn't completed gym selection");
        // User exists but hasn't completed gym selection
        setOnboardingStep('gymSelection');
        setAppView('onboarding'); // Stay in onboarding flow
      }
      setIsLoadingUser(false); // Finish loading
    };

    const handleLogoutCleanup = () => {
      console.log("Cleaning up on logout");
      setIsAuthenticated(false);
      setCurrentUser(null);
      setUserMetadata(null);
      setSelectedGymIds([]);
      setActiveGymId(null);
      setSelectedRouteId(null);
      setAppView('onboarding');
      setOnboardingStep('auth'); // Go to auth screen after logout
      setPreviousAppView('dashboard');
      setIsLoadingUser(false); // Finish loading
    };

    // Check initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        console.log("Initial session found for user:", session.user.id);
        fetchInitialData(session.user);
      } else {
        console.log("No initial session found.");
        handleLogoutCleanup(); // Ensure clean state if no session
      }
    });

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      console.log("Auth state changed:", _event, "User:", session?.user?.id);
      const user = session?.user ?? null;

      console.log("Current user:", currentUser?.id, "New user:", user?.id);

      if (user) {
        // User logged in or session refreshed
        // Avoid redundant fetches if user hasn't changed
        if (user.id !== currentUser?.id) {
            setIsLoadingUser(true); // Start loading for new user data
            await fetchInitialData(user);
        } else {
            // User is the same, maybe just a token refresh, ensure state is consistent
            setIsAuthenticated(true);
            // Optionally re-fetch metadata if needed, or trust existing state
            // await fetchUserMetadata(user.id); // Uncomment if refresh needed
            setIsLoadingUser(false); // Finish loading if no fetch needed
        }
      } else {
        // User logged out
        if (isAuthenticated) { // Only cleanup if state was previously authenticated
            handleLogoutCleanup();
        } else {
            setIsLoadingUser(false); // Ensure loading stops if already logged out
        }
      }
    });

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
    // Dependencies: fetchUserMetadata, appView, currentUser?.id, isAuthenticated
  }, [fetchUserMetadata, appView, currentUser?.id, isAuthenticated]);


  // Update previous view state
  useEffect(() => {
    setPreviousAppView(currentView => (appView !== 'log' ? appView : currentView));
  }, [appView]);

  // --- Navigation and Action Handlers ---

  const handleNavigate = (view: AppView, routeId?: string) => {
    console.log("Navigating to:", view, routeId);
    if ((view === 'routeDetail' || view === 'addBeta') && routeId) {
      setSelectedRouteId(routeId);
    } else if (view !== 'routeDetail' && view !== 'addBeta') {
      setSelectedRouteId(null);
    }
    setAppView(view);
  };

  // Persist gym selection to user_metadata
  const persistGymSelection = async (userId: string, gymsToSave: string[], currentGym: string | null) => {
    console.log("Persisting gym selection:", gymsToSave, "Current:", currentGym);

    // Check if user_metadata row exists, insert if not (upsert)
    const { data: existingMetadata } = await supabase
      .from('user_metadata')
      .select('user_id')
      .eq('user_id', userId)
      .single();

    let error;
    if (!existingMetadata) {
      console.log("No existing metadata found, inserting new row.");
       const response = await supabase
          .from('user_metadata')
            .insert([{ user_id: userId, selected_gym_ids: gymsToSave, current_gym_id: currentGym }]);
         error = response.error;
    } else {
        console.log("Existing metadata found, updating selected gyms.");
         const response = await supabase
             .from('user_metadata')
                .update({ selected_gym_ids: gymsToSave, current_gym_id: currentGym })
                .eq('user_id', userId);
            error = response.error;
    }

    if (error) {
      console.error('Error saving selected gyms:', error);
      // TODO: Show error to user?
    } else {
      console.log("Gym selection saved successfully.");
      // Refetch metadata to ensure UI consistency (optional, depends on flow)
      // fetchUserMetadata(userId);
    }
  };

  // Called when user confirms gym selection
  const handleGymSelectionComplete = async () => {
    if (selectedGymIds.length > 0 && currentUser) {
      const firstGym = selectedGymIds[0];
      const currentGymToSet = activeGymId || firstGym; // Use existing active or default to first selected
      setActiveGymId(currentGymToSet); // Update local state immediately
      await persistGymSelection(currentUser.id, selectedGymIds, currentGymToSet); // Save to DB
      console.log("Gym selection complete, switching to dashboard.");
      setOnboardingStep('complete');
      console.log("Switching to dashboard view.");
      setAppView('dashboard');
      console.log("Fetching gym details for selected gyms.");
    } else {
      alert("Please select at least one gym.");
    }
  };

  // Called from GymSelectionScreen whenever selection changes
  const handleGymSelectionChange = (gymIds: string[]) => {
    setSelectedGymIds(gymIds);
    // Fetch details for newly selected gyms if not already cached
    // fetchAndCacheGymDetails(gymIds);
    // Optionally update activeGymId if the current one is removed
    if (activeGymId && !gymIds.includes(activeGymId)) {
        setActiveGymId(gymIds.length > 0 ? gymIds[0] : null);
    } else if (!activeGymId && gymIds.length > 0) {
        setActiveGymId(gymIds[0]); // Set first selected as active if none was set
    }
  };

  // Called from AuthScreen on successful login/signup
  const handleAuthSuccess = () => {
    // Auth state change listener (in useEffect) handles fetching user data
    // and determining the next step (usually gym selection if metadata is missing/empty)
    console.log("Auth successful, listener will handle next steps.");
    // No direct navigation here, let the useEffect handle it based on fetched data
  };

  // Persist gym switch to user_metadata
  const handleSwitchGym = async (gymId: string) => {
    if (currentUser && gymId !== activeGymId) {
      setActiveGymId(gymId); // Update local state immediately
      setAppView('dashboard');
      setSelectedRouteId(null);
      console.log("Switched active gym to:", gymId);

      const { error } = await supabase
        .from('user_metadata')
        .update({ current_gym_id: gymId })
        .eq('user_id', currentUser.id);

      if (error) {
        console.error('Error updating current gym:', error);
        // Optionally revert local state or show error
      } else {
        console.log("Current gym updated successfully in DB.");
        // Update local metadata state as well
        setUserMetadata(prev => prev ? { ...prev, current_gym_id: gymId } : null);
      }
    }
  };

  const handleBack = () => {
    if (appView === 'routeDetail' || appView === 'addBeta') { setAppView('routes'); }
    else if (appView === 'routes') { setAppView('dashboard'); }
    else if (appView === 'log') { setAppView(previousAppView); }
    else if (appView === 'profile' || appView === 'discover') { setAppView('dashboard'); }
  };

  const handleBetaSubmitted = () => {
    if (selectedRouteId) { setAppView('routeDetail'); }
    else { setAppView('routes'); }
  };

  const handleLogSubmitted = () => {
    console.log("Log submitted, returning to:", previousAppView);
    setAppView(previousAppView);
  };

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      console.log('Logout successful, auth listener will handle cleanup.');
    }
  };

  // --- Rendering Logic ---

  const renderOnboarding = () => {
     switch (onboardingStep) {
       case 'welcome': return <WelcomeScreen onNext={() => setOnboardingStep('auth')} />;
       case 'auth': return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
       // Pass handleGymSelectionChange for live updates and handleGymSelectionComplete for final confirmation
       case 'gymSelection': return <GymSelectionScreen onGymsSelected={handleGymSelectionChange} onNext={handleGymSelectionComplete} />;
       default: return null; // Should not happen if logic is correct
     }
   };

  const renderApp = () => {
    // --- Loading State ---
    if (isLoadingUser) {
        // TODO: Replace with a proper loading spinner component
        return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
    }

    // --- Onboarding Flow ---
    if (appView === 'onboarding') {
        return renderOnboarding();
    }

    // --- Authenticated App Flow ---
    if (isAuthenticated && currentUser && onboardingStep === 'complete') {
        const activeGymName = getGymNameById(activeGymId);
        const selectedRouteData = getRouteById(selectedRouteId);

        const showNavBar = ['dashboard', 'routes', 'log', 'discover', 'profile'].includes(appView);
        const navBar = showNavBar ? <BottomNavBar currentView={appView} onNavigate={handleNavigate} /> : null;

        let currentScreen;
        switch (appView) {
          case 'dashboard':
            currentScreen = <DashboardScreen selectedGyms={selectedGymIds} activeGymId={activeGymId} onSwitchGym={handleSwitchGym} getGymNameById={getGymNameById} />; // Pass getGymNameById
            break;
          case 'routes':
            currentScreen = <RoutesScreen activeGymId={activeGymId} activeGymName={activeGymName} onNavigate={handleNavigate} />;
            break;
          case 'routeDetail':
            if (selectedRouteData) {
              currentScreen = <RouteDetailScreen route={selectedRouteData} onBack={handleBack} onNavigate={handleNavigate} />;
            } else {
              currentScreen = <div className="p-4 pt-16 text-center text-red-500">Error: Route not found. <button onClick={handleBack} className="underline">Go Back</button></div>;
            }
            break;
          case 'addBeta':
             if (selectedRouteData) {
               currentScreen = <AddBetaScreen route={selectedRouteData} onBack={handleBack} onSubmitSuccess={handleBetaSubmitted} />;
             } else {
               currentScreen = <div className="p-4 pt-16 text-center text-red-500">Error: Route context lost. <button onClick={handleBack} className="underline">Go Back</button></div>;
             }
             break;
          case 'log':
             currentScreen = <LogClimbScreen availableRoutes={placeholderRoutes} onBack={handleBack} onSubmitSuccess={handleLogSubmitted} />;
             break;
          case 'discover':
             currentScreen = <DiscoverScreen />;
             break;
          case 'profile':
             // Pass currentUser and handleLogout to ProfileScreen
             currentScreen = <ProfileScreen currentUser={currentUser} userMetadata={userMetadata} onNavigate={handleNavigate} onLogout={handleLogout} getGymNameById={getGymNameById} />; // Pass metadata and gym name getter
             break;
          default: // Fallback to dashboard if authenticated and view is unknown
            currentScreen = <DashboardScreen selectedGyms={selectedGymIds} activeGymId={activeGymId} onSwitchGym={handleSwitchGym} getGymNameById={getGymNameById} />;
        }

        return (
          <div className="font-sans">
            <div className={showNavBar ? "pb-16" : ""}>
               {currentScreen}
            </div>
            {navBar}
          </div>
        );
    }

    // --- Fallback (Should ideally be handled by loading or onboarding) ---
    // If not loading, not authenticated, and not in onboarding, show Auth screen.
    if (!isAuthenticated && !isLoadingUser) {
        return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
    }

    // Default fallback (e.g., if something unexpected happens)
    return <WelcomeScreen onNext={() => setOnboardingStep('auth')} />;
  }

  return renderApp();
}

export default App;
