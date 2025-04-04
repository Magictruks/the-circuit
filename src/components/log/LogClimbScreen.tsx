import React, { useState, useMemo, useCallback } from 'react';
import { ArrowLeft, Check, Circle, Star, ChevronDown, Search, Loader2 } from 'lucide-react';
import { RouteData, ActivityLogDetails, UserRouteProgressData } from '../../types'; // Added UserRouteProgressData
import { supabase } from '../../supabaseClient';
import type { User } from '@supabase/supabase-js';

interface LogClimbScreenProps {
  currentUser: User | null;
  activeGymId: string | null; // Keep for context, though route.gym_id is primary
  availableRoutes: RouteData[];
  onBack: () => void;
  onSubmitSuccess: () => void;
}

type LogType = 'send' | 'attempt';

// Helper function (can be moved to utils if needed)
const getGradeColorClass = (colorName: string | undefined): string => {
  if (!colorName) return 'bg-gray-400';
  const colorMap: { [key: string]: string } = {
    'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow',
    'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray',
    'brand-brown': 'bg-brand-brown',
  };
  return colorMap[colorName] || colorMap[colorName.replace('_', '-')] || 'bg-gray-400';
};


const LogClimbScreen: React.FC<LogClimbScreenProps> = ({ currentUser, activeGymId, availableRoutes, onBack, onSubmitSuccess }) => {
  const [selectedRouteId, setSelectedRouteId] = useState<string>('');
  const [logType, setLogType] = useState<LogType>('send');
  const [attempts, setAttempts] = useState<number>(1);
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]); // YYYY-MM-DD
  const [rating, setRating] = useState<number | null>(null);
  const [notes, setNotes] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeSearchTerm, setRouteSearchTerm] = useState('');
  const [showRouteDropdown, setShowRouteDropdown] = useState(false);

  const selectedRoute = useMemo(() => {
    return availableRoutes.find(r => r.id === selectedRouteId);
  }, [selectedRouteId, availableRoutes]);

  const filteredRoutes = useMemo(() => {
    if (!routeSearchTerm) return availableRoutes;
    return availableRoutes.filter(route =>
      (route.name?.toLowerCase() || '').includes(routeSearchTerm.toLowerCase()) ||
      (route.grade?.toLowerCase() || '').includes(routeSearchTerm.toLowerCase()) ||
      (route.location_name?.toLowerCase() || '').includes(routeSearchTerm.toLowerCase()) // Search location_name
    );
  }, [routeSearchTerm, availableRoutes]);

  const handleRouteSelect = (routeId: string) => {
    setSelectedRouteId(routeId);
    const route = availableRoutes.find(r => r.id === routeId);
    setRouteSearchTerm(route ? `${route.name} (${route.grade})` : ''); // Update search bar text
    setShowRouteDropdown(false);
  };

  // Function to log activity
  const logActivity = useCallback(async (type: 'log_send' | 'log_attempt', route: RouteData, details: ActivityLogDetails) => {
    if (!currentUser) return;

    const { error: logError } = await supabase.from('activity_log').insert({
      user_id: currentUser.id,
      gym_id: route.gym_id, // Use gym_id from the selected route
      route_id: route.id,
      activity_type: type,
      details: details,
    });

    if (logError) {
      console.error(`Error logging ${type} activity:`, logError);
      // Non-critical error, maybe log to monitoring
    } else {
      console.log(`${type} activity logged successfully.`);
    }
  }, [currentUser]); // currentUser is a dependency

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!currentUser) { setError('You must be logged in to log climbs.'); return; }
    if (!selectedRouteId || !selectedRoute) { setError('Please select a route.'); return; }

    setIsSubmitting(true);

    try {
      let progressSaveSuccess = false;
      let finalAttempts = 1; // Default for new entries or sends

      // Fetch existing progress to handle attempts correctly
      const { data: existingProgress, error: fetchError } = await supabase
        .from('user_route_progress')
        .select('attempts, sent_at, wishlist') // Select needed fields
        .eq('user_id', currentUser.id)
        .eq('route_id', selectedRouteId)
        .maybeSingle();

      if (fetchError) {
        throw new Error(`Failed to check existing progress: ${fetchError.message}`);
      }

      const currentAttempts = existingProgress?.attempts ?? 0;
      const isAlreadySent = !!existingProgress?.sent_at;
      const currentWishlist = existingProgress?.wishlist ?? false; // Preserve wishlist status

      let dataToUpsert: Partial<UserRouteProgressData> = {
        user_id: currentUser.id,
        route_id: selectedRouteId,
        rating: rating,
        notes: notes.trim() || null, // Store null if notes are empty
        wishlist: currentWishlist, // Preserve wishlist status
      };

      if (logType === 'send') {
        // If logging a send, set sent_at and ensure attempts >= 1
        finalAttempts = Math.max(1, attempts); // Use state 'attempts', ensure >= 1
        dataToUpsert = {
          ...dataToUpsert,
          attempts: finalAttempts,
          sent_at: new Date(date).toISOString(), // Use selected date
        };
      } else { // logType === 'attempt'
        // If logging an attempt, increment attempts, keep sent_at null (unless already sent)
        finalAttempts = currentAttempts + 1;
        dataToUpsert = {
          ...dataToUpsert,
          attempts: finalAttempts,
          // Only set sent_at if it was already set (don't unset a send by logging an attempt)
          ...(isAlreadySent && { sent_at: existingProgress.sent_at }),
        };
      }

      // Upsert the progress data
      const { error: upsertError } = await supabase
        .from('user_route_progress')
        .upsert(dataToUpsert, { onConflict: 'user_id, route_id' });

      if (upsertError) {
        throw new Error(`Failed to save log: ${upsertError.message}`);
      } else {
        progressSaveSuccess = true;
      }

      // --- Post-Save Actions ---
      if (progressSaveSuccess) {
        // Log activity *after* successful progress save
        const activityDetails: ActivityLogDetails = {
          route_name: selectedRoute.name,
          route_grade: selectedRoute.grade,
          route_grade_color: selectedRoute.grade_color, // Add color
          location_name: selectedRoute.location_name, // Add location name
          // Add attempts only for 'send' logs
          ...(logType === 'send' && { attempts: finalAttempts }),
        };
        await logActivity(logType === 'send' ? 'log_send' : 'log_attempt', selectedRoute, activityDetails);

        console.log('Log submitted successfully!');
        onSubmitSuccess(); // Navigate back
      }

    } catch (err: any) {
      console.error("Error during log submission:", err);
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 pb-10">
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
                 onBlur={() => setTimeout(() => setShowRouteDropdown(false), 150)} // Delay hiding to allow click
                 className="w-full py-2 pr-8 border-none focus:ring-0 text-sm"
                 autoComplete="off"
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
                      <span className={`inline-block w-3 h-3 rounded-full mr-2 ${getGradeColorClass(route.grade_color)}`}></span>
                      {route.name} ({route.grade}) - {route.location_name || 'Unknown Location'}
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
               Selected: {selectedRoute.name} ({selectedRoute.grade}) - {selectedRoute.location_name || 'Unknown Location'}
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

        {/* Attempts (Conditional for Send) */}
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
        {error && <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded border border-red-300">{error}</p>}

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isSubmitting || !selectedRouteId || !currentUser}
          className="w-full bg-accent-blue hover:bg-opacity-90 text-white font-bold py-3 px-6 rounded-lg transition duration-300 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
        >
          {isSubmitting ? (
             <>
               <Loader2 className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" />
               Saving...
             </>
          ) : (
             'Save Log'
          )}
        </button>
        {!currentUser && <p className="text-xs text-center text-red-600 mt-2">You must be logged in to log climbs.</p>}
      </form>
    </div>
  );
};

export default LogClimbScreen;
