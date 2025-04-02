import React, { useState } from 'react';
import { ArrowLeft, MapPin, User as SetterIcon, CalendarDays, Star, Bookmark, Video, MessageSquareText, PencilLine, ThumbsUp, ThumbsDown, Send, PlusCircle, Loader2, AlertTriangle } from 'lucide-react'; // Added Loader2, AlertTriangle
import { RouteData, UserProgress, BetaContent, Comment, BetaType, AppView } from '../../types';

interface RouteDetailScreenProps {
  route: RouteData | null | undefined; // Updated: Can be loading (undefined) or error (null)
  isLoading: boolean;
  error: string | null;
  onBack: () => void;
  onNavigate: (view: AppView, routeId?: string) => void;
}

// --- Placeholder Data for Progress, Beta, Comments (Keep for now) ---
const placeholderProgress: UserProgress = { attempts: 0, sentDate: null, rating: null, notes: "", wishlist: false };
const placeholderBeta: BetaContent[] = [
  // { id: 'b1', routeId: 'r1', userId: 'u1', username: 'ClimbMasterFlex', type: 'text', textContent: 'Use the intermediate crimp!', timestamp: '2024-03-12T10:00:00Z', upvotes: 15, userAvatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
  // { id: 'b2', routeId: 'r1', userId: 'u2', username: 'BetaQueen', type: 'video', contentUrl: '#', timestamp: '2024-03-11T14:30:00Z', upvotes: 25, userAvatarUrl: 'https://images.unsplash.com/photo-1580489944761-15a19d654956?q=80&w=1961&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
];
const placeholderComments: Comment[] = [
  // { id: 'c1', routeId: 'r1', userId: 'u4', username: 'BoulderBro', text: 'Fun route!', timestamp: '2024-03-12T11:00:00Z', userAvatarUrl: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?q=80&w=1974&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D' },
];
// --- End Placeholder Data ---

const getGradeColorClass = (colorName: string | undefined): string => {
  if (!colorName) return 'bg-gray-400';
  const colorMap: { [key: string]: string } = {
    'accent-red': 'bg-accent-red', 'accent-blue': 'bg-accent-blue', 'accent-yellow': 'bg-accent-yellow',
    'brand-green': 'bg-brand-green', 'accent-purple': 'bg-accent-purple', 'brand-gray': 'bg-brand-gray',
    'brand-brown': 'bg-brand-brown',
  };
  // Handle potential snake_case from DB if mapping didn't happen perfectly
  return colorMap[colorName] || colorMap[colorName.replace('_', '-')] || 'bg-gray-400';
};

const RouteDetailScreen: React.FC<RouteDetailScreenProps> = ({ route, isLoading, error, onBack, onNavigate }) => {
  // State for user interactions (progress, beta, comments) - keep using placeholders for now
  const [progress, setProgress] = useState<UserProgress>(placeholderProgress);
  const [betaItems, setBetaItems] = useState<BetaContent[]>(placeholderBeta);
  const [comments, setComments] = useState<Comment[]>(placeholderComments);
  const [activeBetaTab, setActiveBetaTab] = useState<BetaType>('text');
  const [newComment, setNewComment] = useState('');

  // --- Handlers for user interactions (Keep as is for now) ---
   const handleLogAttempt = () => setProgress(prev => ({ ...prev, attempts: prev.attempts + 1 }));
   const handleLogSend = () => setProgress(prev => ({ ...prev, sentDate: new Date().toISOString() }));
   const handleRating = (newRating: number) => setProgress(prev => ({ ...prev, rating: prev.rating === newRating ? null : newRating }));
   const handleWishlistToggle = () => setProgress(prev => ({ ...prev, wishlist: !prev.wishlist }));
   const handlePostComment = (e: React.FormEvent) => { e.preventDefault(); /* TODO: post logic */ setNewComment(''); };

  const filteredBeta = betaItems.filter(beta => beta.type === activeBetaTab);

  // --- Loading and Error Handling ---
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <Loader2 className="animate-spin text-accent-blue" size={48} />
      </div>
    );
  }

  if (error || !route) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-gray-100 p-4 text-center">
         <AlertTriangle size={48} className="text-red-500 mb-4" />
         <h2 className="text-xl font-semibold text-brand-gray mb-2">Error Loading Route</h2>
         <p className="text-red-600 mb-6">{error || 'The requested route could not be found.'}</p>
         <button
            onClick={onBack}
            className="bg-accent-blue text-white px-4 py-2 rounded-md hover:bg-opacity-90 flex items-center gap-2"
         >
            <ArrowLeft size={18} /> Go Back
         </button>
      </div>
    );
  }
  // --- End Loading and Error Handling ---

  // Destructure route data *after* checking for loading/error
  const { id: routeId, name, grade, grade_color, location, setter, date_set, description, image_url } = route;

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="bg-white shadow-sm p-4 sticky top-0 z-10 flex items-center">
        <button onClick={onBack} className="mr-4 text-brand-gray hover:text-brand-green">
          <ArrowLeft size={24} />
        </button>
        <div className="flex-grow overflow-hidden">
           <h1 className="text-xl font-bold text-brand-green truncate">{name}</h1>
           <div className="flex items-center text-sm text-gray-500 gap-x-3 flex-wrap">
             {/* Use grade_color from fetched data */}
             <span className={`font-semibold px-1.5 py-0.5 rounded text-white text-xs ${getGradeColorClass(grade_color)}`}>{grade}</span>
             <span className="flex items-center gap-1"><MapPin size={14} /> {location}</span>
           </div>
        </div>
         <button onClick={handleWishlistToggle} className={`ml-4 p-1 rounded ${progress.wishlist ? 'text-accent-yellow' : 'text-gray-400 hover:text-accent-yellow/80'}`}>
            <Bookmark size={24} fill={progress.wishlist ? 'currentColor' : 'none'} />
         </button>
      </header>

      {/* Main Content */}
      <main className="p-4 space-y-6">
        {/* Visual Section */}
        <section className="bg-white rounded-lg shadow overflow-hidden">
           {/* Use image_url from fetched data */}
           {image_url ? (
            <img src={image_url} alt={`Photo of ${name}`} className="w-full h-48 object-cover" />
          ) : (
            <div className="w-full h-48 bg-gradient-to-br from-gray-200 to-gray-300 flex items-center justify-center text-brand-gray">
              <MapPin size={48} /> {/* Placeholder if no image */}
            </div>
          )}
           <div className="p-4">
             <div className="flex items-center text-sm text-gray-600 mb-2 gap-x-4 gap-y-1 flex-wrap">
                {setter && <span className="flex items-center gap-1"><SetterIcon size={14} /> Set by {setter}</span>}
                {/* Use date_set from fetched data */}
                <span className="flex items-center gap-1"><CalendarDays size={14} /> Set on {new Date(date_set).toLocaleDateString()}</span>
             </div>
             {description && <p className="text-sm text-brand-gray">{description}</p>}
           </div>
        </section>

        {/* Your Progress Section (Uses placeholder state for now) */}
        <section className="bg-white p-4 rounded-lg shadow">
           <h2 className="text-lg font-semibold text-brand-gray mb-3">Your Progress</h2>
           <div className="flex gap-2 mb-4">
             <button onClick={handleLogAttempt} className="flex-1 bg-orange-100 text-orange-600 hover:bg-orange-200 font-medium py-2 px-3 rounded text-sm text-center">Log Attempt ({progress.attempts})</button>
             <button onClick={handleLogSend} disabled={!!progress.sentDate} className={`flex-1 font-medium py-2 px-3 rounded text-sm text-center ${progress.sentDate ? 'bg-green-200 text-green-700 cursor-not-allowed' : 'bg-green-500 text-white hover:bg-green-600'}`}> {progress.sentDate ? `Sent ${new Date(progress.sentDate).toLocaleDateString()}` : 'Log Send'} </button>
           </div>
           <div className="mb-4">
              <label className="block text-sm font-medium text-brand-gray mb-1">Your Rating</label>
              <div className="flex gap-1">{[1, 2, 3, 4, 5].map(star => (<button key={star} onClick={() => handleRating(star)}><Star size={24} className={star <= (progress.rating || 0) ? 'text-accent-yellow' : 'text-gray-300'} fill={star <= (progress.rating || 0) ? 'currentColor' : 'none'} /></button>))}</div>
           </div>
           <div>
              <label htmlFor="personalNotes" className="block text-sm font-medium text-brand-gray mb-1">Private Notes</label>
              <textarea id="personalNotes" rows={3} value={progress.notes} onChange={(e) => setProgress(prev => ({ ...prev, notes: e.target.value }))} placeholder="Add your personal beta, reminders, etc." className="w-full p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue" />
           </div>
        </section>

        {/* Community Beta Section (Uses placeholder state for now) */}
        <section className="bg-white rounded-lg shadow">
           <div className="flex justify-between items-center p-4 border-b">
             <h2 className="text-lg font-semibold text-brand-gray">Community Beta</h2>
             <button
                onClick={() => onNavigate('addBeta', routeId)} // Navigate to Add Beta screen
                className="bg-accent-blue text-white text-xs font-semibold px-3 py-1 rounded-full hover:bg-opacity-90 flex items-center gap-1"
             >
                <PlusCircle size={14}/> Add Beta
             </button>
           </div>
           <div className="flex border-b">
              <button onClick={() => setActiveBetaTab('text')} className={`flex-1 py-2 text-center text-sm font-medium ${activeBetaTab === 'text' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50'}`}><MessageSquareText size={16} className="inline mr-1 mb-0.5"/> Tips</button>
              <button onClick={() => setActiveBetaTab('video')} className={`flex-1 py-2 text-center text-sm font-medium ${activeBetaTab === 'video' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50'}`}><Video size={16} className="inline mr-1 mb-0.5"/> Videos</button>
              <button onClick={() => setActiveBetaTab('drawing')} className={`flex-1 py-2 text-center text-sm font-medium ${activeBetaTab === 'drawing' ? 'text-accent-blue border-b-2 border-accent-blue' : 'text-brand-gray hover:bg-gray-50'}`}><PencilLine size={16} className="inline mr-1 mb-0.5"/> Drawings</button>
           </div>
           <div className="p-4 space-y-4 max-h-60 overflow-y-auto">
              {filteredBeta.length > 0 ? filteredBeta.map(beta => (
                 <div key={beta.id} className="flex gap-3 border-b pb-3 last:border-b-0">
                    <img src={beta.userAvatarUrl || `https://ui-avatars.com/api/?name=${beta.username}&background=random`} alt={beta.username} className="w-8 h-8 rounded-full flex-shrink-0 mt-1"/>
                    <div className="flex-grow">
                       <p className="text-sm font-medium text-brand-gray">{beta.username}</p>
                       {beta.type === 'text' && <p className="text-sm text-gray-700 mt-1">{beta.textContent}</p>}
                       {beta.type === 'video' && <a href={beta.contentUrl} target="_blank" rel="noopener noreferrer" className="text-sm text-blue-600 hover:underline mt-1 block">Watch Video <Video size={14} className="inline ml-1"/></a>}
                       <div className="flex items-center gap-3 text-xs text-gray-500 mt-2">
                          <span>{new Date(beta.timestamp).toLocaleDateString()}</span>
                          <button className="flex items-center gap-1 hover:text-green-600"><ThumbsUp size={14}/> {beta.upvotes}</button>
                          <button className="flex items-center gap-1 hover:text-red-600"><ThumbsDown size={14}/> {/* Downvote count */}</button>
                       </div>
                    </div>
                 </div>
              )) : ( <p className="text-sm text-center text-gray-500 py-4">No {activeBetaTab} beta available yet.</p> )}
           </div>
        </section>

        {/* Discussion Section (Uses placeholder state for now) */}
        <section className="bg-white p-4 rounded-lg shadow">
           <h2 className="text-lg font-semibold text-brand-gray mb-3">Discussion</h2>
           <div className="space-y-4 mb-4 max-h-60 overflow-y-auto">
              {comments.length > 0 ? comments.map(comment => (
                <div key={comment.id} className="flex gap-3 border-b pb-3 last:border-b-0">
                   <img src={comment.userAvatarUrl || `https://ui-avatars.com/api/?name=${comment.username}&background=random`} alt={comment.username} className="w-8 h-8 rounded-full flex-shrink-0 mt-1"/>
                   <div className="flex-grow">
                      <p className="text-sm"><span className="font-medium text-brand-gray">{comment.username}</span> <span className="text-xs text-gray-400 ml-1">{new Date(comment.timestamp).toLocaleTimeString([], {hour: 'numeric', minute:'2-digit'})}</span></p>
                      <p className="text-sm text-gray-700 mt-1">{comment.text}</p>
                   </div>
                </div>
              )) : ( <p className="text-sm text-center text-gray-500 py-4">No comments yet. Start the discussion!</p> )}
           </div>
           <form onSubmit={handlePostComment} className="flex gap-2 items-center">
              <input type="text" value={newComment} onChange={(e) => setNewComment(e.target.value)} placeholder="Add a comment..." className="flex-grow p-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-1 focus:ring-accent-blue" />
              <button type="submit" className="bg-accent-blue text-white p-2 rounded-md hover:bg-opacity-90 disabled:opacity-50" disabled={!newComment.trim()}><Send size={20} /></button>
           </form>
        </section>

      </main>
    </div>
  );
};

export default RouteDetailScreen;
