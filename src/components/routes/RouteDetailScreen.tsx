import React, { useState, useEffect, useCallback } from 'react';
    import { ArrowLeft, MapPin, User as SetterIcon, CalendarDays, Star, Bookmark, Video, MessageSquareText, PencilLine, ThumbsUp, ThumbsDown, Send, PlusCircle, Loader2, AlertTriangle, Save } from 'lucide-react';
    import { RouteData, UserProgress, BetaContent, Comment, BetaType, AppView, ActivityLogDetails } from '../../types'; // Import ActivityLogDetails
    import { supabase } from '../../supabaseClient';
    import type { User } from '@supabase/supabase-js';

    // Define the structure for the progress data fetched/saved
    interface UserRouteProgressData {
      user_id: string;
      route_id: string;
      attempts: number;
      sent_at: string | null;
      rating: number | null;
      notes: string;
      wishlist: boolean;
    }

    // Define structure for user's vote status
    interface UserVoteStatus {
        [betaId: string]: number; // e.g., { 'beta-uuid-1': 1, 'beta-uuid-2': -1 } 1=up, -1=down, 0 or undefined=none
    }

    interface RouteDetailScreenProps {
      currentUser: User | null;
      route: RouteData | null | undefined; // Route data now includes location_name
      isLoading: boolean;
      error: string | null;
      onBack: () => void;
      onNavigate: (view: AppView, routeId?: string) => void;
    }

    // Default progress state
    const defaultProgress: UserProgress = { attempts: 0, sentDate: null, rating: null, notes: "", wishlist: false };

    const getGradeColorClass = (colorName: string | undefined): string => {
      if (!colorName) return 'bg-gray-400';
      const colorMap: { [key: string]: string } = {
        'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow',
        'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray',
        'brand-brown': 'bg-brand-brown',
      };
      return colorMap[colorName] || colorMap[colorName.replace('_', '-')] || 'bg-gray-400';
    };

    // Helper to get display name (simple version for now)
    const getUserDisplayName = (userId: string, currentUser: User | null, comment?: Comment | BetaContent): string => {
        // Prefer joined data if available
        if (comment?.display_name) return comment.display_name;
        // Fallback to current user's metadata
        if (currentUser && userId === currentUser.id) {
            return currentUser.user_metadata?.display_name || 'You';
        }
        // TODO: Fetch profile data for other users later if not joined
        return `User ${userId.substring(0, 6)}...`; // Placeholder
    };

    // Helper to get avatar URL
    const getUserAvatarUrl = (commentOrBeta: Comment | BetaContent | null, fallbackUserId?: string): string => {
        const defaultName = fallbackUserId ? `User ${fallbackUserId.substring(0, 6)}` : 'User';
        const fallbackUrl = `https://ui-avatars.com/api/?name=${encodeURIComponent(commentOrBeta?.display_name || defaultName)}&background=random&color=fff`;
        return commentOrBeta?.avatar_url || fallbackUrl;
    };


    const RouteDetailScreen: React.FC<RouteDetailScreenProps> = ({ currentUser, route, isLoading, error, onBack, onNavigate }) => {
      const [progress, setProgress] = useState<UserProgress>(defaultProgress);
      const [isLoadingProgress, setIsLoadingProgress] = useState(false);
      const [isSavingProgress, setIsSavingProgress] = useState(false);
      const [progressError, setProgressError] = useState<string | null>(null);

      // State for Beta (fetched from DB)
      const [betaItems, setBetaItems] = useState<BetaContent[]>([]);
      const [isLoadingBeta, setIsLoadingBeta] = useState(false);
      const [betaError, setBetaError] = useState<string | null>(null);
      const [activeBetaTab, setActiveBetaTab] = useState<BetaType>('text');

      // State for Comments (fetched from DB)
      const [comments, setComments] = useState<Comment[]>([]);
      const [isLoadingComments, setIsLoadingComments] = useState(false);
      const [isPostingComment, setIsPostingComment] = useState(false);
      const [commentsError, setCommentsError] = useState<string | null>(null);
      const [newComment, setNewComment] = useState('');

      // State for Beta Voting
      const [userVotes, setUserVotes] = useState<UserVoteStatus>({});
      const [isVoting, setIsVoting] = useState<{[betaId: string]: boolean}>({}); // Track loading state per beta item

      // --- Fetch User Progress ---
      const fetchUserProgress = useCallback(async () => {
        if (!currentUser || !route) { setProgress(defaultProgress); return; }
        setIsLoadingProgress(true); setProgressError(null);
        try {
          const { data, error: fetchError } = await supabase
            .from('user_route_progress').select('attempts, sent_at, rating, notes, wishlist')
            .eq('user_id', currentUser.id).eq('route_id', route.id).maybeSingle();
          if (fetchError) { setProgressError('Failed to load your progress.'); setProgress(defaultProgress); }
          else if (data) { setProgress({ attempts: data.attempts ?? 0, sentDate: data.sent_at, rating: data.rating, notes: data.notes ?? '', wishlist: data.wishlist ?? false }); }
          else { setProgress(defaultProgress); }
        } catch (err) { setProgressError("An unexpected error occurred."); setProgress(defaultProgress); }
        finally { setIsLoadingProgress(false); }
      }, [currentUser, route]);

      useEffect(() => {
        if (route && currentUser && !isLoading) { fetchUserProgress(); }
        else { setProgress(defaultProgress); setIsLoadingProgress(false); setProgressError(null); }
      }, [route, currentUser, isLoading, fetchUserProgress]);


      // --- Save User Progress ---
      const saveProgress = useCallback(async (updatedFields: Partial<UserRouteProgressData>) => {
        if (!currentUser || !route) { setProgressError("Cannot save progress: User or Route missing."); return; }
        setIsSavingProgress(true); setProgressError(null);
        const dataToSave: UserRouteProgressData = {
          user_id: currentUser.id, route_id: route.id,
          attempts: updatedFields.attempts ?? progress.attempts,
          sent_at: updatedFields.sent_at !== undefined ? updatedFields.sent_at : progress.sentDate,
          rating: updatedFields.rating !== undefined ? updatedFields.rating : progress.rating,
          notes: updatedFields.notes ?? progress.notes,
          wishlist: updatedFields.wishlist ?? progress.wishlist,
        };
        try {
          const { error: saveError } = await supabase.from('user_route_progress').upsert(dataToSave, { onConflict: 'user_id, route_id' });
          if (saveError) { setProgressError(`Failed to save progress: ${saveError.message}`); await fetchUserProgress(); }
        } catch (err) { setProgressError("An unexpected error occurred."); await fetchUserProgress(); }
        finally { setIsSavingProgress(false); }
      }, [currentUser, route, progress, fetchUserProgress]);


      // --- Fetch Comments ---
      const fetchComments = useCallback(async () => {
        if (!route) { setComments([]); return; }
        setIsLoadingComments(true); setCommentsError(null);
        try {
          // Join with profiles to get display_name and avatar_url
          const { data, error: fetchError } = await supabase
            .from('route_comments')
            .select(`
              *,
              profile:profiles!user_id ( display_name, avatar_url )
            `)
            .eq('route_id', route.id)
            .order('created_at', { ascending: true });

          if (fetchError) {
            setCommentsError('Failed to load comments.');
            setComments([]);
          } else if (data) {
            // Map the joined data
            const mappedComments = data.map(comment => ({
              ...comment,
              display_name: (comment.profile as any)?.display_name || undefined, // Type assertion needed if profile can be null
              avatar_url: (comment.profile as any)?.avatar_url || undefined,
            }));
            setComments(mappedComments as Comment[]); // Assert final type
          } else {
            setComments([]);
          }
        } catch (err) {
          setCommentsError("An unexpected error occurred.");
          setComments([]);
        } finally {
          setIsLoadingComments(false);
        }
      }, [route]);

      useEffect(() => {
        if (route && !isLoading) { fetchComments(); }
        else { setComments([]); setIsLoadingComments(false); setCommentsError(null); }
      }, [route, isLoading, fetchComments]);


      // --- Fetch Beta ---
      const fetchBeta = useCallback(async () => {
        if (!route) { setBetaItems([]); return; }
        setIsLoadingBeta(true); setBetaError(null);
        try {
          // Join with profiles
          const { data, error: fetchError } = await supabase
            .from('route_beta')
            .select(`
              *,
              profile:profiles ( display_name, avatar_url )
            `)
            .eq('route_id', route.id)
            .order('created_at', { ascending: false });

          if (fetchError) {
            setBetaError('Failed to load beta.');
            setBetaItems([]);
          } else if (data) {
            // Map joined data
            const mappedBeta = data.map(beta => ({
              ...beta,
              display_name: (beta.profile as any)?.display_name || undefined,
              avatar_url: (beta.profile as any)?.avatar_url || undefined,
            }));
            setBetaItems(mappedBeta as BetaContent[]); // Assert final type
          } else {
            setBetaItems([]);
          }
        } catch (err) {
          setBetaError("An unexpected error occurred while loading beta.");
          setBetaItems([]);
        } finally {
          setIsLoadingBeta(false);
        }
      }, [route]);

      // --- Fetch User Votes ---
       const fetchUserVotes = useCallback(async (currentBetaItems: BetaContent[]) => {
           if (!currentUser || currentBetaItems.length === 0) { setUserVotes({}); return; }
           const betaIds = currentBetaItems.map(b => b.id);
           try {
               const { data, error } = await supabase.from('route_beta_votes').select('beta_id, vote_value').eq('user_id', currentUser.id).in('beta_id', betaIds);
               if (error) { console.error("[fetchUserVotes] Error fetching user votes:", error); setUserVotes({}); }
               else if (data) { const votesMap: UserVoteStatus = {}; data.forEach(vote => { votesMap[vote.beta_id] = vote.vote_value; }); setUserVotes(votesMap); }
               else { setUserVotes({}); }
           } catch (err) { console.error("[fetchUserVotes] Unexpected error fetching user votes:", err); setUserVotes({}); }
       }, [currentUser]);

      // Fetch beta and user votes when route data is available
      useEffect(() => {
        if (route && !isLoading) { fetchBeta(); }
        else { setBetaItems([]); setIsLoadingBeta(false); setBetaError(null); setUserVotes({}); }
      }, [route, isLoading, fetchBeta]);

      // Fetch user votes whenever betaItems change (and user exists)
      useEffect(() => {
          if (betaItems.length > 0 && currentUser) { fetchUserVotes(betaItems); }
          else { setUserVotes({}); }
      }, [betaItems, currentUser, fetchUserVotes]);


      // --- Handle Beta Vote ---
      const handleVote = async (betaId: string, voteDirection: 1 | -1) => {
          if (!currentUser) return;
          const currentVote = userVotes[betaId];
          let newVoteValue: number = (currentVote === voteDirection) ? 0 : voteDirection;
          setIsVoting(prev => ({ ...prev, [betaId]: true }));
          try {
              const { data: newUpvoteCount, error: rpcError } = await supabase.rpc('handle_beta_vote', { beta_id_in: betaId, vote_value_in: newVoteValue });
              if (rpcError) { console.error("[handleVote] Error calling handle_beta_vote RPC:", rpcError); alert(`Error submitting vote: ${rpcError.message}`); }
              else {
                  setUserVotes(prev => ({ ...prev, [betaId]: newVoteValue }));
                  setBetaItems(prevItems => prevItems.map(item => item.id === betaId ? { ...item, upvotes: newUpvoteCount ?? item.upvotes } : item ));
              }
          } catch (err) { console.error("[handleVote] Unexpected error handling vote:", err); alert("An unexpected error occurred while voting."); }
          finally { setIsVoting(prev => ({ ...prev, [betaId]: false })); }
      };


      // --- Handlers for user interactions (Progress) ---
      const handleLogAttempt = () => { const newAttempts = progress.attempts + 1; setProgress(prev => ({ ...prev, attempts: newAttempts })); saveProgress({ attempts: newAttempts }); };
      const handleLogSend = async (currentUser, route ) => {
          console.log("Sending log...");
          console.log('Progress before send:', progress);
          if (progress.sentDate || !route) return; // Added check for route
          const now = new Date().toISOString();
          const newAttempts = progress.attempts < 1 ? 1 : progress.attempts;
          setProgress(prev => ({ ...prev, sentDate: now, attempts: newAttempts }));
          saveProgress({ sent_at: now, attempts: newAttempts });
          console.log("Progress after send:", { ...progress, sentDate: now });

          // Log activity after successful send insertion
            const activityDetails: ActivityLogDetails = {
                route_name: route.name,
                route_grade: route.grade,
                attempts: newAttempts,
                location_name: route.location_name, // Include location name
            };
            const { error: logError } = await supabase.from('activity_log').insert({
                user_id: currentUser.id,
                gym_id: route.gym_id,
                route_id: route.id,
                activity_type: 'log_send',
                details: activityDetails,
            });

            if (logError) console.error('Error logging add_send activity:', logError);
            console.log("Activity logged successfully.");

      };
      const handleRating = (newRating: number) => { const finalRating = progress.rating === newRating ? null : newRating; setProgress(prev => ({ ...prev, rating: finalRating })); saveProgress({ rating: finalRating }); };
      const handleWishlistToggle = () => { const newWishlist = !progress.wishlist; setProgress(prev => ({ ...prev, wishlist: newWishlist })); saveProgress({ wishlist: newWishlist }); };
      const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => { setProgress(prev => ({ ...prev, notes: e.target.value })); };
      const handleNotesBlur = () => { saveProgress({ notes: progress.notes }); };


      // --- Post Comment Handler ---
      const handlePostComment = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!currentUser || !route || !newComment.trim()) return;
        setIsPostingComment(true); setCommentsError(null);
        const commentText = newComment.trim();
        try {
          // Insert the comment
          const { data: insertedComment, error: insertError } = await supabase
            .from('route_comments').insert({ route_id: route.id, user_id: currentUser.id, comment_text: commentText })
            .select().single();

          if (insertError) {
            setCommentsError(`Failed to post comment: ${insertError.message}`);
          } else if (insertedComment) {
            // Log activity after successful comment insertion
            const activityDetails: ActivityLogDetails = {
              route_name: route.name,
              route_grade: route.grade,
              comment_snippet: commentText.substring(0, 50) + (commentText.length > 50 ? '...' : ''), // Add a snippet
              location_name: route.location_name, // Include location name
            };
            const { error: logError } = await supabase.from('activity_log').insert({
              user_id: currentUser.id,
              gym_id: route.gym_id,
              route_id: route.id,
              activity_type: 'add_comment',
              details: activityDetails,
            });
            if (logError) console.error('Error logging add_comment activity:', logError);

            setNewComment('');
            await fetchComments(); // Refetch comments to include the new one with profile data
          }
        } catch (err) {
          setCommentsError("An unexpected error occurred.");
        } finally {
          setIsPostingComment(false);
        }
      };


      // --- Loading and Error Handling for Route Data ---
      if (isLoading) { return ( <div className="min-h-screen flex items-center justify-center bg-gray-100"> <Loader2 className="animate-spin text-accent-blue" size={48} /> </div> ); }
      if (error || !route) { return ( <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center"> <AlertTriangle size={48} className="text-red-500 mb-4" /> <h2 className="text-xl font-semibold text-brand-gray mb-2">Error Loading Route</h2> <p className="text-red-600 mb-6">{error || 'The requested route could not be found.'}</p> <button onClick={onBack} className="bg-accent-blue text-white px-4 py-2 rounded-md hover:bg-opacity-90 flex items-center gap-2"> <ArrowLeft size={18} /> Go Back </button> </div> ); }
      // --- End Loading and Error Handling ---

      // Destructure route data, including location_name
      const { id: routeId, name, grade, grade_color, location_name, setter, date_set, description, image_url } = route; // Removed 'location'
      // Determine display location
      const displayLocation = location_name || 'Unknown Location'; // Use location_name or a default
      // Filter beta based on the active tab *after* fetching
      const filteredBeta = betaItems.filter(beta => beta.beta_type === activeBetaTab);

      return (
        <div className="min-h-screen bg-gray-100">
          {/* Header */}
          <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex items-center">
            <button onClick={onBack} className="mr-4 text-brand-gray hover:text-brand-green"> <ArrowLeft size={24} /> </button>
            <div className="flex-grow overflow-hidden">
               <h1 className="text-xl font-bold text-brand-green truncate">{name}</h1>
               <div className="flex items-center text-sm text-gray-500 gap-x-3 flex-wrap">
                 <span className={`font-semibold px-1.5 py-0.5 rounded text-white text-xs ${getGradeColorClass(grade_color)}`}>{grade}</span>
                 {/* Use displayLocation */}
                 <span className="flex items-center gap-1"><MapPin size={14} /> {displayLocation}</span>
               </div>
            </div>
             <button onClick={handleWishlistToggle} disabled={isSavingProgress || isLoadingProgress} className={`ml-4 p-1 rounded disabled:opacity-50 ${progress.wishlist ? 'text-accent-yellow' : 'text-gray-400 hover:text-accent-yellow/80'}`}>
                {isSavingProgress && progress.wishlist !== undefined ? <Loader2 size={24} className="animate-spin"/> : <Bookmark size={24} fill={progress.wishlist ? 'currentColor' : 'none'} />}
             </button>
          </header>

          {/* Main Content */}
          <main className="p-4 space-y-6">
            {/* Visual Section */}
            <section className="bg-white rounded-lg shadow overflow-hidden">
               {image_url ? ( <img src={image_url} alt={`Photo of ${name}`} className="w-full h-48 object-cover" /> ) : ( <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-brand-gray"> <MapPin size={48} /> </div> )}
               <div className="p-4">
                 <div className="flex items-center text-sm text-gray-600 mb-2 gap-x-4 gap-y-1 flex-wrap">
                    {setter && <span className="flex items-center gap-1"><SetterIcon size={14} /> Set by {setter}</span>}
                    <span className="flex items-center gap-1"><CalendarDays size={14} /> Set on {new Date(date_set).toLocaleDateString()}</span>
                 </div>
                 {description && <p className="text-sm text-brand-gray">{description}</p>}
               </div>
            </section>

            {/* Your Progress Section */}
            <section className="bg-white p-4 rounded-lg shadow relative">
               {(isLoadingProgress || isSavingProgress) && ( <div className="absolute inset-0 bg-white/70 flex items-center justify-center z-10 rounded-lg"> <Loader2 className="animate-spin text-accent-blue" size={24} /> <span className="ml-2 text-sm text-brand-gray">{isLoadingProgress ? 'Loading Progress...' : 'Saving...'}</span> </div> )}
               <h2 className="text-lg font-semibold text-brand-gray mb-3">Your Progress</h2>
               {progressError && <p className="text-red-500 text-sm mb-3 text-center">{progressError}</p>}
               <fieldset disabled={isLoadingProgress || isSavingProgress} className="space-y-4">
                 <div className="flex gap-2"> <button onClick={handleLogAttempt} className="flex-1 bg-orange-100 text-orange-600 hover:bg-orange-200 font-medium py-2 px-3 rounded text-sm text-center disabled:opacity-50 disabled:cursor-not-allowed">Log Attempt ({progress.attempts})</button> <button onClick={() => handleLogSend(currentUser, route)} disabled={!!progress.sentDate} className={`flex-1 font-medium py-2 px-3 rounded text-sm text-center ${progress.sentDate ? 'bg-green-200 text-green-700 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'} disabled:opacity-50 disabled:cursor-not-allowed`}> {progress.sentDate ? `Sent ${new Date(progress.sentDate).toLocaleDateString()}` : 'Log Send'} </button> </div>
                 <div> <label className="block text-sm font-medium text-brand-gray mb-1">Your Rating</label> <div className="flex gap-1">{[1, 2, 3, 4, 5].map(star => (<button key={star} onClick={() => handleRating(star)}><Star size={24} className={star <= (progress.rating || 0) ? 'text-accent-yellow' : 'text-gray-300'} fill={star <= (progress.rating || 0) ? 'currentColor' : 'none'} /></button>))}</div> </div>
                 <div> <label htmlFor="personalNotes" className="block text-sm font-medium text-brand-gray mb-1">Private Notes</label> <textarea id="personalNotes" rows={3} value={progress.notes} onChange={handleNotesChange} onBlur={handleNotesBlur} placeholder="Add your personal beta, reminders, etc." className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue disabled:bg-gray-100" /> </div>
               </fieldset>
            </section>

            {/* Community Beta Section */}
            <section className="bg-white rounded-lg shadow">
               <div className="flex justify-between items-center p-4 border-b"> <h2 className="text-lg font-semibold text-brand-gray">Community Beta</h2> <button onClick={() => onNavigate('addBeta', routeId)} className="bg-accent-blue text-white text-xs font-semibold px-3 py-1 rounded-full hover:bg-opacity-90 flex items-center gap-1"> <PlusCircle size={14}/> Add Beta </button> </div>
               <div className="flex border-b"> <button onClick={() => setActiveBetaTab('text')} className={`flex-1 py-2 text-center text-sm font-medium ${activeBetaTab === 'text' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50'}`}><MessageSquareText size={16} className="inline mr-1 mb-0.5"/> Tips</button> <button onClick={() => setActiveBetaTab('video')} className={`flex-1 py-2 text-center text-sm font-medium ${activeBetaTab === 'video' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50'}`}><Video size={16} className="inline mr-1 mb-0.5"/> Videos</button> <button onClick={() => setActiveBetaTab('drawing')} className={`flex-1 py-2 text-center text-sm font-medium ${activeBetaTab === 'drawing' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50'}`}><PencilLine size={16} className="inline mr-1 mb-0.5"/> Drawings</button> </div>
               {/* Beta Loading/Error/Content */}
               <div className="p-4 space-y-4 max-h-60 overflow-y-auto">
                  {isLoadingBeta && <div className="flex justify-center items-center py-4"><Loader2 className="animate-spin text-accent-blue" size={24} /></div>}
                  {betaError && <p className="text-red-500 text-sm text-center py-4">{betaError}</p>}
                  {!isLoadingBeta && !betaError && (
                     filteredBeta.length > 0 ? filteredBeta.map(beta => {
                        const userVote = userVotes[beta.id];
                        const votingThisItem = isVoting[beta.id];
                        return (
                           <div key={beta.id} className="flex gap-3 border-b pb-3 last:border-b-0">
                              <img src={getUserAvatarUrl(beta, beta.user_id)} alt="User avatar" className="w-8 h-8 rounded-full flex-shrink-0 mt-1"/>
                              <div className="flex-grow">
                                 <p className="text-sm font-medium text-brand-gray">{getUserDisplayName(beta.user_id, currentUser, beta)}</p>
                                 {beta.beta_type === 'text' && <p className="text-sm text-gray-700 mt-1">{beta.text_content}</p>}
                                 {beta.beta_type === 'video' && beta.content_url && ( <a href={beta.content_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 block">Watch Video <Video size={14} className="inline ml-1"/></a> )}
                                 {beta.beta_type === 'drawing' && beta.content_url && ( <img src={beta.content_url} alt="Drawing beta" className="mt-1 border rounded max-w-full h-auto" /> )}
                                 <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                                    <span>{new Date(beta.created_at).toLocaleDateString()}</span>
                                    {/* Voting Buttons */}
                                    <button onClick={() => handleVote(beta.id, 1)} disabled={!currentUser || votingThisItem} className={`flex items-center gap-1 hover:text-green-600 disabled:opacity-50 ${userVote === 1 ? 'text-green-600 font-semibold' : 'text-gray-500'}`}> {votingThisItem && userVote !== -1 ? <Loader2 size={14} className="animate-spin"/> : <ThumbsUp size={14}/>} {beta.upvotes} </button>
                                    <button onClick={() => handleVote(beta.id, -1)} disabled={!currentUser || votingThisItem} className={`flex items-center gap-1 hover:text-red-600 disabled:opacity-50 ${userVote === -1 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}> {votingThisItem && userVote !== 1 ? <Loader2 size={14} className="animate-spin"/> : <ThumbsDown size={14}/>} </button>
                                 </div>
                              </div>
                           </div>
                        );
                     }) : ( <p className="text-sm text-center text-gray-500 py-4">No {activeBetaTab} beta available yet.</p> )
                  )}
               </div>
            </section>

            {/* Discussion Section */}
            <section className="bg-white p-4 rounded-lg shadow">
               <h2 className="text-lg font-semibold text-brand-gray mb-3">Discussion</h2>
               {isLoadingComments && <div className="flex justify-center items-center py-4"><Loader2 className="animate-spin text-accent-blue" size={24} /></div>}
               {commentsError && <p className="text-red-500 text-sm text-center py-4">{commentsError}</p>}
               {!isLoadingComments && !commentsError && (
                 <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                    {comments.length > 0 ? comments.map(comment => (
                      <div key={comment.id} className="flex gap-3 border-b pb-3 last:border-b-0">
                         <img src={getUserAvatarUrl(comment, comment.user_id)} alt="User avatar" className="w-8 h-8 rounded-full flex-shrink-0 mt-1"/>
                         <div className="flex-grow">
                            <p className="text-sm">
                               <span className="font-medium text-brand-gray">{getUserDisplayName(comment.user_id, currentUser, comment)}</span>
                               <span className="text-xs text-gray-400 ml-1">{new Date(comment.created_at).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</span>
                            </p>
                            <p className="text-sm text-gray-700 mt-1">{comment.comment_text}</p>
                         </div>
                      </div>
                    )) : ( <p className="text-sm text-center text-gray-500 py-4">No comments yet. Start the discussion!</p> )}
                 </div>
               )}
               <form onSubmit={handlePostComment} className="flex gap-2 items-center pt-2 border-t">
                  <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder={currentUser ? "Add a comment..." : "Log in to comment"} className="flex-grow p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue disabled:bg-gray-100" disabled={!currentUser || isPostingComment} />
                  <button type="submit" className="bg-accent-blue text-white p-2 rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed" disabled={!currentUser || !newComment.trim() || isPostingComment}> {isPostingComment ? <Loader2 size={20} className="animate-spin"/> : <Send size={20} />} </button>
               </form>
            </section>

          </main>
        </div>
      );
    };

    export default RouteDetailScreen;
