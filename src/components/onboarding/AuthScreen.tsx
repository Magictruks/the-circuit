import React, { useState } from 'react';
import { Mountain, LogIn, UserPlus } from 'lucide-react';

interface AuthScreenProps {
  onAuthSuccess: () => void;
}

const AuthScreen: React.FC<AuthScreenProps> = ({ onAuthSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null); // Clear previous errors

    if (isLogin) {
      // --- TODO: Implement Actual Login Logic ---
      console.log('Logging in with:', email, password);
      if (email && password) { // Basic validation
         // Simulate successful login for now
         onAuthSuccess();
      } else {
        setError("Please enter email and password.");
      }
      // --- End TODO ---
    } else {
      // --- TODO: Implement Actual Sign Up Logic ---
      console.log('Signing up with:', email, password);
      if (password !== confirmPassword) {
        setError("Passwords do not match.");
        return;
      }
       if (email && password && password.length >= 6) { // Basic validation
         // Simulate successful signup for now
         onAuthSuccess();
       } else {
         setError("Please enter valid email and password (min 6 chars).");
       }
      // --- End TODO ---
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
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-brand-gray mb-1">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue"
              placeholder="••••••••"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-accent-blue"
                placeholder="••••••••"
              />
            </div>
          )}
          <button
            type="submit"
            className="w-full bg-accent-blue hover:bg-opacity-90 text-white font-bold py-2 px-4 rounded-md transition duration-300 flex items-center justify-center space-x-2"
          >
            {isLogin ? <LogIn size={18} /> : <UserPlus size={18} />}
            <span>{isLogin ? 'Log In' : 'Sign Up'}</span>
          </button>
        </form>

        <p className="text-center text-sm text-brand-gray mt-6">
          {isLogin ? "Don't have an account?" : 'Already have an account?'}
          <button
            onClick={() => { setIsLogin(!isLogin); setError(null); }}
            className="text-accent-blue hover:underline font-medium ml-1"
          >
            {isLogin ? 'Sign Up' : 'Log In'}
          </button>
        </p>

        {/* TODO: Add SSO Buttons (Google/Apple) */}
        {/* <div className="mt-6">
          <p className="text-center text-sm text-gray-500 mb-2">Or continue with</p>
          <div className="flex justify-center space-x-4">
             Button placeholders
            <button className="p-2 border rounded-md hover:bg-gray-50">G</button>
            <button className="p-2 border rounded-md hover:bg-gray-50">A</button>
          </div>
        </div> */}
      </div>
    </div>
  );
};

export default AuthScreen;
