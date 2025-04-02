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

// --- Placeholder Data for Beta (Keep for now) ---
const placeholderBeta: BetaContent[] = [];
// --- End Placeholder Data ---

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
    // In a real app, fetch profile data here based on userId
    // For now, just return a placeholder or the current user's name if it matches
    if (currentUser && userId === currentUser.id) {
        return currentUser.user_metadata?.display_name || 'You';
    }
    return `User ${userId.substring(0, 6)}...`; // Placeholder
};

const RouteDetailScreen: React.FC<RouteDetailScreenProps> = ({ currentUser, route, isLoading, error, onBack, onNavigate }) => {
  const [progress, setProgress] = useState<UserProgress>(defaultProgress);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);
  const [isSavingProgress, setIsSavingProgress] = useState(false);
  const [progressError, setProgressError] = useState<string | null>(null);

  // State for Beta (still using placeholders)
  const [betaItems, setBetaItems] = useState<BetaContent[]>(placeholderBeta);
  const [activeBetaTab, setActiveBetaTab] = useState<BetaType>('text');

  // State for Comments (fetched from DB)
  const [comments, setComments] = useState<Comment[]>([]);
  const [isLoadingComments, setIsLoadingComments] = useState(false);
  const [isPostingComment, setIsPostingComment] = useState(false);
  const [commentsError, setCommentsError] = useState<string | null>(null);
  const [newComment, setNewComment] = useState('');

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
    if (!route) { setComments([]); return; } // No route, no comments
    console.log(`[RouteDetail] Fetching comments for route ${route.id}`);
    setIsLoadingComments(true);
    setCommentsError(null);
    try {
      const { data, error: fetchError } = await supabase
        .from('route_comments')
        .select('*') // Select all columns for now
        // TODO: Select profile data later: .select('*, profiles(display_name, avatar_url)')
        .eq('route_id', route.id)
        .order('created_at', { ascending: true }); // Show oldest first

      if (fetchError) {
        console.error('[RouteDetail] Error fetching comments:', fetchError);
        setCommentsError('Failed to load comments.');
        setComments([]);
      } else if (data) {
        console.log('[RouteDetail] Comments fetched:', data);
        // TODO: Map profile data if joined later
        setComments(data as Comment[]); // Cast for now, ensure type matches
      } else {
        setComments([]); // No comments found
      }
    } catch (err) {
      console.error("[RouteDetail] Unexpected error fetching comments:", err);
      setCommentsError("An unexpected error occurred while loading comments.");
      setComments([]);
    } finally {
      setIsLoadingComments(false);
    }
  }, [route]); // Dependency: route

  // Fetch comments when route data is available
  useEffect(() => {
    if (route && !isLoading) { // Ensure route is loaded
      fetchComments();
    } else {
      // Reset comments if route changes or becomes unavailable
      setComments([]);
      setIsLoadingComments(false);
      setCommentsError(null);
    }
  }, [route, isLoading, fetchComments]); // Add fetchComments to dependencies


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

    setIsPostingComment(true);
    setCommentsError(null);
    const commentText = newComment.trim();

    try {
      const { data, error: insertError } = await supabase
        .from('route_comments')
        .insert({
          route_id: route.id,
          user_id: currentUser.id,
          comment_text: commentText,
        })
        .select() // Select the newly inserted row
        .single(); // Expect a single row back

      if (insertError) {
        console.error('[RouteDetail] Error posting comment:', insertError);
        setCommentsError(`Failed to post comment: ${insertError.message}`);
      } else if (data) {
        console.log('[RouteDetail] Comment posted successfully:', data);
        setNewComment(''); // Clear input field
        // Optimistic update (add comment locally) or refetch
        // Refetching is simpler for now:
        await fetchComments();
      }
    } catch (err) {
      console.error("[RouteDetail] Unexpected error posting comment:", err);
      setCommentsError("An unexpected error occurred while posting your comment.");
    } finally {
      setIsPostingComment(false);
    }
  };


  // --- Loading and Error Handling for Route Data ---
  if (isLoading) { return ( <div className="min-h-screen flex items-center justify-center bg-gray-100"> <Loader2 className="animate-spin text-accent-blue" size={48} /> </div> ); }
  if (error || !route) { return ( <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center"> <AlertTriangle size={48} className="text-red-500 mb-4" /> <h2 className="text-xl font-semibold text-brand-gray mb-2">Error Loading Route</h2> <p className="text-red-600 mb-6">{error || 'The requested route could not be found.'}</p> <button onClick={onBack} className="bg-accent-blue text-white px-4 py-2 rounded-md hover:bg-opacity-90 flex items-center gap-2"> <ArrowLeft size={18} /> Go Back </button> </div> ); }
  // --- End Loading and Error Handling ---

  // Destructure route data
  const { id: routeId, name, grade, grade_color, location, setter, date_set, description, image_url } = route;
  const filteredBeta = betaItems.filter(beta => beta.type === activeBetaTab);

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
           <div className="p-4 space-y-4 max-h-60 overflow-y-auto"> {filteredBeta.length > 0 ? filteredBeta.map(beta => ( <div key={beta.id} className="flex gap-3 border-b pb-3 last:border-b-0"> <img src={beta.userAvatarUrl || `https://ui-avatars.com/api/?name=${beta.username}&background=random`} alt={beta.username} className="w-8 h-8 rounded-full flex-shrink-0 mt-1"/> <div className="flex-grow"> <p className="text-sm font-medium text-brand-gray">{beta.username}</p> {beta.type === 'text' && <p className="text-sm text-gray-700 mt-1">{beta.textContent}</p>} {beta.type === 'video' && <a href={beta.contentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 block">Watch Video <Video size={14} className="inline ml-1"/></a>} <div className="flex items-center gap-3 text-xs text-gray-500 mt-2"> <span>{new Date(beta.timestamp).toLocaleDateString()}</span> <button className="flex items-center gap-1 hover:text-green-600"><ThumbsUp size={14}/> {beta.upvotes}</button> <button className="flex items-center gap-1 hover:text-red-600"><ThumbsDown size={14}/> {/* Downvote count */}</button> </div> </div> </div> )) : ( <p className="text-sm text-center text-gray-500 py-4">No {activeBetaTab} beta available yet.</p> )} </div>
        </section>

        {/* Discussion Section */}
        <section className="bg-white p-4 rounded-lg shadow">
           <h2 className="text-lg font-semibold text-brand-gray mb-3">Discussion</h2>
           {/* Loading/Error state for comments */}
           {isLoadingComments && <div className="flex justify-center items-center py-4"><Loader2 className="animate-spin text-accent-blue" size={24} /></div>}
           {commentsError && <p className="text-red-500 text-sm text-center py-4">{commentsError}</p>}
           {!isLoadingComments && !commentsError && (
             <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
                {comments.length > 0 ? comments.map(comment => (
                  <div key={comment.id} className="flex gap-3 border-b pb-3 last:border-b-0">
                     {/* TODO: Replace with actual avatar */}
                     <img src={comment.avatar_url || `https://ui-avatars.com/api/?name=${getUserDisplayName(comment.user_id, currentUser)}&background=random`} alt="User avatar" className="w-8 h-8 rounded-full flex-shrink-0 mt-1"/>
                     <div className="flex-grow">
                        <p className="text-sm">
                           {/* TODO: Replace with actual display name */}
                           <span className="font-medium text-brand-gray">{comment.display_name || getUserDisplayName(comment.user_id, currentUser)}</span>
                           <span className="text-xs text-gray-400 ml-1">{new Date(comment.created_at).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</span>
                        </p>
                        <p className="text-sm text-gray-700 mt-1">{comment.comment_text}</p>
                        {/* TODO: Add edit/delete buttons for comment owner */}
                     </div>
                  </div>
                )) : (
                  <p className="text-sm text-center text-gray-500 py-4">No comments yet. Start the discussion!</p>
                )}
             </div>
           )}
           {/* Comment Input Form */}
           <form onSubmit={handlePostComment} className="flex gap-2 items-center pt-2 border-t">
              <input
                 type="text"
                 value={newComment}
                 onChange={(e) => setNewComment(e.target.value)}
                 placeholder={currentUser ? "Add a comment..." : "Log in to comment"}
                 className="flex-grow p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue disabled:bg-gray-100"
                 disabled={!currentUser || isPostingComment} // Disable if not logged in or posting
              />
              <button
                 type="submit"
                 className="bg-accent-blue text-white p-2 rounded-md hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                 disabled={!currentUser || !newComment.trim() || isPostingComment} // Disable if not logged in, empty, or posting
              >
                 {isPostingComment ? <Loader2 size={20} className="animate-spin"/> : <Send size={20} />}
              </button>
           </form>
        </section>

      </main>
    </div>
  );
};

export default RouteDetailScreen;
