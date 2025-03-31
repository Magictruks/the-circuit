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
import DiscoverScreen from './components/discover/DiscoverScreen'; // Import DiscoverScreen
import BottomNavBar from './components/dashboard/BottomNavBar';
import { AppView, RouteData } from './types';

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

  useEffect(() => {
    setPreviousAppView(currentView => (appView !== 'log' ? appView : currentView));
  }, [appView]);

  // --- Keep existing handlers: handleNextOnboarding, handleAuthSuccess, handleGymSelection, handleNavigate, handleSwitchGym, handleBack, handleBetaSubmitted, handleLogSubmitted ---
  const handleNextOnboarding = () => { /* ... */ switch (onboardingStep) { case 'welcome': setOnboardingStep('auth'); break; case 'auth': setOnboardingStep('gymSelection'); break; case 'gymSelection': if (selectedGyms.length > 0) { const firstGym = selectedGyms[0]; setActiveGymId(firstGym); setOnboardingStep('complete'); setAppView('dashboard'); } else { alert("Please select at least one gym."); } break; default: break; } };
  const handleAuthSuccess = () => setOnboardingStep('gymSelection');
  const handleGymSelection = (gyms: string[]) => setSelectedGyms(gyms);
  const handleNavigate = (view: AppView, routeId?: string) => { if ((view === 'routeDetail' || view === 'addBeta') && routeId) { setSelectedRouteId(routeId); } else if (view !== 'routeDetail' && view !== 'addBeta') { setSelectedRouteId(null); } setAppView(view); };
  const handleSwitchGym = (gymId: string) => { setActiveGymId(gymId); setAppView('dashboard'); setSelectedRouteId(null); console.log("Switched active gym to:", gymId); };
  const handleBack = () => { if (appView === 'routeDetail' || appView === 'addBeta') { setAppView('routes'); } else if (appView === 'routes') { setAppView('dashboard'); } else if (appView === 'log') { setAppView(previousAppView); } /* Add profile/discover back logic if needed */ };
  const handleBetaSubmitted = () => { if (selectedRouteId) { setAppView('routeDetail'); } else { setAppView('routes'); } };
  const handleLogSubmitted = () => { console.log("Log submitted, returning to:", previousAppView); setAppView(previousAppView); };


  const renderOnboarding = () => {
     switch (onboardingStep) {
       case 'welcome': return <WelcomeScreen onNext={handleNextOnboarding} />;
       case 'auth': return <AuthScreen onAuthSuccess={handleAuthSuccess} />;
       case 'gymSelection': return <GymSelectionScreen onGymsSelected={handleGymSelection} onNext={handleNextOnboarding} />;
       default: return null;
     }
   };

  const renderApp = () => {
    const activeGymName = activeGymId ? getGymNameById(activeGymId) : 'Select Gym';
    const selectedRouteData = getRouteById(selectedRouteId);

    const showNavBar = appView !== 'onboarding';
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
         // Render DiscoverScreen
         currentScreen = <DiscoverScreen />;
         break;
      case 'profile':
         currentScreen = <ProfileScreen onNavigate={handleNavigate} />;
         break;
      default:
        currentScreen = <DashboardScreen selectedGyms={selectedGyms} activeGymId={activeGymId} onSwitchGym={handleSwitchGym} />;
    }

    return (
      <div className="font-sans">
        {/* Apply pb-16 only if nav bar is shown */}
        <div className={showNavBar ? "pb-16" : ""}>
           {currentScreen}
        </div>
        {navBar}
      </div>
    );
  }

  return appView === 'onboarding' ? renderOnboarding() : renderApp();
}

export default App;
