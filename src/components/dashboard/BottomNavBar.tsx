import React from 'react';
import { Home, Route, PlusSquare, Compass, User } from 'lucide-react';
import { AppView } from '../../types'; // Assuming you create a types file or define in App.tsx

interface BottomNavBarProps {
  currentView: AppView;
  onNavigate: (view: AppView) => void;
}

const BottomNavBar: React.FC<BottomNavBarProps> = ({ currentView, onNavigate }) => {

  const navItems = [
    { name: 'dashboard', label: 'Home', icon: Home },
    { name: 'routes', label: 'Routes', icon: Route },
    { name: 'log', label: 'Log Climb', icon: PlusSquare, isCenter: true },
    { name: 'discover', label: 'Discover', icon: Compass },
    { name: 'profile', label: 'Profile', icon: User },
  ] as const; // Use 'as const' for stricter typing of names

  return (
    <nav className="fixed bottom-0 left-0 right-0 bg-white shadow-[0_-2px_5px_rgba(0,0,0,0.1)] flex justify-around items-center h-16 z-20">
      {navItems.map((item) => {
        const isActive = currentView === item.name;
        const Icon = item.icon;
        return (
          <button
            key={item.name}
            onClick={() => onNavigate(item.name)} // Use the passed handler
            className={`flex flex-col items-center justify-center flex-grow text-center px-2 transition-colors duration-200 ${
              isActive ? 'text-accent-blue' : 'text-brand-gray hover:text-accent-blue/80'
            } ${item.isCenter ? '-mt-4' : ''}`} // Elevate center button slightly
          >
            <div className={`${item.isCenter ? 'bg-accent-blue text-white rounded-full p-3 shadow-lg mb-1' : ''}`}>
              <Icon size={item.isCenter ? 28 : 24} strokeWidth={isActive ? 2.5 : 2} />
            </div>
            {!item.isCenter && (
              <span className={`text-xs mt-1 ${isActive ? 'font-semibold' : ''}`}>
                {item.label}
              </span>
            )}
          </button>
        );
      })}
    </nav>
  );
};

export default BottomNavBar;
