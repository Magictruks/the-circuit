// Define shared types used across components

export type AppView = 'onboarding' | 'dashboard' | 'routes' | 'log' | 'discover' | 'profile' | 'routeDetail' | 'addBeta'; // Added addBeta

export type RouteStatus = 'sent' | 'attempted' | 'unseen';

export interface RouteData {
  id: string;
  name: string;
  grade: string; // e.g., "V5", "5.10a"
  gradeColor: string; // Reference to Tailwind color name (e.g., 'accent-red')
  location: string; // Wall or area name
  setter?: string; // Optional setter name
  dateSet: string; // ISO date string (e.g., "2024-03-15")
  status: RouteStatus; // User's status with the route
  betaAvailable: boolean; // Whether community beta exists
  description?: string; // Optional longer description
  imageUrl?: string; // Optional image URL for detail view
  // Add other fields as needed
}

export interface UserProgress {
  attempts: number;
  sentDate: string | null; // ISO date string or null
  rating: number | null; // e.g., 1-5 stars
  notes: string;
  wishlist: boolean;
}

export type BetaType = 'video' | 'text' | 'drawing'; // Keep drawing for now

export interface BetaContent {
  id: string;
  routeId: string;
  userId: string; // ID of the user who submitted
  username: string; // Username of the submitter
  userAvatarUrl?: string; // Optional avatar
  type: BetaType;
  contentUrl?: string; // URL for video/drawing
  textContent?: string; // Text for tips
  timestamp: string; // ISO date string
  upvotes: number;
}

export interface Comment {
  id: string;
  routeId: string;
  userId: string;
  username: string;
  userAvatarUrl?: string;
  text: string;
  timestamp: string; // ISO date string
}

// Add other shared types here (e.g., UserProfile, GymData)
