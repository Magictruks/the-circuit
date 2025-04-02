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
  const [selectedGymIds, setSelectedGymIds] = useState<string[]>([]);
  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userMetadata, setUserMetadata] = useState<UserMetadata | null>(null);
  // Removed gymDataCache
  const [gymDetails, setGymDetails] = useState<Map<string, GymData>>(new Map()); // State to hold details of relevant gyms
  const [isLoadingAuth, setIsLoadingAuth] = useState(true); // Loading state for initial auth check
  const [isLoadingData, setIsLoadingData] = useState(false); // Loading state for user metadata/gym data
  const [isLoadingGymDetails, setIsLoadingGymDetails] = useState(false); // Loading state specifically for gym details

  // --- Utility Functions ---
  // Updated getGymNameById to read from gymDetails state
  const getGymNameById = useCallback((id: string | null): string => {
    if (!id) return 'Unknown Gym';
    return gymDetails.get(id)?.name || 'Loading Gym...'; // Read from gymDetails map
  }, [gymDetails]);

  // Removed fetchAndCacheGymDetails function

  // --- Effect to Fetch Gym Details ---
  useEffect(() => {
    const fetchGymDetails = async () => {
      const idsToFetchSet = new Set<string>();
      selectedGymIds.forEach(id => idsToFetchSet.add(id));

      console.log('[Gym Details Effect] Selected Gym IDs:', selectedGymIds, 'Active Gym ID:', activeGymId);

      if (activeGymId) {
        idsToFetchSet.add(activeGymId);
      }

      const idsToFetch = Array.from(idsToFetchSet).filter(Boolean); // Remove null/undefined

      console.log('Ids to fetch:', idsToFetch);

      if (idsToFetch.length === 0) {
        setGymDetails(new Map()); // Clear details if no gyms are selected/active
        return;
      }

      console.log("[Gym Details Effect] Fetching details for gym IDs:", idsToFetch);
      setIsLoadingGymDetails(true);
      try {
        const { data, error } = await supabase
            .from('gyms')
            .select('id, name, city, state, country')
            .in('id', idsToFetch);

        console.log('[Gym Details Effect] Fetch result:', data, error);

        if (error) {
          console.error('[Gym Details Effect] Error fetching gym details:', error);
          // Optionally clear details or keep stale data on error? Clearing for now.
          setGymDetails(new Map());
        } else if (data) {
          const newDetails = new Map<string, GymData>();
          data.forEach(gym => newDetails.set(gym.id, gym));
          setGymDetails(newDetails);
          console.log("[Gym Details Effect] Updated gym details:", newDetails);
        }
      } catch (err) {
        console.error("[Gym Details Effect] Unexpected error fetching gym details:", err);
        setGymDetails(new Map()); // Clear on unexpected error
      } finally {
        setIsLoadingGymDetails(false);
      }
    };

    fetchGymDetails();
  }, [activeGymId]); // Re-run when selected or active gyms change


  // --- User Data Fetching ---
  const fetchUserMetadata = useCallback(async (userId: string): Promise<UserMetadata | null> => {
    console.log("[fetchUserMetadata] Fetching metadata for user:", userId);
    setIsLoadingData(true); // Start data loading
    let metadataResult: UserMetadata | null = null;

    try {
      const { data, error } = await supabase
          .from('profiles')
          .select('*') // Select all profile fields
          .eq('user_id', userId)
          .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found, which is not an error here
        console.error('[fetchUserMetadata] Error fetching user metadata:', error.message);
        setUserMetadata(null); // Clear metadata on error
        setSelectedGymIds([]); // Clear gym selections
        setActiveGymId(null);
      } else if (data) {
        console.log("[fetchUserMetadata] User metadata fetched successfully:", data);
        setUserMetadata(data);
        metadataResult = data;

        // Update local state based on fetched metadata
        const fetchedGymIds = data.selected_gym_ids || [];
        const fetchedCurrentGym = data.current_gym_id || null;
        setSelectedGymIds(fetchedGymIds);
        const newActiveGym = fetchedCurrentGym || (fetchedGymIds.length > 0 ? fetchedGymIds[0] : null);
        setActiveGymId(newActiveGym);
        console.log("[fetchUserMetadata] Set selectedGymIds:", fetchedGymIds, "Set activeGymId:", newActiveGym);

        // No need to call fetchAndCacheGymDetails here, the useEffect handles it

        // Determine onboarding/app state based on metadata
        if (fetchedGymIds.length > 0) {
          console.log("[fetchUserMetadata] User has gyms, onboarding complete.");
          setOnboardingStep('complete');
          setAppView(prev => prev === 'onboarding' ? 'dashboard' : prev); // Move to dashboard if stuck on onboarding view
        } else {
          console.log("[fetchUserMetadata] User has no gyms selected, needs gym selection.");
          setOnboardingStep('gymSelection');
          setAppView('onboarding'); // Ensure user is in onboarding flow
        }

      } else {
        // No profile data found for the user
        console.log("[fetchUserMetadata] No user metadata found for user:", userId);
        setUserMetadata(null);
        setSelectedGymIds([]);
        setActiveGymId(null);
        setOnboardingStep('gymSelection'); // No metadata means needs gym selection
        setAppView('onboarding');
      }
    } catch (err) {
      console.error("[fetchUserMetadata] Unexpected error during fetch:", err);
      // Reset state on unexpected errors
      setUserMetadata(null);
      setSelectedGymIds([]);
      setActiveGymId(null);
      setOnboardingStep('gymSelection'); // Reset to gym selection on error
      setAppView('onboarding');
    } finally {
      setIsLoadingData(false); // End data loading
      console.log("[fetchUserMetadata] Finished.");
    }
    return metadataResult;
  }, []); // Removed fetchAndCacheGymDetails dependency


  // --- Authentication Handling ---
  useEffect(() => {
    let isMounted = true;
    setIsLoadingAuth(true);
    console.log("[Auth Effect] Running initial check...");

    // Function to clean up state on logout or error
    const handleLogoutCleanup = () => {
      if (!isMounted) return;
      console.log("[Auth Effect] Cleaning up user state (handleLogoutCleanup).");
      setIsAuthenticated(false);
      setCurrentUser(null);
      setUserMetadata(null);
      setSelectedGymIds([]);
      setActiveGymId(null);
      setSelectedRouteId(null);
      setGymDetails(new Map()); // Clear gym details on logout
      setAppView('onboarding');
      setOnboardingStep('auth'); // Go to auth screen after logout/error
      setPreviousAppView('dashboard'); // Reset previous view
      setIsLoadingData(false); // Ensure data loading stops on logout
      setIsLoadingGymDetails(false); // Ensure gym detail loading stops
    };

    // Check initial session state
    supabase.auth.getSession().then(({ data: { session } }) => {
      console.log("[Auth Effect] Initial session check completed. User:", session?.user?.id);
      if (isMounted) {
        setCurrentUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
        if (!session?.user) {
          handleLogoutCleanup(); // Ensure cleanup if no initial user
        }
        setIsLoadingAuth(false); // Auth check finished
      }
    }).catch(error => {
      console.error("[Auth Effect] Error getting initial session:", error);
      if (isMounted) {
        handleLogoutCleanup(); // Reset state on error
        setIsLoadingAuth(false);
      }
    });

    // Listen for subsequent auth changes
    console.log("[Auth Effect] Setting up onAuthStateChange listener.");
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      console.log("[Auth Listener] Auth state changed:", _event, "User:", session?.user?.id);
      if (!isMounted) return;

      // Use a temporary variable to check against the *current* state value inside the listener closure
      const currentUserIdInClosure = currentUser?.id;
      const userChanged = session?.user?.id !== currentUserIdInClosure;
      const loggingOut = !session?.user && !!currentUserIdInClosure; // Check if there *was* a user

      if (userChanged || loggingOut) {
        console.log(`[Auth Listener] User change detected (Changed: ${userChanged}, LoggingOut: ${loggingOut}). Updating auth state.`);
        setCurrentUser(session?.user ?? null);
        setIsAuthenticated(!!session?.user);
        if (!session?.user) {
          handleLogoutCleanup(); // Clean up immediately on logout event
        } else {
          // Reset data loading flag when a new user logs in, data fetching effect will handle it
          console.log("[Auth Listener] New user logged in, setting isLoadingData to true.");
          setIsLoadingData(true); // Trigger user metadata fetch
          // Gym details will be fetched by the useEffect hook based on the new user's data
        }
      } else {
        console.log("[Auth Listener] Auth state change detected, but user is the same. No auth state update needed.");
      }
    });

    // Cleanup listener on component unmount
    return () => {
      console.log("[Auth Effect] Cleanup: Unsubscribing auth listener and setting isMounted=false.");
      isMounted = false;
      authListener?.subscription.unsubscribe();
    };
    // currentUser state is managed internally by this effect, no need to list as dependency
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // --- Effect for Fetching User Data based on Current User ---
  useEffect(() => {
    let isMounted = true;
    console.log("[Data Fetch Effect] Running. Current User:", currentUser?.id);

    if (currentUser) {
      console.log("[Data Fetch Effect] User found, fetching metadata...");
      // Ensure we don't fetch if auth is still loading (prevents race condition on initial load)
      if (!isLoadingAuth) {
        fetchUserMetadata(currentUser.id).then(() => {
          if (!isMounted) console.log("[Data Fetch Effect] Component unmounted after fetchUserMetadata returned.");
          // Gym details fetching is handled by the separate useEffect
        }).catch(error => {
          console.error("[Data Fetch Effect] Error during metadata fetch:", error);
          // Cleanup handled within fetchUserMetadata or auth listener
        });
      } else {
        console.log("[Data Fetch Effect] Auth is still loading, skipping fetch for now.");
      }
    } else {
      console.log("[Data Fetch Effect] No user, skipping metadata fetch.");
      // State cleanup is handled by the auth listener's handleLogoutCleanup
      setIsLoadingData(false); // Ensure loading stops if user becomes null
    }

    return () => {
      console.log("[Data Fetch Effect] Cleanup: Setting isMounted=false.");
      isMounted = false;
    };
    // Depend on currentUser and the memoized fetch function, and isLoadingAuth
  }, [currentUser, fetchUserMetadata, isLoadingAuth]);


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

  // New handler to navigate specifically to the gym selection screen
  const handleNavigateToGymSelection = () => {
    console.log("Navigating to Gym Selection screen.");
    setActiveGymId(null); // Clear active gym when navigating to selection
    setAppView('onboarding');
    setOnboardingStep('gymSelection');
  };

  // Persist gym selection to profiles
  const persistGymSelection = async (userId: string, gymsToSave: string[], currentGym: string | null) => {
    console.log("Persisting gym selection:", gymsToSave, "Current:", currentGym);
    setIsLoadingData(true); // Show loading during save

    try {
      const { error } = await supabase
          .from('profiles')
          .upsert({
            user_id: userId,
            selected_gym_ids: gymsToSave,
            current_gym_id: currentGym
          }, {
            onConflict: 'user_id' // Use user_id as the conflict target
          });

      if (error) {
        console.error('Error saving selected gyms (upsert):', error);
        alert(`Error saving gym selection: ${error.message}`);
        // Optionally refetch metadata to revert local state if save failed
        await fetchUserMetadata(userId);
      } else {
        console.log("Gym selection saved successfully (upsert).");
        console.log('Selected Gyms:', gymsToSave, 'Current Gym:', currentGym);
        // Update local state immediately after successful save
        setSelectedGymIds(gymsToSave); // Update selected gyms
        setActiveGymId(currentGym); // Update active gym
        // The useEffect for gym details will automatically fetch the new details

        // Update local metadata state to reflect the change
        setUserMetadata(prev => prev ? { ...prev, selected_gym_ids: gymsToSave, current_gym_id: currentGym } : {
          // Create a basic metadata object if it was null (should ideally not happen if user exists)
          user_id: userId,
          display_name: currentUser?.user_metadata?.display_name || 'Climber', // Use existing or default
          selected_gym_ids: gymsToSave,
          current_gym_id: currentGym,
          created_at: new Date().toISOString(), // Add timestamps
          updated_at: new Date().toISOString(),
        });
        // Set onboarding complete and navigate
        setOnboardingStep('complete');
        setAppView('dashboard');
      }
    } catch (err) {
      console.error("Unexpected error persisting gym selection:", err);
      alert("An unexpected error occurred while saving your gym selection.");
      // Optionally refetch metadata to revert local state if save failed
      if (currentUser) await fetchUserMetadata(currentUser.id);
    } finally {
      setIsLoadingData(false); // Hide loading indicator
    }
  };


  // Called when user confirms gym selection
  const handleGymSelectionComplete = async () => {
    if (selectedGymIds.length > 0 && currentUser) {
      const firstGym = selectedGymIds[0];
      // Ensure activeGymId is one of the selected ones, default to first if not
      const currentGymToSet = activeGymId && selectedGymIds.includes(activeGymId) ? activeGymId : firstGym;
      await persistGymSelection(currentUser.id, selectedGymIds, currentGymToSet);
      // Navigation is handled inside persistGymSelection on success
    } else if (!currentUser) {
      console.error("Cannot complete gym selection: No current user.");
      alert("Error: User session not found. Please try logging in again.");
      handleLogout(); // Force logout / re-auth
    } else {
      alert("Please select at least one gym.");
    }
  };

  // Called from GymSelectionScreen whenever selection changes
  const handleGymSelectionChange = (gymIds: string[]) => {
    // Update the temporary selection state
    setSelectedGymIds(gymIds);
    // No need to fetch details here, the effect handles it.
    // Update active gym optimistically if needed
    // if (activeGymId && !gymIds.includes(activeGymId)) {
    //   setActiveGymId(gymIds.length > 0 ? gymIds[0] : null);
    // } else if (!activeGymId && gymIds.length > 0) {
    //   setActiveGymId(gymIds[0]);
    // }
  };

  // Called from AuthScreen on successful login/signup
  const handleAuthSuccess = () => {
    // Auth state change listener handles setting currentUser
    // The data fetching useEffect handles fetching metadata and determining next steps
    console.log("Auth successful, listener and data effect will handle next steps.");
    // No direct navigation here. Set loading state while effects run.
    setIsLoadingData(true);
  };

  // Persist gym switch to profiles
  const handleSwitchGym = async (gymId: string) => {
    if (currentUser && gymId !== activeGymId) {
      const previousActiveGymId = activeGymId; // Store previous for potential revert
      setActiveGymId(gymId); // Update local state immediately for responsiveness
      setAppView('dashboard'); // Navigate immediately
      setSelectedRouteId(null); // Clear selected route when switching gyms
      console.log("Switched active gym locally to:", gymId);
      // The useEffect will fetch details for the new active gym

      // Persist the change to the backend
      setIsLoadingData(true); // Show loading while saving (can use isLoadingGymDetails too)

      try {
        const { error } = await supabase
            .from('profiles')
            .update({ current_gym_id: gymId })
            .eq('user_id', currentUser.id);

        if (error) {
          console.error('Error updating current gym:', error);
          setActiveGymId(previousActiveGymId); // Revert local state on error
          alert(`Failed to switch gym: ${error.message}`);
        } else {
          console.log("Current gym updated successfully in DB.");
          // Update local metadata state
          setUserMetadata(prev => prev ? { ...prev, current_gym_id: gymId } : null);
          // Gym details are handled by the useEffect
        }
      } catch (err) {
        console.error("Unexpected error switching gym:", err);
        setActiveGymId(previousActiveGymId); // Revert on unexpected error
        alert("An unexpected error occurred while switching gyms.");
      } finally {
        setIsLoadingData(false); // Hide loading
      }
    }
  };

  const handleBack = () => {
    if (appView === 'routeDetail' || appView === 'addBeta') { setAppView('routes'); }
    else if (appView === 'routes') { setAppView('dashboard'); }
    else if (appView === 'log') { setAppView(previousAppView); }
    else if (appView === 'profile' || appView === 'discover') { setAppView('dashboard'); }
    else if (appView === 'onboarding' && onboardingStep === 'gymSelection') { setOnboardingStep('auth'); }
    // Add back navigation from gym selection if user is already authenticated
    else if (appView === 'onboarding' && onboardingStep === 'gymSelection' && isAuthenticated && userMetadata?.selected_gym_ids && userMetadata.selected_gym_ids.length > 0) {
      setAppView('dashboard'); // Go back to dashboard if they came from there
      setOnboardingStep('complete');
    }
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
    setIsLoadingAuth(true); // Show loading during logout
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
      alert(`Logout failed: ${error.message}`);
      setIsLoadingAuth(false);
    } else {
      console.log('Logout successful, auth listener will handle cleanup.');
      // Cleanup is handled by the onAuthStateChange listener
    }
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
    // Show loading if initial auth check, user data fetch, or essential gym details fetch is happening
    const showLoading = isLoadingAuth || (isAuthenticated && (isLoadingData || isLoadingGymDetails));
    if (showLoading) {
      return <div className="min-h-screen flex items-center justify-center text-brand-gray">Loading App...</div>;
    }

    // --- Onboarding Flow ---
    // Render onboarding if not authenticated OR if authenticated but onboarding isn't complete OR if explicitly navigating to gym selection view
    if (!isAuthenticated || (isAuthenticated && onboardingStep !== 'complete') || appView === 'onboarding') {
      console.log("Rendering Onboarding Flow. IsAuth:", isAuthenticated, "OnboardingStep:", onboardingStep, "AppView:", appView);
      // Ensure view is set correctly if authenticated but onboarding incomplete
      if (isAuthenticated && onboardingStep !== 'complete' && appView !== 'onboarding') {
        setAppView('onboarding');
        return <div className="min-h-screen flex items-center justify-center text-brand-gray">Loading Onboarding...</div>; // Show loading briefly
      }
      return renderOnboarding();
    }

    // --- Authenticated App Flow ---
    // This block only runs if isAuthenticated is true AND onboardingStep is 'complete' AND appView is NOT 'onboarding'
    if (isAuthenticated && currentUser && onboardingStep === 'complete') {
      // If somehow stuck in onboarding view after completing, force to dashboard (redundant check, but safe)
      if (appView === 'onboarding') {
        console.log("User authenticated and onboarding complete, but view is onboarding. Forcing dashboard view.");
        setAppView('dashboard');
        return <div className="min-h-screen flex items-center justify-center text-brand-gray">Redirecting...</div>;
      }

      console.log("Rendering Authenticated App Flow. Current View:", appView);

      const activeGymName = getGymNameById(activeGymId); // Uses updated function reading from gymDetails
      const selectedRouteData = getRouteById(selectedRouteId);

      const showNavBar = ['dashboard', 'routes', 'log', 'discover', 'profile'].includes(appView);
      const navBar = showNavBar ? <BottomNavBar currentView={appView} onNavigate={handleNavigate} /> : null;

      let currentScreen;
      switch (appView) {
        case 'dashboard':
          currentScreen = <DashboardScreen
              selectedGyms={selectedGymIds}
              activeGymId={activeGymId}
              onSwitchGym={handleSwitchGym}
              getGymNameById={getGymNameById}
              onNavigateToGymSelection={handleNavigateToGymSelection} // Pass the handler
          />;
          break;
        case 'routes':
          currentScreen = <RoutesScreen activeGymId={activeGymId} activeGymName={activeGymName} onNavigate={handleNavigate} />;
          break;
        case 'routeDetail':
          if (selectedRouteData) {
            currentScreen = <RouteDetailScreen route={selectedRouteData} onBack={handleBack} onNavigate={handleNavigate} />;
          } else {
            console.warn(`RouteDetailScreen: Route data for ID ${selectedRouteId} not found.`);
            currentScreen = <div className="p-4 pt-16 text-center text-red-500">Error: Route not found. <button onClick={handleBack} className="underline">Go Back</button></div>;
          }
          break;
        case 'addBeta':
          if (selectedRouteData) {
            currentScreen = <AddBetaScreen route={selectedRouteData} onBack={handleBack} onSubmitSuccess={handleBetaSubmitted} />;
          } else {
            console.warn(`AddBetaScreen: Route data for ID ${selectedRouteId} not found.`);
            currentScreen = <div className="p-4 pt-16 text-center text-red-500">Error: Route context lost. <button onClick={handleBack} className="underline">Go Back</button></div>;
          }
          break;
        case 'log':
          // TODO: Fetch available routes dynamically based on active gym?
          currentScreen = <LogClimbScreen availableRoutes={placeholderRoutes} onBack={handleBack} onSubmitSuccess={handleLogSubmitted} />;
          break;
        case 'discover':
          currentScreen = <DiscoverScreen />;
          break;
        case 'profile':
          currentScreen = <ProfileScreen currentUser={currentUser} userMetadata={userMetadata} onNavigate={handleNavigate} onLogout={handleLogout} getGymNameById={getGymNameById} />;
          break;
        default:
          console.warn("Unknown appView:", appView, "Falling back to dashboard.");
          setAppView('dashboard');
          currentScreen = <DashboardScreen
              selectedGyms={selectedGymIds}
              activeGymId={activeGymId}
              onSwitchGym={handleSwitchGym}
              getGymNameById={getGymNameById}
              onNavigateToGymSelection={handleNavigateToGymSelection} // Pass the handler
          />;
      }

      return (
          <div className="font-sans">
            <div className={showNavBar ? "pb-16" : ""}> {/* Add padding-bottom only if nav bar is shown */}
              {currentScreen}
            </div>
            {navBar}
          </div>
      );
    }

    // --- Fallback (Should ideally be handled by loading or onboarding) ---
    console.warn("Reached final fallback render. State:", { isLoadingAuth, isLoadingData, isLoadingGymDetails, isAuthenticated, onboardingStep, appView });
    // If it is reached, it implies !isAuthenticated and not loading.
    return renderOnboarding(); // Show onboarding (which starts with Welcome/Auth)
  }

  return renderApp();
}

export default App;
