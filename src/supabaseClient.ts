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
