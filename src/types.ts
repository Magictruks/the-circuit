import type { User } from '@supabase/supabase-js';

    // --- Core Data Structures ---

    // NEW: Location Data Structure
    export interface LocationData {
      id: string; // uuid from DB
      gym_id: string; // uuid from DB
      name: string; // text from DB
      description?: string | null; // text from DB (nullable)
      created_at: string; // timestamptz from DB
    }


    export interface RouteData {
      id: string; // Unique identifier for the route (matches Supabase)
      gym_id: string; // Foreign key to the gym this route belongs to (matches Supabase)
      name: string; // matches Supabase
      grade: string; // matches Supabase
      grade_color: string; // matches Supabase (snake_case from DB)
      // location: string; // REMOVED: Old location text field
      location_id: string | null; // NEW: Foreign key to the locations table (matches Supabase)
      setter?: string | null; // matches Supabase (optional)
      date_set: string; // matches Supabase (ISO 8601 date string)
      description?: string | null; // matches Supabase (optional)
      image_url?: string | null; // matches Supabase (optional)
      created_at?: string; // matches Supabase (optional, added by default)

      // --- Fields derived from user progress and related tables ---
      status?: 'sent' | 'attempted' | 'unseen'; // User's progress status
      hasBeta?: boolean; // Flag if any beta exists for this route
      hasComments?: boolean; // Flag if any comments exist for this route
      hasNotes?: boolean; // Flag if the current user has notes for this route
      isOnWishlist?: boolean; // Flag if the route is on the current user's wishlist
      rating?: number | null; // User's rating for the route
      location_name?: string | null; // Optional: Populated by joins to display location name (can be null)
    }


    export interface GymData {
      id: string; // UUID from Supabase
      name: string;
      city: string;
      state: string;
      country: string;
      // Add other relevant gym details if needed (e.g., address, website, type)
    }

    // Updated UserMetadata to match 'profiles' table structure
    export interface UserMetadata {
      user_id: string; // Corresponds to auth.users.id and is the primary key
      display_name: string;
      selected_gym_ids: string[]; // Array of gym UUIDs
      current_gym_id: string | null; // UUID of the currently active gym
      avatar_url?: string | null; // Optional avatar URL - ADDED
      created_at: string; // ISO 8601 timestamp
      updated_at: string; // ISO 8601 timestamp
    }


    // --- User Interaction & Progress ---

    // Represents the raw data structure in the 'user_route_progress' table
    export interface UserRouteProgressData {
      user_id: string;
      route_id: string;
      attempts: number;
      sent_at: string | null; // ISO string or null
      rating: number | null;
      notes: string | null; // Notes can be null in the DB
      wishlist: boolean;
      updated_at?: string; // Optional, managed by DB
      created_at?: string; // Optional, managed by DB
    }

    // Simplified version for internal use within components if needed
    // Renamed sent_at to sentDate for clarity in component state
    export interface UserProgress {
      attempts: number;
      sentDate: string | null; // ISO 8601 date string if sent
      rating: number | null; // User's personal rating (e.g., 1-5 stars)
      notes: string; // Private notes about the climb (ensure non-null string)
      wishlist: boolean; // Is the route on the user's wishlist?
    }


    // Type for combining progress and route data for Logbook display
    export interface LogbookEntry extends RouteData {
      // Inherits all fields from RouteData
      user_progress_attempts: number;
      user_progress_sent_at: string | null;
      user_progress_rating: number | null;
      user_progress_notes: string | null; // Allow null here to match DB
      user_progress_wishlist: boolean;
      user_progress_updated_at: string; // Add updated_at from progress table for sorting
    }


    export type BetaType = 'text' | 'video' | 'drawing'; // Drawing might be image upload initially

    // Updated BetaContent to match route_beta table schema
    export interface BetaContent {
      id: string; // uuid from DB
      route_id: string; // uuid from DB
      user_id: string; // uuid from DB (references auth.users.id)
      beta_type: BetaType; // text from DB ('text', 'video', 'drawing')
      text_content?: string | null; // text from DB (nullable)
      content_url?: string | null; // text from DB (nullable, URL for video/drawing)
      key_move?: string | null; // text from DB (nullable)
      upvotes: number; // integer from DB
      created_at: string; // timestamptz from DB
      updated_at: string; // timestamptz from DB

      // Optional fields (to be populated by joining/fetching profile data later)
      display_name?: string; // User's display name
      avatar_url?: string | null; // User's avatar URL - ADDED (ensure consistency)
    }


    // Updated Comment type to match DB schema
    export interface Comment {
      id: string; // uuid from DB
      route_id: string; // uuid from DB
      user_id: string; // uuid from DB (references auth.users.id)
      comment_text: string; // text from DB
      created_at: string; // timestamptz from DB
      updated_at: string; // timestamptz from DB

      // Optional fields (to be populated by joining/fetching profile data later)
      display_name?: string; // User's display name
      avatar_url?: string | null; // User's avatar URL - ADDED (ensure consistency)
    }

    // --- Activity Log ---
    export type ActivityType = 'log_send' | 'log_attempt' | 'add_beta' | 'add_comment' | 'add_route';

    export interface ActivityLogDetails {
      // Common optional fields
      route_name?: string;
      route_grade?: string;
      gym_name?: string; // Optional: Can be derived if needed
      route_grade_color?: string; // ADDED
      location_name?: string | null; // ADDED: Location name for context (can be null)

      // Specific fields based on activity_type
      comment_snippet?: string; // for add_comment
      beta_type?: BetaType; // for add_beta
      attempts?: number; // for log_send
      // Add more as needed
    }

    export interface ActivityLogEntry {
      id: string;
      user_id: string;
      gym_id: string | null;
      route_id: string | null;
      activity_type: ActivityType;
      details: ActivityLogDetails | null;
      created_at: string;

      // Joined data for display
      user_display_name?: string;
      user_avatar_url?: string | null; // Already present, ensure consistency
      route_name?: string; // Can override details if joined
      route_grade?: string; // Can override details if joined
      route_grade_color?: string; // ADDED: Can override details if joined
      gym_name?: string; // Can override details if joined
      location_name?: string | null; // ADDED: Can override details if joined (can be null)
    }

    // --- Stats ---
    // Updated QuickStatsData to replace wishlistCount with betaAddedThisMonth
    export interface QuickStatsData {
        sendsThisMonth: number;
        highestGradeSent: string | null;
        betaAddedThisMonth: number; // Replaced wishlistCount
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
      | 'profile'
      | 'settings'; // Added settings view

    // --- Supabase Specific Types (Example - Adapt as needed) ---

    // Explicitly define UserProfile based on UserMetadata which matches 'profiles' table
    export interface UserProfile extends UserMetadata {
      // Inherits fields from UserMetadata which should match 'profiles'
      // avatar_url is now inherited from UserMetadata
    }
