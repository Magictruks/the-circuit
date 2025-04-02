import type { User } from '@supabase/supabase-js';

// --- Core Data Structures ---

export interface RouteData {
  id: string; // Unique identifier for the route (matches Supabase)
  gym_id: string; // Foreign key to the gym this route belongs to (matches Supabase)
  name: string; // matches Supabase
  grade: string; // matches Supabase
  grade_color: string; // matches Supabase (snake_case from DB)
  location: string; // matches Supabase
  setter?: string | null; // matches Supabase (optional)
  date_set: string; // matches Supabase (ISO 8601 date string)
  description?: string | null; // matches Supabase (optional)
  image_url?: string | null; // matches Supabase (optional)
  created_at?: string; // matches Supabase (optional, added by default)

  // --- Fields NOT directly in 'routes' table (will be added later or derived) ---
  status?: 'sent' | 'attempted' | 'unseen'; // User's progress status (optional for now)
  betaAvailable?: boolean; // Flag if any beta exists (optional for now)
}


export interface GymData {
  id: string; // UUID from Supabase
  name: string;
  city: string;
  state: string;
  country: string;
  // Add other relevant gym details if needed (e.g., address, website, type)
}

export interface UserMetadata {
  user_id: string; // Corresponds to auth.users.id
  display_name: string;
  selected_gym_ids: string[]; // Array of gym UUIDs
  current_gym_id: string | null; // UUID of the currently active gym
  created_at: string; // ISO 8601 timestamp
  updated_at: string; // ISO 8601 timestamp
  // Add other metadata fields as needed (e.g., avatar_url if not using Supabase default)
}


// --- User Interaction & Progress ---

export interface UserProgress {
  attempts: number;
  sentDate: string | null; // ISO 8601 date string if sent
  rating: number | null; // User's personal rating (e.g., 1-5 stars)
  notes: string; // Private notes about the climb
  wishlist: boolean; // Is the route on the user's wishlist?
}

export type BetaType = 'text' | 'video' | 'drawing'; // Drawing might be image upload initially

export interface BetaContent {
  id: string; // Unique ID for the beta item
  routeId: string; // Foreign key to RouteData
  userId: string; // Foreign key to User profile/auth
  username: string; // Display name of the user who submitted
  userAvatarUrl?: string; // Optional avatar URL
  type: BetaType;
  textContent?: string; // Content if type is 'text'
  contentUrl?: string; // URL if type is 'video' or 'drawing' (e.g., Supabase Storage URL)
  timestamp: string; // ISO 8601 date string of submission
  upvotes: number;
  // Add downvotes, key move tags, etc. if needed
}

export interface Comment {
  id: string;
  routeId: string;
  userId: string;
  username: string;
  userAvatarUrl?: string;
  text: string;
  timestamp: string; // ISO 8601 date string
}

// --- App Navigation & State ---

export type AppView =
  | 'onboarding'
  | 'dashboard'
  | 'routes'
  | 'routeDetail'
  | 'addBeta'
  | 'log'
  | 'discover'
  | 'profile';

// --- Supabase Specific Types (Example - Adapt as needed) ---
// It's often better to generate these using Supabase CLI if possible,
// but defining manually is okay for smaller projects.

// Example structure if you had a 'profiles' table separate from auth.users
export interface UserProfile extends UserMetadata {
  // Inherits fields from UserMetadata
  // Add any other profile-specific fields here
  // e.g., bio: string | null;
}

// You might not need this if using auth.users directly with metadata
// export interface AppUser extends User {
//   // Extend Supabase User type if needed
//   profile?: UserProfile; // Link to the profile data
// }
