import React, { useState, useMemo } from 'react';
import { ArrowLeft, Check, Circle, Star, CalendarDays, ChevronDown, Search } from 'lucide-react';
import { RouteData } from '../../types';

interface LogClimbScreenProps {
  availableRoutes: RouteData[]; // All routes for selection (can be filtered later)
  onBack: () => void;
  onSubmitSuccess: () => void;
}

type LogType = 'send' | 'attempt';

const LogClimbScreen: React.FC<LogClimbScreenProps> = ({ availableRoutes, onBack, onSubmitSuccess }) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [logType, setLogType] = useState<LogType>('send');
  const [attempts, setAttempts] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]); // Default to today YYYY-MM-DD
  const [rating, setRating] = useState<number | null>(null); // Optional rating
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeSearchTerm, setRouteSearchTerm] = useState('');
  const [showRouteDropdown, setShowRouteDropdown] = useState(false);

  const selectedRoute = useMemo(() => {
    return availableRoutes.find(r => r.id === selectedRouteId);
  }, [selectedRouteId, availableRoutes]);

  const filteredRoutes = useMemo(() => {
    if (!routeSearchTerm) return availableRoutes; // Show all if no search term
    return availableRoutes.filter(route =>
      route.name.toLowerCase().includes(routeSearchTerm.toLowerCase()) ||
      route.grade.toLowerCase().includes(routeSearchTerm.toLowerCase())
    );
  }, [routeSearchTerm, availableRoutes]);

  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
    setRouteSearchTerm(availableRoutes.find(r => r.id === routeId)?.name || ''); // Update search bar text
    setShowRouteDropdown(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!selectedRouteId) {
      setError('Please select a route.');
      return;
    }

    setIsSubmitting(true);

    // --- TODO: Implement Actual Log Submission Logic ---
    console.log('Submitting Log:', {
      routeId: selectedRouteId,
      routeName: selectedRoute?.name,
      type: logType,
      attempts: logType === 'send' ? attempts : undefined, // Only include attempts for sends
      date: date,
      rating: rating,
      notes: notes,
    });

    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));

    // On successful submission:
    console.log('Log submitted successfully!');
    onSubmitSuccess(); // Navigate back

    // Handle potential API errors here
    // setError("Failed to save log. Please try again.");
    // setIsSubmitting(false);
    // --- End TODO ---
  };

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex items-center">
        <button onClick={onBack} className="mr-4 text-brand-gray hover:text-brand-green">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-brand-green">Log Climb</h1>
      </header>

      {/* Form Content */}
      <form onSubmit={handleSubmit} className="p-4 space-y-5">
        {/* Route Selector */}
        <section>
          <label htmlFor="routeSearch" className="block text-sm font-medium text-brand-gray mb-1">Route</label>
          <div className="relative">
            <div className="flex items-center border border-gray-300 rounded-md bg-white">
               <Search size={18} className="text-gray-400 mx-2 flex-shrink-0" />
               <input
                 type="text"
                 id="routeSearch"
                 placeholder="Search or select route..."
                 value={routeSearchTerm}
                 onChange={(e) => { setRouteSearchTerm(e.target.value); setShowRouteDropdown(true); setSelectedRouteId(''); }}
                 onFocus={() => setShowRouteDropdown(true)}
                 // onBlur={() => setTimeout(() => setShowRouteDropdown(false), 150)} // Delay hiding to allow click
                 className="w-full py-2 pr-8 border-none focus:ring-0 text-sm"
               />
               <ChevronDown size={16} className={`absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 transition-transform ${showRouteDropdown ? 'rotate-180' : ''}`} />
            </div>
            {showRouteDropdown && (
              <div className="absolute top-full left-0 right-0 mt-1 max-h-48 overflow-y-auto bg-white border border-gray-300 rounded-md shadow-lg z-20">
                {filteredRoutes.length > 0 ? (
                  filteredRoutes.map(route => (
                    <button
                      key={route.id}
                      type="button"
                      onClick={() => handleRouteSelect(route.id)}
                      className="block w-full text-left px-3 py-2 text-sm hover:bg-gray-100 truncate"
                    >
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getGradeColorClass(route.gradeColor)}`}></span>
                      {route.name} ({route.grade}) - {route.location}
                    </button>
                  ))
                ) : (
                  <p className="px-3 py-2 text-sm text-gray-500">No routes found.</p>
                )}
              </div>
            )}
          </div>
           {/* Display selected route info */}
           {selectedRoute && !showRouteDropdown && (
             <div className="mt-1 text-xs text-gray-500 pl-2">
               Selected: {selectedRoute.name} ({selectedRoute.grade}) - {selectedRoute.location}
             </div>
           )}
        </section>

        {/* Log Type Selection */}
        <section>
          <label className="block text-sm font-medium text-brand-gray mb-2">Log Type</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setLogType('send')}
              className={`flex items-center justify-center p-3 border rounded-lg transition-colors ${
                logType === 'send'
                  ? 'bg-green-100 border-green-400 text-green-700 ring-1 ring-green-400'
                  : 'bg-white border-gray-300 text-brand-gray hover:bg-gray-50'
              }`}
            >
              <Check size={20} className="mr-2" />
              <span className="text-sm font-medium">Send</span>
            </button>
            <button
              type="button"
              onClick={() => setLogType('attempt')}
              className={`flex items-center justify-center p-3 border rounded-lg transition-colors ${
                logType === 'attempt'
                  ? 'bg-orange-100 border-orange-400 text-orange-700 ring-1 ring-orange-400'
                  : 'bg-white border-gray-300 text-brand-gray hover:bg-gray-50'
              }`}
            >
              <Circle size={20} className="mr-2" />
              <span className="text-sm font-medium">Attempt</span>
            </button>
          </div>
        </section>

        {/* Attempts (Conditional) */}
        {logType === 'send' && (
          <section>
            <label htmlFor="attempts" className="block text-sm font-medium text-brand-gray mb-1">Attempts for Send</label>
            <input
              type="number"
              id="attempts"
              value={attempts}
              onChange={(e) => setAttempts(Math.max(1, parseInt(e.target.value) || 1))} // Ensure at least 1
              min="1"
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue"
            />
          </section>
        )}

        {/* Date */}
        <section>
           <label htmlFor="date" className="block text-sm font-medium text-brand-gray mb-1">Date</label>
           <input
             type="date"
             id="date"
             value={date}
             onChange={(e) => setDate(e.target.value)}
             max={new Date().toISOString().split('T')[0]} // Prevent future dates
             className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue"
           />
        </section>

        {/* Rating (Optional) */}
        <section>
           <label className="block text-sm font-medium text-brand-gray mb-1">Rating / Feel (Optional)</label>
           <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" onClick={() => setRating(rating === star ? null : star)}>
                  <Star
                    size={28}
                    className={star <= (rating || 0) ? 'text-accent-yellow' : 'text-gray-300'}
                    fill={star <= (rating || 0) ? 'currentColor' : 'none'}
                  />
                </button>
              ))}
           </div>
           <p className="text-xs text-gray-500 mt-1">How did it feel for the grade?</p>
        </section>

        {/* Notes */}
        <section>
           <label htmlFor="notes" className="block text-sm font-medium text-brand-gray mb-1">Notes (Private)</label>
           <textarea
              id="notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Any thoughts on the climb, conditions, etc.?"
              className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue"
           />
        </section>

        {/* Error Message */}
        {error && <p className="text-red-500 text-sm text-center">{error}</p>}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !selectedRouteId}
          className="w-full bg-accent-blue hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
             <>
               <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                 <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                 <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
               </svg>
               Saving...
             </>
          ) : (
             'Save Log'
          )}
        </button>
      </form>
    </div>
  );
};

// Helper function (can be moved to utils if needed)
const getGradeColorClass = (colorName: string): string => {
  const colorMap: { [key: string]: string } = {
    'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow',
    'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray',
    'brand-brown': 'bg-brand-brown',
  };
  return colorMap[colorName] || 'bg-gray-400';
};


export default LogClimbScreen;
