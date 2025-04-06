import React, { useState } from 'react';
    import { ArrowLeft, Building, Info, LogOut, ChevronRight, Loader2, MessageSquare, X, Send, CheckCircle } from 'lucide-react'; // Added MessageSquare, X, Send, CheckCircle
    import { AppView, UserMetadata } from '../../types';
    import type { User } from '@supabase/supabase-js';
    import { submitFeedback } from '../../supabaseClient'; // Import the feedback function

    interface SettingsScreenProps {
      currentUser: User | null;
      userMetadata: UserMetadata | null;
      onNavigate: (view: AppView, data?: any) => void;
      onLogout: () => Promise<void>;
      onNavigateToGymSelection: () => void; // Re-use the handler from App.tsx
      onBack: () => void; // Add onBack prop
    }

    // Simple Modal Component (can be extracted later if needed)
    const FeedbackModal: React.FC<{ title: string; feedbackType: 'contact' | 'suggestion'; onClose: () => void; currentUser: User | null }> = ({ title, feedbackType, onClose, currentUser }) => {
      const [message, setMessage] = useState('');
      const [isSubmitting, setIsSubmitting] = useState(false);
      const [error, setError] = useState<string | null>(null);
      const [success, setSuccess] = useState(false);

      const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!message.trim() || !currentUser) {
          setError(!currentUser ? "You must be logged in to send feedback." : "Message cannot be empty.");
          return;
        }
        setIsSubmitting(true);
        setError(null);
        setSuccess(false);

        try {
          await submitFeedback(feedbackType, message);
          setSuccess(true);
          setMessage(''); // Clear message on success
          // Optionally close modal after a delay
          setTimeout(onClose, 2000);
        } catch (err: any) {
          setError(err.message || "An unexpected error occurred.");
        } finally {
          setIsSubmitting(false);
        }
      };

      return (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
            <div className="flex justify-between items-center p-4 border-b">
              <h3 className="text-lg font-semibold text-brand-gray">{title}</h3>
              <button onClick={onClose} disabled={isSubmitting} className="text-gray-400 hover:text-gray-600 disabled:opacity-50">
                <X size={24} />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-4">
              {success ? (
                <div className="text-center py-4">
                  <CheckCircle className="mx-auto text-green-500 mb-2" size={40} />
                  <p className="text-brand-gray font-medium">Feedback Sent!</p>
                  <p className="text-sm text-gray-500">Thank you for your input.</p>
                </div>
              ) : (
                <>
                  <textarea
                    rows={5}
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Enter your message here..."
                    className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue disabled:bg-gray-100"
                    required
                    disabled={isSubmitting || !currentUser}
                  />
                  {error && <p className="text-red-500 text-sm text-center">{error}</p>}
                  {!currentUser && <p className="text-yellow-600 text-sm text-center bg-yellow-50 p-2 rounded border border-yellow-200">You must be logged in to send feedback.</p>}
                  <button
                    type="submit"
                    disabled={isSubmitting || !message.trim() || !currentUser}
                    className="w-full bg-accent-blue hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send size={18} />
                        <span>Send Feedback</span>
                      </>
                    )}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      );
    };


    const SettingsScreen: React.FC<SettingsScreenProps> = ({
      currentUser,
      userMetadata,
      onNavigate,
      onLogout,
      onNavigateToGymSelection,
      onBack,
    }) => {
      const [isLoggingOut, setIsLoggingOut] = useState(false);
      const [showContactForm, setShowContactForm] = useState(false); // State for contact modal

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
          <main className="p-4 space-y-6 pb-10"> {/* Added padding-bottom */}
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

            {/* Support Section - ADDED */}
            <section className="bg-white rounded-lg shadow overflow-hidden">
              <h2 className="text-xs font-semibold uppercase text-gray-500 px-4 pt-3 pb-1">Support</h2>
              <SettingItem
                icon={MessageSquare} // Use MessageSquare icon
                label="Contact Us"
                onClick={() => setShowContactForm(true)} // Open the modal
              />
              {/* Add more support items here if needed (e.g., FAQ link) */}
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

          {/* Contact Us Modal */}
          {showContactForm && (
            <FeedbackModal
              title="Contact Us"
              feedbackType="contact"
              onClose={() => setShowContactForm(false)}
              currentUser={currentUser}
            />
          )}
        </div>
      );
    };

    export default SettingsScreen;
