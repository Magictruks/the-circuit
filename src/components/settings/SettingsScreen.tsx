import React, { useState } from 'react';
import { ArrowLeft, Building, Info, LogOut, ChevronRight, Loader2 } from 'lucide-react';
import { AppView, UserMetadata } from '../../types';
import type { User } from '@supabase/supabase-js';

interface SettingsScreenProps {
  currentUser: User | null;
  userMetadata: UserMetadata | null;
  onNavigate: (view: AppView, data?: any) => void;
  onLogout: () => Promise<void>;
  onNavigateToGymSelection: () => void; // Re-use the handler from App.tsx
  onBack: () => void; // Add onBack prop
}

const SettingsScreen: React.FC<SettingsScreenProps> = ({
  currentUser,
  userMetadata,
  onNavigate,
  onLogout,
  onNavigateToGymSelection,
  onBack,
}) => {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const handleLogoutClick = async () => {
    setIsLoggingOut(true);
    await onLogout();
    // No need to setIsLoggingOut(false) as the component will unmount/redirect
  };

  const SettingItem: React.FC<{ icon: React.ElementType; label: string; onClick?: () => void; isButton?: boolean; isDestructive?: boolean }> = ({
    icon: Icon,
    label,
    onClick,
    isButton = true,
    isDestructive = false,
  }) => (
    <button
      onClick={onClick}
      disabled={!isButton || isLoggingOut}
      className={`flex items-center justify-between w-full p-4 text-left ${
        isButton ? 'hover:bg-gray-50 active:bg-gray-100' : ''
      } ${isDestructive ? 'text-red-600' : 'text-brand-gray'} disabled:opacity-50`}
    >
      <div className="flex items-center gap-3">
        <Icon size={20} className={isDestructive ? 'text-red-500' : 'text-brand-gray'} />
        <span className="text-sm font-medium">{label}</span>
      </div>
      {isButton && !isDestructive && <ChevronRight size={18} className="text-gray-400" />}
      {isButton && isDestructive && isLoggingOut && <Loader2 size={18} className="animate-spin" />}
    </button>
  );

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex items-center">
        <button onClick={onBack} className="mr-4 text-brand-gray hover:text-brand-green">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-brand-green">Settings</h1>
      </header>

      {/* Settings Sections */}
      <main className="p-4 space-y-6">
        {/* Account Section */}
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-xs font-semibold uppercase text-gray-500 px-4 pt-3 pb-1">Account</h2>
          {/* TODO: Add Edit Profile/Name functionality here later */}
          {/* <SettingItem icon={User} label="Edit Profile" onClick={() => console.log("Navigate to Edit Profile")} /> */}
          <SettingItem
            icon={LogOut}
            label="Logout"
            onClick={handleLogoutClick}
            isDestructive
          />
        </section>

        {/* Gyms Section */}
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-xs font-semibold uppercase text-gray-500 px-4 pt-3 pb-1">Gyms</h2>
          <SettingItem
            icon={Building}
            label="Manage My Gyms"
            onClick={onNavigateToGymSelection} // Navigate to the gym selection screen
          />
        </section>

        {/* Preferences Section (Placeholder) */}
        {/* <section className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-xs font-semibold uppercase text-gray-500 px-4 pt-3 pb-1">Preferences</h2>
          <SettingItem icon={SunMoon} label="Appearance (Coming Soon)" isButton={false} />
          <SettingItem icon={Bell} label="Notifications (Coming Soon)" isButton={false} />
        </section> */}

        {/* About Section */}
        <section className="bg-white rounded-lg shadow overflow-hidden">
          <h2 className="text-xs font-semibold uppercase text-gray-500 px-4 pt-3 pb-1">About</h2>
          <SettingItem icon={Info} label="App Version" isButton={false} />
          <div className="px-4 pb-3">
             <p className="text-sm text-brand-gray ml-[32px]">1.0.0 (Alpha)</p> {/* Example version */}
          </div>
          {/* TODO: Add links to Privacy Policy, Terms of Service */}
          {/* <SettingItem icon={FileText} label="Privacy Policy" onClick={() => console.log("Open Privacy Policy")} /> */}
          {/* <SettingItem icon={FileText} label="Terms of Service" onClick={() => console.log("Open ToS")} /> */}
        </section>
      </main>
    </div>
  );
};

export default SettingsScreen;
