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

  // Check initial auth state
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsAuthenticated(true);
        // If authenticated, skip onboarding steps if already completed (e.g., check local storage or fetch user profile)
        // For now, assume if session exists, onboarding is complete
        setOnboardingStep('complete');
        setAppView('dashboard'); // Start at dashboard if logged in
        // TODO: Fetch user's selected gyms and set active gym
      } else {
        setIsAuthenticated(false);
        setAppView('onboarding');
        setOnboardingStep('welcome');
      }
    };
    checkSession();

    // Listen for auth changes
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsAuthenticated(true);
        // Potentially fetch user data here if needed upon login/token refresh
      } else {
        setIsAuthenticated(false);
        // If user logs out, reset state and go to auth screen
        handleLogoutCleanup();
      }
    });

    // Cleanup listener on component unmount
    return () => {
      authListener?.subscription.unsubscribe();
    };
  }, []);


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
        // Auth success is handled by onAuthStateChange or the AuthScreen callback
        break;
      case 'gymSelection':
        if (selectedGyms.length > 0) {
          const firstGym = selectedGyms[0];
          setActiveGymId(firstGym);
          setOnboardingStep('complete');
          setAppView('dashboard');
          // TODO: Persist selected gyms for the user
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
    setIsAuthenticated(true); // Ensure state is updated immediately
    // Check if gym selection is needed (e.g., fetch profile, if no gyms, go to selection)
    // For now, always go to gym selection after auth success during onboarding
    setOnboardingStep('gymSelection');
    setAppView('onboarding'); // Keep view as onboarding until gym selection is done
  };

  const handleGymSelection = (gyms: string[]) => {
    setSelectedGyms(gyms);
    // Maybe auto-select the first gym as active?
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
    // Go back to the route detail screen after submitting beta
    if (selectedRouteId) {
      setAppView('routeDetail');
    } else {
      // Fallback if routeId was lost somehow
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
      // Optionally show an error message to the user
    } else {
      // State cleanup is handled by the onAuthStateChange listener calling handleLogoutCleanup
      console.log('Logout successful');
    }
  };


  const renderOnboarding = () => {
     switch (onboardingStep) {
       case 'welcome': return <WelcomeScreen onNext={handleNextOnboarding} />;
       // Pass handleAuthSuccess to AuthScreen
       case 'auth': return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
       // Pass handleGymSelection and handleNextOnboarding to GymSelectionScreen
       case 'gymSelection': return <GymSelectionScreen onGymsSelected={handleGymSelection} onNext={handleNextOnboarding} />;
       default: return null; // Should not happen if authenticated state is handled correctly
     }
   };

  const renderApp = () => {
    // If authenticated but onboarding isn't marked complete (e.g., no gyms selected yet)
    // This might happen if the user authenticated but closed the app before selecting gyms
    if (isAuthenticated && onboardingStep !== 'complete') {
        // Force gym selection if needed, otherwise show dashboard
        if (onboardingStep === 'gymSelection' || selectedGyms.length === 0) { // Add check for selectedGyms length
             return <GymSelectionScreen onGymsSelected={handleGymSelection} onNext={handleNextOnboarding} />;
        }
        // If somehow authenticated but step is 'auth' or 'welcome', reset to 'gymSelection' or fetch profile
        // For simplicity, let's assume if authenticated and step isn't complete, we need gym selection.
        // A more robust solution would fetch user profile to determine the correct step.
    }


    // --- Main App Rendering ---
    const activeGymName = activeGymId ? getGymNameById(activeGymId) : 'Select Gym';
    const selectedRouteData = getRouteById(selectedRouteId);

    // Show Nav Bar only for the main app views when authenticated and onboarding is complete
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
          // Handle case where route data might not be found (e.g., invalid ID)
          currentScreen = <div className="p-4 pt-16 text-center text-red-500">Error: Route not found. <button onClick={handleBack} className="underline">Go Back</button></div>;
        }
        break;
      case 'addBeta':
         if (selectedRouteData) {
           currentScreen = <AddBetaScreen route={selectedRouteData} onBack={handleBack} onSubmitSuccess={handleBetaSubmitted} />;
         } else {
           // Handle case where route context might be lost
           currentScreen = <div className="p-4 pt-16 text-center text-red-500">Error: Route context lost. <button onClick={handleBack} className="underline">Go Back</button></div>;
         }
         break;
      case 'log':
         // Pass only routes relevant to the active gym if applicable, or all for now
         currentScreen = <LogClimbScreen availableRoutes={placeholderRoutes} onBack={handleBack} onSubmitSuccess={handleLogSubmitted} />;
         break;
      case 'discover':
         currentScreen = <DiscoverScreen />;
         break;
      case 'profile':
         // Pass handleLogout to ProfileScreen
         currentScreen = <ProfileScreen onNavigate={handleNavigate} onLogout={handleLogout} />;
         break;
      default:
        // Default to dashboard if authenticated and onboarding complete, otherwise handled by initial check/onboarding render
        currentScreen = (isAuthenticated && onboardingStep === 'complete')
            ? <DashboardScreen selectedGyms={selectedGyms} activeGymId={activeGymId} onSwitchGym={handleSwitchGym} />
            : null; // Render nothing here, as onboarding handles the initial view
    }

    // If not authenticated and not in onboarding flow (e.g., after logout), render AuthScreen
     if (!isAuthenticated && appView !== 'onboarding') {
        return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
     }
     // If authenticated but onboarding is not complete, render the appropriate onboarding step
     if (isAuthenticated && onboardingStep !== 'complete') {
         return renderOnboarding();
     }
     // If authenticated and onboarding is complete, render the main app view
     if (isAuthenticated && onboardingStep === 'complete') {
        return (
          <div className="font-sans">
            {/* Apply padding-bottom only if nav bar is shown */}
            <div className={showNavBar ? "pb-16" : ""}>
               {currentScreen}
            </div>
            {navBar}
          </div>
        );
     }

     // Fallback: Render onboarding if none of the above conditions are met (e.g., initial load before auth check)
     return renderOnboarding();
  }

  // Determine whether to render onboarding or the main app based on auth and onboarding status
  return renderApp();
}

export default App;
