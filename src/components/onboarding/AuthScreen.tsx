import React, { useState } from 'react';
import { Mountain, LogIn, UserPlus } from 'lucide-react';
import { supabase } from '../../supabaseClient'; // Import the Supabase client

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState(''); // Add state for display name
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false); // Add loading state

  const handleLogin = async () => {
    setLoading(true);
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });

    if (error) {
      setError(error.message);
    } else {
      console.log('Login successful!');
      onAuthSuccess(); // Proceed to next step on success
    }
    setLoading(false);
  };

  const handleSignUp = async () => {
    setLoading(true);
    setError(null);
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      setLoading(false);
      return;
    }
    if (password.length < 6) {
        setError("Password must be at least 6 characters long.");
        setLoading(false);
        return;
    }
    if (!displayName.trim()) { // Add validation for display name
        setError("Please enter a display name.");
        setLoading(false);
        return;
    }

    const { data ,error } = await supabase.auth.signUp({
      email: email,
      password: password,
      options: {
        // Disable email confirmation
        emailRedirectTo: undefined,
        // Add display name to user metadata
        data: {
          display_name: displayName.trim(), // Pass the display name here
        }
      }
    });

    if (error) {
      setError(error.message);
    } else {
      console.log('Sign up successful! Display name added.');
      if (data?.user?.id) {
        // Optionally, you can insert the display name into a user profile table here
        await supabase.from('profiles').update({ display_name: displayName.trim() }).eq('user_id', data.user.id);
      }
      // For this app, we assume immediate success without email confirmation
      // TODO: Consider creating a user profile row in a separate 'profiles' table upon signup.
      onAuthSuccess(); // Proceed to next step on success
    }
    setLoading(false);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return; // Prevent multiple submissions

    if (isLogin) {
      handleLogin();
    } else {
      handleSignUp();
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center justify-center p-4">
       <div className="flex justify-center items-center mb-8 text-brand-green">
           <Mountain size={36} className="text-accent-yellow mr-2" />
           <span className="text-3xl font-bold">The Circuit</span>
        </div>
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center text-brand-gray mb-6">
          {isLogin ? 'Welcome Back!' : 'Create Account'}
        </h2>

        {error && <p className="text-red-500 text-sm mb-4 text-center">{error}</p>}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Display Name Input (only for Sign Up) */}
          {!isLogin && (
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-brand-gray mb-1">Display Name</label>
              <input
                type="text"
                id="displayName"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue disabled:bg-gray-100"
                placeholder="Your Climber Name"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-brand-gray mb-1">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue disabled:bg-gray-100"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-brand-gray mb-1">Password</label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue disabled:bg-gray-100"
              placeholder="•••••••• (min. 6 characters)"
            />
          </div>
          {!isLogin && (
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-brand-gray mb-1">Confirm Password</label>
              <input
                type="password"
                id="confirmPassword"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                disabled={loading}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue disabled:bg-gray-100"
                placeholder="••••••••"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-accent-blue hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Processing...
              </>
            ) : (
              <>
                {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
                <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
              </>
            )}
          </button>
        </form>

        <p className="text-center text-sm text-brand-gray mt-6">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => { if (!loading) { setIsLogin(!isLogin); setError(null); setDisplayName(''); setPassword(''); setConfirmPassword(''); }}} // Reset fields on switch
            disabled={loading}
            className="text-accent-blue hover:underline font-medium ml-1 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>

        {/* TODO: Add SSO Buttons (Google/Apple) - Requires Supabase config */}
        {/* <div className="mt-6"> ... </div> */}
      </div>
    </div>
  );
};

export default AuthScreen;
