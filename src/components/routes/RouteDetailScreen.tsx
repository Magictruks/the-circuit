import React, { useState, useEffect, useCallback } from 'react';
import { ArrowLeft, MapPin, User as SetterIcon, CalendarDays, Star, Bookmark, Video, MessageSquareText, PencilLine, ThumbsUp, ThumbsDown, Send, PlusCircle, Loader2, AlertTriangle, Save } from 'lucide-react';
import { RouteData, UserProgress, BetaContent, Comment, BetaType, AppView } from '../../types';
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
  route: RouteData | null | undefined;
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
const getUserDisplayName = (userId: string, currentUser: User | null): string => {
    if (currentUser && userId === currentUser.id) {
        return currentUser.user_metadata?.display_name || 'You';
    }
    // TODO: Fetch profile data for other users later
    return `User ${userId.substring(0, 6)}...`; // Placeholder
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
      const { data, error: fetchError } = await supabase
        .from('route_comments').select('*') // TODO: Join with profiles later
        .eq('route_id', route.id).order('created_at', { ascending: true });
      if (fetchError) { setCommentsError('Failed to load comments.'); setComments([]); }
      else if (data) { setComments(data as Comment[]); } // TODO: Map profile data
      else { setComments([]); }
    } catch (err) { setCommentsError("An unexpected error occurred."); setComments([]); }
    finally { setIsLoadingComments(false); }
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
      const { data, error: fetchError } = await supabase
        .from('route_beta').select('*') // Fetch upvotes count
        .eq('route_id', route.id).order('created_at', { ascending: false });

      if (fetchError) { setBetaError('Failed to load beta.'); setBetaItems([]); }
      else if (data) { setBetaItems(data as BetaContent[]); }
      else { setBetaItems([]); }
    } catch (err) { setBetaError("An unexpected error occurred while loading beta."); setBetaItems([]); }
    finally { setIsLoadingBeta(false); }
  }, [route]);

  // --- Fetch User Votes ---
   const fetchUserVotes = useCallback(async (currentBetaItems: BetaContent[]) => {
       if (!currentUser || currentBetaItems.length === 0) {
           setUserVotes({}); // Clear votes if no user or no beta items
           return;
       }
       const betaIds = currentBetaItems.map(b => b.id);
       console.log("[fetchUserVotes] Fetching votes for user:", currentUser.id, "beta IDs:", betaIds); // Debug log
       try {
           const { data, error } = await supabase
               .from('route_beta_votes')
               .select('beta_id, vote_value')
               .eq('user_id', currentUser.id)
               .in('beta_id', betaIds);

           if (error) {
               console.error("[fetchUserVotes] Error fetching user votes:", error);
               setUserVotes({}); // Clear on error
           } else if (data) {
               const votesMap: UserVoteStatus = {};
               data.forEach(vote => {
                   votesMap[vote.beta_id] = vote.vote_value;
               });
               console.log("[fetchUserVotes] User votes fetched:", votesMap); // Debug log
               setUserVotes(votesMap);
           } else {
               console.log("[fetchUserVotes] No votes found for user."); // Debug log
               setUserVotes({});
           }
       } catch (err) {
           console.error("[fetchUserVotes] Unexpected error fetching user votes:", err);
           setUserVotes({});
       }
   }, [currentUser]); // Dependency on currentUser

  // Fetch beta and user votes when route data is available
  useEffect(() => {
    if (route && !isLoading) {
        console.log("[RouteDetail Effect] Route loaded, fetching beta..."); // Debug log
        fetchBeta(); // Fetch beta first
    } else {
        console.log("[RouteDetail Effect] Route not ready or loading, clearing beta/votes."); // Debug log
        setBetaItems([]); setIsLoadingBeta(false); setBetaError(null); setUserVotes({});
    }
  }, [route, isLoading, fetchBeta]); // Keep dependencies

  // Fetch user votes whenever betaItems change (and user exists)
  useEffect(() => {
      if (betaItems.length > 0 && currentUser) {
          console.log("[Vote Fetch Effect] Beta items updated, fetching user votes..."); // Debug log
          fetchUserVotes(betaItems);
      } else {
          // console.log("[Vote Fetch Effect] No beta items or no user, clearing votes."); // Debug log (can be noisy)
          setUserVotes({}); // Clear votes if beta items are cleared or no user
      }
  }, [betaItems, currentUser, fetchUserVotes]); // Keep dependencies


  // --- Handle Beta Vote ---
  const handleVote = async (betaId: string, voteDirection: 1 | -1) => {
      console.log(`[handleVote] Attempting vote: betaId=${betaId}, direction=${voteDirection}`); // Debug log

      if (!currentUser) {
          console.warn("[handleVote] User must be logged in to vote.");
          // Optionally prompt user to log in
          // alert("Please log in to vote.");
          return;
      }
      console.log("[handleVote] User is logged in:", currentUser.id); // Debug log

      const currentVote = userVotes[betaId];
      let newVoteValue: number;

      if (currentVote === voteDirection) {
          newVoteValue = 0; // Clicked same button again: remove vote
      } else {
          newVoteValue = voteDirection; // New vote or changing vote
      }
      console.log(`[handleVote] Calculated vote: currentVote=${currentVote}, newVoteValue=${newVoteValue}`); // Debug log

      setIsVoting(prev => ({ ...prev, [betaId]: true })); // Set loading state for this specific item
      console.log(`[handleVote] Set isVoting[${betaId}] = true`); // Debug log

      try {
          console.log(`[handleVote] Calling RPC 'handle_beta_vote' with beta_id_in=${betaId}, vote_value_in=${newVoteValue}`); // Debug log
          const { data: newUpvoteCount, error: rpcError } = await supabase.rpc('handle_beta_vote', {
              beta_id_in: betaId,
              vote_value_in: newVoteValue
          });

          if (rpcError) {
              console.error("[handleVote] Error calling handle_beta_vote RPC:", rpcError);
              // TODO: Show error to user (e.g., using a toast notification)
              alert(`Error submitting vote: ${rpcError.message}`);
          } else {
              console.log(`[handleVote] RPC success for ${betaId}. New count: ${newUpvoteCount}`); // Debug log
              // Update local state optimistically
              setUserVotes(prev => {
                  const updatedVotes = { ...prev, [betaId]: newVoteValue };
                  console.log("[handleVote] Updating userVotes state:", updatedVotes); // Debug log
                  return updatedVotes;
              });
              setBetaItems(prevItems => {
                  const updatedItems = prevItems.map(item =>
                      item.id === betaId ? { ...item, upvotes: newUpvoteCount ?? item.upvotes } : item
                  );
                  console.log("[handleVote] Updating betaItems state:", updatedItems); // Debug log
                  return updatedItems;
              });
          }
      } catch (err) {
          console.error("[handleVote] Unexpected error handling vote:", err);
          // TODO: Show error to user
          alert("An unexpected error occurred while voting.");
      } finally {
          setIsVoting(prev => ({ ...prev, [betaId]: false })); // Clear loading state
          console.log(`[handleVote] Set isVoting[${betaId}] = false`); // Debug log
      }
  };


  // --- Handlers for user interactions (Progress) ---
  const handleLogAttempt = () => { const newAttempts = progress.attempts + 1; setProgress(prev => ({ ...prev, attempts: newAttempts })); saveProgress({ attempts: newAttempts }); };
  const handleLogSend = () => { if (progress.sentDate) return; const now = new Date().toISOString(); const newAttempts = progress.attempts < 1 ? 1 : progress.attempts; setProgress(prev => ({ ...prev, sentDate: now, attempts: newAttempts })); saveProgress({ sent_at: now, attempts: newAttempts }); };
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
      const { data, error: insertError } = await supabase
        .from('route_comments').insert({ route_id: route.id, user_id: currentUser.id, comment_text: commentText })
        .select().single();
      if (insertError) { setCommentsError(`Failed to post comment: ${insertError.message}`); }
      else if (data) { setNewComment(''); await fetchComments(); } // Refetch after posting
    } catch (err) { setCommentsError("An unexpected error occurred."); }
    finally { setIsPostingComment(false); }
  };


  // --- Loading and Error Handling for Route Data ---
  if (isLoading) { return ( <div className="min-h-screen flex items-center justify-center bg-gray-100"> <Loader2 className="animate-spin text-accent-blue" size={48} /> </div> ); }
  if (error || !route) { return ( <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center"> <AlertTriangle size={48} className="text-red-500 mb-4" /> <h2 className="text-xl font-semibold text-brand-gray mb-2">Error Loading Route</h2> <p className="text-red-600 mb-6">{error || 'The requested route could not be found.'}</p> <button onClick={onBack} className="bg-accent-blue text-white px-4 py-2 rounded-md hover:bg-opacity-90 flex items-center gap-2"> <ArrowLeft size={18} /> Go Back </button> </div> ); }
  // --- End Loading and Error Handling ---

  // Destructure route data
  const { id: routeId, name, grade, grade_color, location, setter, date_set, description, image_url } = route;
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
             <span className="flex items-center gap-1"><MapPin size={14} /> {location}</span>
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
             <div className="flex gap-2"> <button onClick={handleLogAttempt} className="flex-1 bg-orange-100 text-orange-600 hover:bg-orange-200 font-medium py-2 px-3 rounded text-sm text-center disabled:opacity-50 disabled:cursor-not-allowed">Log Attempt ({progress.attempts})</button> <button onClick={handleLogSend} disabled={!!progress.sentDate} className={`flex-1 font-medium py-2 px-3 rounded text-sm text-center ${progress.sentDate ? 'bg-green-200 text-green-700 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'} disabled:opacity-50 disabled:cursor-not-allowed`}> {progress.sentDate ? `Sent ${new Date(progress.sentDate).toLocaleDateString()}` : 'Log Send'} </button> </div>
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
                          <img src={beta.avatar_url || `https://ui-avatars.com/api/?name=${getUserDisplayName(beta.user_id, currentUser)}&background=random`} alt="User avatar" className="w-8 h-8 rounded-full flex-shrink-0 mt-1"/>
                          <div className="flex-grow">
                             <p className="text-sm font-medium text-brand-gray">{beta.display_name || getUserDisplayName(beta.user_id, currentUser)}</p>
                             {beta.beta_type === 'text' && <p className="text-sm text-gray-700 mt-1">{beta.text_content}</p>}
                             {beta.beta_type === 'video' && beta.content_url && ( <a href={beta.content_url} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 block">Watch Video <Video size={14} className="inline ml-1"/></a> )}
                             {beta.beta_type === 'drawing' && beta.content_url && ( <img src={beta.content_url} alt="Drawing beta" className="mt-1 border rounded max-w-full h-auto" /> )}
                             <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                                <span>{new Date(beta.created_at).toLocaleDateString()}</span>
                                {/* Voting Buttons */}
                                <button
                                    onClick={() => handleVote(beta.id, 1)}
                                    disabled={!currentUser || votingThisItem}
                                    className={`flex items-center gap-1 hover:text-green-600 disabled:opacity-50 ${userVote === 1 ? 'text-green-600 font-semibold' : 'text-gray-500'}`}
                                >
                                    {votingThisItem && userVote !== -1 ? <Loader2 size={14} className="animate-spin"/> : <ThumbsUp size={14}/>}
                                    {beta.upvotes}
                                </button>
                                <button
                                    onClick={() => handleVote(beta.id, -1)}
                                    disabled={!currentUser || votingThisItem}
                                    className={`flex items-center gap-1 hover:text-red-600 disabled:opacity-50 ${userVote === -1 ? 'text-red-600 font-semibold' : 'text-gray-500'}`}
                                >
                                    {votingThisItem && userVote !== 1 ? <Loader2 size={14} className="animate-spin"/> : <ThumbsDown size={14}/>}
                                    {/* Display downvotes if tracked, otherwise just the button */}
                                </button>
                             </div>
                          </div>
                       </div>
                    );
                 }) : (
                   <p className="text-sm text-center text-gray-500 py-4">No {activeBetaTab} beta available yet.</p>
                 )
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
                     <img src={comment.avatar_url || `https://ui-avatars.com/api/?name=${getUserDisplayName(comment.user_id, currentUser)}&background=random`} alt="User avatar" className="w-8 h-8 rounded-full flex-shrink-0 mt-1"/>
                     <div className="flex-grow">
                        <p className="text-sm">
                           <span className="font-medium text-brand-gray">{comment.display_name || getUserDisplayName(comment.user_id, currentUser)}</span>
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
