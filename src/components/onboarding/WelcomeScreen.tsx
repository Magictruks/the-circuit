import React from 'react';
import { Mountain, MessageSquare, Network } from 'lucide-react'; // Example icons for logo concept

interface WelcomeScreenProps {
  onNext: () => void;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onNext }) => {
  // Basic static welcome screen for now
  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-green to-brand-gray flex flex-col items-center justify-center p-8 text-white">
      <div className="text-center max-w-md">
        {/* Logo Placeholder - Combine icons */}
        <div className="flex justify-center items-center mb-8">
           <Mountain size={48} className="text-accent-yellow mr-2" />
           {/* <MessageSquare size={48} className="text-accent-blue mr-2" /> */}
           {/* <Network size={48} className="text-accent-red" /> */}
           <span className="text-4xl font-bold ml-2">The Circuit</span>
        </div>

        <h1 className="text-4xl font-bold mb-4">Connect, Climb, Conquer.</h1>
        <p className="text-lg mb-8 opacity-90">Your Gym's Beta, In Your Pocket.</p>

        {/* Value Proposition Points (Static for now) */}
        <div className="space-y-4 mb-12 text-left px-4">
          <p>✓ Discover and share routes (beta) in your gym.</p>
          <p>✓ Track your climbs and progress.</p>
          <p>✓ Connect with fellow climbers.</p>
        </div>

        <button
          onClick={onNext}
          className="w-full bg-accent-yellow hover:bg-opacity-90 text-brand-gray font-bold py-3 px-6 rounded-lg transition duration-300 shadow-lg"
        >
          Get Started
        </button>
      </div>
       <div className="absolute bottom-4 text-xs opacity-70">
         Photo by <a href="https://unsplash.com/@scottagoodwill?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noopener noreferrer" className="underline">Scott Goodwill</a> on <a href="https://unsplash.com/photos/white-and-black-mountain-illustration-y8Ngwq34_Ak?utm_content=creditCopyText&utm_medium=referral&utm_source=unsplash" target="_blank" rel="noopener noreferrer" className="underline">Unsplash</a>
       </div>
       {/* Background Image - Optional */}
       <div
         className="absolute inset-0 -z-10 bg-cover bg-center opacity-20"
         style={{ backgroundImage: "url('https://images.unsplash.com/photo-1587404840900-836445ab150f?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')" }} // Example climbing image
       ></div>
    </div>
  );
};

export default WelcomeScreen;
