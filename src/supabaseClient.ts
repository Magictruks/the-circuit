import { createClient } from '@supabase/supabase-js'

// Retrieve Supabase URL and Anon Key from environment variables
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

// Validate that the environment variables are set
if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error("Supabase URL and Anon Key must be provided in .env file")
}

// Create and export the Supabase client instance
export const supabase = createClient(supabaseUrl, supabaseAnonKey)

// --- Follow API ---

export const followUser = async (followerId: string, followingId: string) => {
  if (followerId === followingId) {
    throw new Error("Cannot follow yourself.");
  }
  const { error } = await supabase
    .from('user_follows')
    .insert({ follower_id: followerId, following_id: followingId });
  if (error) {
    console.error("Error following user:", error);
    throw error;
  }
  console.log(`User ${followerId} followed ${followingId}`);
  // Optionally log activity here or in the component after success
};

export const unfollowUser = async (followerId: string, followingId: string) => {
  const { error } = await supabase
    .from('user_follows')
    .delete()
    .eq('follower_id', followerId)
    .eq('following_id', followingId);
  if (error) {
    console.error("Error unfollowing user:", error);
    throw error;
  }
   console.log(`User ${followerId} unfollowed ${followingId}`);
   // Optionally log activity here or in the component after success
};

export const checkFollowing = async (followerId: string, followingId: string): Promise<boolean> => {
  const { data, error } = await supabase
    .from('user_follows')
    .select('follower_id')
    .eq('follower_id', followerId)
    .eq('following_id', followingId)
    .maybeSingle(); // Use maybeSingle to return null if not found

  if (error) {
    console.error("Error checking follow status:", error);
    return false; // Assume not following on error
  }
  return !!data; // Return true if a row exists, false otherwise
};

export const getFollowCounts = async (userId: string): Promise<{ followers: number; following: number }> => {
    const { count: followerCount, error: followerError } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('following_id', userId);

    if (followerError) {
        console.error("Error fetching follower count:", followerError);
    }

    const { count: followingCount, error: followingError } = await supabase
        .from('user_follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', userId);

    if (followingError) {
        console.error("Error fetching following count:", followingError);
    }

    return {
        followers: followerCount ?? 0,
        following: followingCount ?? 0,
    };
};
