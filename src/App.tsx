import React, { useState, useEffect } from 'react';
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
import { AppView, RouteData } from './types';
import { supabase } from './supabaseClient'; // Import supabase
import type { User } from '@supabase/supabase-js'; // Import User type

// --- Placeholder Data --- (Keep existing data)
const placeholderRoutes: RouteData[] = [
  { id: 'r1', name: 'Crimson Dyno', grade: 'V5', gradeColor: 'accent-red', location: 'Overhang Cave', setter: 'Admin', dateSet: '2024-03-10', status: 'sent', betaAvailable: true, description: 'Explosive move off the starting holds to a big jug.', imageUrl: 'https://images.unsplash.com/photo-1564769662533-4f00a87b4056?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 'r2', name: 'Blue Traverse', grade: 'V3', gradeColor: 'accent-blue', location: 'Slab Wall', setter: 'Admin', dateSet: '2024-03-08', status: 'attempted', betaAvailable: false, description: 'Technical footwork required on small holds.' },
  { id: 'r3', name: 'Sunshine Arete', grade: 'V4', gradeColor: 'accent-yellow', location: 'Main Boulder', setter: 'Jane D.', dateSet: '2024-03-05', status: 'unseen', betaAvailable: true, description: 'Balancey moves up the arete feature.', imageUrl: 'https://images.unsplash.com/photo-1610414870675-5579095849e1?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  { id: 'r4', name: 'Green Slab Master', grade: 'V2', gradeColor: 'brand-green', location: 'Slab Wall', setter: 'Admin', dateSet: '2024-03-01', status: 'sent', betaAvailable: false },
  { id: 'r5', name: 'Purple Pain', grade: 'V6', gradeColor: 'accent-purple', location: 'Overhang Cave', setter: 'Mike R.', dateSet: '2024-02-28', status: 'unseen', betaAvailable: true },
  { id: 'r6', name: 'The Gray Crack', grade: 'V1', gradeColor: 'brand-gray', location: 'Training Area', setter: 'Admin', dateSet: '2024-02-25', status: 'attempted', betaAvailable: false },
];
const getRouteById = (id: string | null): RouteData | undefined => placeholderRoutes.find(route => route.id === id);
const getGymNameById = (id: string): string => { const gyms: { [key: string]: string } = { gym1: 'Summit Climbing', gym2: 'Movement', gym3: 'Brooklyn Boulders', gym4: 'Sender One', gym5: 'The Cliffs', gym6: 'Planet Granite', gym7: 'Austin Bouldering Project', gym8: 'Vertical World' }; return gyms[id] || 'Unknown Gym'; };
// --- End Placeholder Data ---

type OnboardingStep = 'welcome' | 'auth' | 'gymSelection' | 'complete';

function App() {
  const [onboardingStep, setOnboardingStep] = useState<OnboardingStep>('welcome');
  const [appView, setAppView] = useState<AppView>('onboarding');
  const [previousAppView, setPreviousAppView] = useState<AppView>('dashboard');
  const [selectedGyms, setSelectedGyms] = useState<string[]>([]);
  const [activeGymId, setActiveGymId] = useState<string | null>(null);
  const [selectedRouteId, setSelectedRouteId] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false); // Track auth state
  const [currentUser, setCurrentUser] = useState<User | null>(null); // Add state for current user

  // Check initial auth state and fetch user data
  useEffect(() => {
		//supabase.auth.signOut()
    const fetchUserAndSetState = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setCurrentUser(user); // Set user data
      if (user) {
        setIsAuthenticated(true);
        // TODO: Fetch user profile/settings (like selected gyms) from your database table if needed
        // For now, assume onboarding complete if user exists
        setOnboardingStep('complete');
        setAppView('dashboard');
        // Example: Fetch selected gyms if stored in user metadata or a profile table
        // const userSelectedGyms = user.user_metadata?.selected_gyms || [];
        // setSelectedGyms(userSelectedGyms);
        // if (userSelectedGyms.length > 0 && !activeGymId) {
        //   setActiveGymId(userSelectedGyms[0]);
        // }
      } else {
        setIsAuthenticated(false);
        setCurrentUser(null);
        setAppView('onboarding');
        setOnboardingStep('welcome');
      }
    };

    fetchUserAndSetState(); // Check on initial load

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      const user = session?.user ?? null;
      setCurrentUser(user); // Update user state on change
      setIsAuthenticated(!!user);

      if (!user) {
        // If user logs out, reset state and go to auth screen
        handleLogoutCleanup();
      } else {
         // If user logs in or session is refreshed, ensure onboarding status is correct
         // This might involve checking if they've selected gyms previously
         // For now, if user exists, assume onboarding is complete
         setOnboardingStep('complete');
         // Avoid navigating if already in an app view (prevents jumping from profile to dashboard on refresh)
         if (appView === 'onboarding') {
            setAppView('dashboard');
         }
      }
    });

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, [appView]); // Re-run if appView changes to handle navigation after login/logout


  useEffect(() => {
    // Update previous view only if the new view is not 'log'
    setPreviousAppView(currentView => (appView !== 'log' ? appView : currentView));
  }, [appView]);

  const handleNextOnboarding = () => {
    switch (onboardingStep) {
      case 'welcome':
        setOnboardingStep('auth');
        break;
      case 'auth':
        // Auth success is handled by onAuthStateChange listener
        break;
      case 'gymSelection':
        if (selectedGyms.length > 0) {
          const firstGym = selectedGyms[0];
          setActiveGymId(firstGym);
          setOnboardingStep('complete');
          setAppView('dashboard');
          // TODO: Persist selected gyms for the user (e.g., updateUserMetadata or profile table)
          // supabase.auth.updateUser({ data: { selected_gyms: selectedGyms } })
        } else {
          alert("Please select at least one gym.");
        }
        break;
      default:
        break;
    }
  };

  // Called from AuthScreen on successful login/signup
  const handleAuthSuccess = () => {
    // Auth state change is handled by the listener now, which fetches the user
    // Determine next step based on user data (e.g., check if gyms are selected)
    // For now, assume gym selection is needed after initial signup/login if no gyms are set
    // A better approach: check user profile/metadata after auth listener confirms user
    setOnboardingStep('gymSelection'); // Go to gym selection after auth
    setAppView('onboarding');
  };

  const handleGymSelection = (gyms: string[]) => {
    setSelectedGyms(gyms);
    if (gyms.length > 0 && !activeGymId) {
        setActiveGymId(gyms[0]);
    }
  };

  const handleNavigate = (view: AppView, routeId?: string) => {
    if ((view === 'routeDetail' || view === 'addBeta') && routeId) {
      setSelectedRouteId(routeId);
    } else if (view !== 'routeDetail' && view !== 'addBeta') {
      setSelectedRouteId(null); // Clear route ID when navigating away
    }
    setAppView(view);
  };

  const handleSwitchGym = (gymId: string) => {
    setActiveGymId(gymId);
    setAppView('dashboard'); // Go to dashboard after switching gym
    setSelectedRouteId(null);
    console.log("Switched active gym to:", gymId);
  };

  const handleBack = () => {
    if (appView === 'routeDetail' || appView === 'addBeta') {
      setAppView('routes');
    } else if (appView === 'routes') {
      setAppView('dashboard');
    } else if (appView === 'log') {
      setAppView(previousAppView); // Go back to the view before logging
    } else if (appView === 'profile' || appView === 'discover') {
        setAppView('dashboard'); // Default back to dashboard from profile/discover
    }
    // Add more specific back logic if needed
  };

  const handleBetaSubmitted = () => {
    if (selectedRouteId) {
      setAppView('routeDetail');
    } else {
      setAppView('routes');
    }
  };

  const handleLogSubmitted = () => {
    console.log("Log submitted, returning to:", previousAppView);
    setAppView(previousAppView); // Return to the screen the user was on before logging
  };

  // Function to reset state on logout
  const handleLogoutCleanup = () => {
    setIsAuthenticated(false);
    setCurrentUser(null); // Clear user data
    setSelectedGyms([]);
    setActiveGymId(null);
    setSelectedRouteId(null);
    setAppView('onboarding');
    setOnboardingStep('auth'); // Go directly to auth screen after logout
    setPreviousAppView('dashboard'); // Reset previous view
  };

  // Passed to ProfileScreen
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error);
    } else {
      // State cleanup is handled by the onAuthStateChange listener calling handleLogoutCleanup
      console.log('Logout successful');
    }
  };


  const renderOnboarding = () => {
     switch (onboardingStep) {
       case 'welcome': return <WelcomeScreen onNext={handleNextOnboarding} />;
       case 'auth': return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
       case 'gymSelection': return <GymSelectionScreen onGymsSelected={handleGymSelection} onNext={handleNextOnboarding} />;
       default: return null;
     }
   };

  const renderApp = () => {
    // If authenticated but onboarding isn't marked complete (e.g., no gyms selected yet)
    if (isAuthenticated && onboardingStep !== 'complete') {
        // Check if gym selection is needed (e.g., based on fetched user data or selectedGyms state)
        // This logic might need refinement based on how gym selection persistence is implemented
        if (onboardingStep === 'gymSelection' || selectedGyms.length === 0) {
             return <GymSelectionScreen onGymsSelected={handleGymSelection} onNext={handleNextOnboarding} />;
        }
    }

    // --- Main App Rendering ---
    const activeGymName = activeGymId ? getGymNameById(activeGymId) : 'Select Gym';
    const selectedRouteData = getRouteById(selectedRouteId);

    const showNavBar = isAuthenticated && onboardingStep === 'complete' && ['dashboard', 'routes', 'log', 'discover', 'profile'].includes(appView);
    const navBar = showNavBar ? <BottomNavBar currentView={appView} onNavigate={handleNavigate} /> : null;

    let currentScreen;
    switch (appView) {
      case 'dashboard':
        currentScreen = <DashboardScreen selectedGyms={selectedGyms} activeGymId={activeGymId} onSwitchGym={handleSwitchGym} />;
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
         currentScreen = <ProfileScreen currentUser={currentUser} onNavigate={handleNavigate} onLogout={handleLogout} />;
         break;
      default:
        currentScreen = (isAuthenticated && onboardingStep === 'complete')
            ? <DashboardScreen selectedGyms={selectedGyms} activeGymId={activeGymId} onSwitchGym={handleSwitchGym} />
            : null;
    }

    // Handle loading/initial state before auth check completes
    if (!isAuthenticated && appView === 'onboarding' && onboardingStep === 'welcome') {
        return renderOnboarding(); // Show welcome screen initially
    }
    // If not authenticated (and not on welcome), show AuthScreen
     if (!isAuthenticated && appView !== 'onboarding') {
        return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
     }
     // If authenticated but onboarding is not complete, render the appropriate onboarding step
     if (isAuthenticated && onboardingStep !== 'complete') {
         return renderOnboarding();
     }
     // If authenticated and onboarding is complete, render the main app view
     if (isAuthenticated && onboardingStep === 'complete' && currentUser) { // Ensure currentUser is loaded
        return (
          <div className="font-sans">
            <div className={showNavBar ? "pb-16" : ""}>
               {currentScreen}
            </div>
            {navBar}
          </div>
        );
     }

     // Fallback/Loading state (optional)
     // return <div>Loading...</div>; // Or a spinner component
     // Render onboarding as default fallback if other conditions fail
     return renderOnboarding();
  }

  return renderApp();
}

export default App;
