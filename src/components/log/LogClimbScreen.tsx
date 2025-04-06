import React, { useState, useMemo, useCallback, useEffect } from 'react';
        import { ArrowLeft, Check, Circle, Star, ChevronDown, Search, Loader2 } from 'lucide-react';
        import { RouteData, ActivityLogDetails, UserRouteProgressData } from '../../types';
        import { supabase } from '../../supabaseClient';
        import type { User } from '@supabase/supabase-js';

        interface LogClimbScreenProps {
          currentUser: User | null;
          activeGymId: string | null;
          availableRoutes: RouteData[]; // This prop now contains only active routes
          onBack: () => void;
          onSubmitSuccess: () => void;
        }

        type LogType = 'send' | 'attempt';

        // Helper function
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

          // State for existing progress data
          const [existingProgress, setExistingProgress] = useState<Partial<UserRouteProgressData> | null>(null);
          const [isLoadingProgress, setIsLoadingProgress] = useState(false);
          const [progressFetchError, setProgressFetchError] = useState<string | null>(null);

          // Filter out removed routes from the availableRoutes prop
          const activeAvailableRoutes = useMemo(() => {
            return availableRoutes.filter(route => !route.removed_at);
          }, [availableRoutes]);

          const selectedRoute = useMemo(() => {
            // Search within the filtered active routes
            return activeAvailableRoutes.find(r => r.id === selectedRouteId);
          }, [selectedRouteId, activeAvailableRoutes]);

          const filteredRoutes = useMemo(() => {
            // Filter within the active routes
            if (!routeSearchTerm) return activeAvailableRoutes;
            return activeAvailableRoutes.filter(route =>
              (route.name?.toLowerCase() || '').includes(routeSearchTerm.toLowerCase()) ||
              (route.grade?.toLowerCase() || '').includes(routeSearchTerm.toLowerCase()) ||
              (route.location_name?.toLowerCase() || '').includes(routeSearchTerm.toLowerCase())
            );
          }, [routeSearchTerm, activeAvailableRoutes]);

          // Function to fetch existing progress for a selected route
          const fetchExistingProgress = useCallback(async (routeId: string) => {
            if (!currentUser || !routeId) {
              setExistingProgress(null);
              setIsLoadingProgress(false);
              setProgressFetchError(null);
              return;
            }
            setIsLoadingProgress(true);
            setProgressFetchError(null);
            try {
              const { data, error: fetchError } = await supabase
                .from('user_route_progress')
                .select('attempts, sent_at, rating, notes, wishlist') // Select all relevant fields
                .eq('user_id', currentUser.id)
                .eq('route_id', routeId)
                .maybeSingle();

              if (fetchError) {
                throw new Error(`Failed to fetch existing progress: ${fetchError.message}`);
              }
              setExistingProgress(data); // Store fetched data (or null if none)
            } catch (err: any) {
              console.error("Error fetching existing progress:", err);
              setProgressFetchError(err.message || "Could not load existing progress.");
              setExistingProgress(null);
            } finally {
              setIsLoadingProgress(false);
            }
          }, [currentUser]);

          // Effect to prefill form when existingProgress changes
          useEffect(() => {
            if (existingProgress) {
              setAttempts(existingProgress.attempts ?? 1); // Default to 1 if attempts is null/0
              setRating(existingProgress.rating ?? null);
              setNotes(existingProgress.notes ?? '');
              // If already sent, default log type to 'send' and use the sent date
              if (existingProgress.sent_at) {
                setLogType('send');
                setDate(new Date(existingProgress.sent_at).toISOString().split('T')[0]);
              } else {
                // If not sent, default to 'send' but keep today's date (user might be logging the send now)
                setLogType('send');
                setDate(new Date().toISOString().split('T')[0]);
              }
            } else {
              // Reset form to defaults if no existing progress
              setLogType('send');
              setAttempts(1);
              setDate(new Date().toISOString().split('T')[0]);
              setRating(null);
              setNotes('');
            }
          }, [existingProgress]);


          const handleRouteSelect = (routeId: string) => {
            setSelectedRouteId(routeId);
            // Find route in the active list
            const route = activeAvailableRoutes.find(r => r.id === routeId);
            setRouteSearchTerm(route ? `${route.name} (${route.grade})` : '');
            setShowRouteDropdown(false);
            // Fetch existing progress for the newly selected route
            fetchExistingProgress(routeId);
          };

          // Function to log activity (no changes needed here)
          const logActivity = useCallback(async (type: 'log_send' | 'log_attempt', route: RouteData, details: ActivityLogDetails) => {
            if (!currentUser) return;
            const { error: logError } = await supabase.from('activity_log').insert({
              user_id: currentUser.id,
              gym_id: route.gym_id,
              route_id: route.id,
              activity_type: type,
              details: details,
            });
            if (logError) console.error(`Error logging ${type} activity:`, logError);
            else console.log(`${type} activity logged successfully.`);
          }, [currentUser]);

          const handleSubmit = async (e: React.FormEvent) => {
            e.preventDefault();
            setError(null);

            if (!currentUser) { setError('You must be logged in to log climbs.'); return; }
            if (!selectedRouteId || !selectedRoute) { setError('Please select a route.'); return; }
            // Add check if selected route is removed (shouldn't happen with filtering, but good practice)
            if (selectedRoute.removed_at) { setError('This route has been removed and cannot be logged.'); return; }


            setIsSubmitting(true);

            try {
              let progressSaveSuccess = false;
              let finalAttempts = 1;

              // Use existingProgress state if available, otherwise fetch fresh (though fetch on select should cover this)
              const currentProgress = existingProgress ?? (await supabase
                .from('user_route_progress')
                .select('attempts, sent_at, wishlist')
                .eq('user_id', currentUser.id)
                .eq('route_id', selectedRouteId)
                .maybeSingle()).data;

              const currentAttempts = currentProgress?.attempts ?? 0;
              const isAlreadySent = !!currentProgress?.sent_at;
              const currentWishlist = currentProgress?.wishlist ?? false;

              let dataToUpsert: Partial<UserRouteProgressData> = {
                user_id: currentUser.id,
                route_id: selectedRouteId,
                rating: rating,
                notes: notes.trim() || null,
                wishlist: currentWishlist,
              };

              if (logType === 'send') {
                finalAttempts = Math.max(1, attempts); // Use state 'attempts', ensure >= 1
                dataToUpsert = {
                  ...dataToUpsert,
                  attempts: finalAttempts,
                  sent_at: new Date(date).toISOString(), // Use selected date
                };
              } else { // logType === 'attempt'
                finalAttempts = currentAttempts + 1;
                dataToUpsert = {
                  ...dataToUpsert,
                  attempts: finalAttempts,
                  ...(isAlreadySent && { sent_at: currentProgress.sent_at }), // Preserve sent_at if already set
                };
              }

              const { error: upsertError } = await supabase
                .from('user_route_progress')
                .upsert(dataToUpsert, { onConflict: 'user_id, route_id' });

              if (upsertError) {
                throw new Error(`Failed to save log: ${upsertError.message}`);
              } else {
                progressSaveSuccess = true;
              }

              if (progressSaveSuccess) {
                const activityDetails: ActivityLogDetails = {
                  route_name: selectedRoute.name,
                  route_grade: selectedRoute.grade,
                  route_grade_color: selectedRoute.grade_color,
                  location_name: selectedRoute.location_name,
                  ...(logType === 'send' && { attempts: finalAttempts }),
                };
                await logActivity(logType === 'send' ? 'log_send' : 'log_attempt', selectedRoute, activityDetails);
                console.log('Log submitted successfully!');
                onSubmitSuccess();
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
                         placeholder="Search or select active route..."
                         value={routeSearchTerm}
                         onChange={(e) => {
                           setRouteSearchTerm(e.target.value);
                           setShowRouteDropdown(true);
                           // Clear selection and existing progress if search term changes manually
                           if (selectedRouteId) {
                             setSelectedRouteId('');
                             setExistingProgress(null);
                             // Reset form fields explicitly if needed
                             setLogType('send'); setAttempts(1); setDate(new Date().toISOString().split('T')[0]); setRating(null); setNotes('');
                           }
                         }}
                         onFocus={() => setShowRouteDropdown(true)}
                         onBlur={() => setTimeout(() => setShowRouteDropdown(false), 150)}
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
                          <p className="px-3 py-2 text-sm text-gray-500">No active routes found.</p>
                        )}
                      </div>
                    )}
                  </div>
                   {/* Display selected route info & loading/error for progress */}
                   {selectedRoute && !showRouteDropdown && (
                     <div className="mt-1 text-xs text-gray-500 pl-2">
                       Selected: {selectedRoute.name} ({selectedRoute.grade}) - {selectedRoute.location_name || 'Unknown Location'}
                       {isLoadingProgress && <span className="ml-2 italic">(Loading progress...)</span>}
                       {progressFetchError && <span className="ml-2 text-red-500 italic">({progressFetchError})</span>}
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
                      disabled={isLoadingProgress} // Disable while loading progress
                      className={`flex items-center justify-center p-3 border rounded-lg transition-colors disabled:opacity-50 ${
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
                      disabled={isLoadingProgress} // Disable while loading progress
                      className={`flex items-center justify-center p-3 border rounded-lg transition-colors disabled:opacity-50 ${
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
                      onChange={(e) => setAttempts(Math.max(1, parseInt(e.target.value) || 1))}
                      min="1"
                      disabled={isLoadingProgress} // Disable while loading progress
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue disabled:bg-gray-100"
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
                     max={new Date().toISOString().split('T')[0]}
                     disabled={isLoadingProgress} // Disable while loading progress
                     className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue disabled:bg-gray-100"
                   />
                </section>

                {/* Rating (Optional) */}
                <section>
                   <label className="block text-sm font-medium text-brand-gray mb-1">Rating / Feel (Optional)</label>
                   <div className="flex gap-1">
                      {[1, 2, 3, 4, 5].map(star => (
                        <button key={star} type="button" onClick={() => setRating(rating === star ? null : star)} disabled={isLoadingProgress}>
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
                      disabled={isLoadingProgress} // Disable while loading progress
                      className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue disabled:bg-gray-100"
                   />
                </section>

                {/* Error Message */}
                {error && <p className="text-red-500 text-sm text-center bg-red-100 p-2 rounded border border-red-300">{error}</p>}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={isSubmitting || isLoadingProgress || !selectedRouteId || !currentUser}
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
