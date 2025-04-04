/*
      # Create activity_log table

      This migration creates a table to store user activity events within the application.

      1.  **New Table:**
          - `activity_log`
            - `id` (uuid, primary key): Unique identifier for the log entry.
            - `user_id` (uuid, foreign key -> auth.users): The user who performed the action.
            - `gym_id` (uuid, foreign key -> gyms, nullable): The gym context, if applicable.
            - `route_id` (uuid, foreign key -> routes, nullable): The route context, if applicable.
            - `activity_type` (text): Type of activity (e.g., 'log_send', 'add_beta').
            - `details` (jsonb, nullable): Additional context specific to the activity type (e.g., grade, comment snippet).
            - `created_at` (timestamptz): Timestamp of the activity.

      2.  **Indexes:**
          - Index on `user_id` for filtering user-specific activity.
          - Index on `gym_id` for filtering gym-specific activity.
          - Index on `route_id` for filtering route-specific activity.
          - Index on `created_at` for ordering the feed.

      3.  **Security:**
          - Enable Row Level Security (RLS) on `activity_log`.
          - Policy: Allow authenticated users to insert their own activity logs.
          - Policy: Allow authenticated users to read all activity logs (can be refined later, e.g., filter by friends or gym).
    */

    -- 1. Create Table
    CREATE TABLE IF NOT EXISTS public.activity_log (
        id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
        gym_id uuid NULL REFERENCES public.gyms(id) ON DELETE SET NULL,
        route_id uuid NULL REFERENCES public.routes(id) ON DELETE SET NULL,
        activity_type text NOT NULL CHECK (activity_type IN ('log_send', 'log_attempt', 'add_beta', 'add_comment', 'add_route')), -- Add more types as needed
        details jsonb NULL,
        created_at timestamptz NOT NULL DEFAULT now()
    );

    -- 2. Add Indexes
    CREATE INDEX IF NOT EXISTS idx_activity_log_user_id ON public.activity_log(user_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_gym_id ON public.activity_log(gym_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_route_id ON public.activity_log(route_id);
    CREATE INDEX IF NOT EXISTS idx_activity_log_created_at ON public.activity_log(created_at DESC);

    -- 3. Enable RLS
    ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

    -- 4. RLS Policies
    CREATE POLICY "Allow authenticated users to insert their own logs"
        ON public.activity_log
        FOR INSERT
        TO authenticated
        WITH CHECK (auth.uid() = user_id);

    CREATE POLICY "Allow authenticated users to read all logs"
        ON public.activity_log
        FOR SELECT
        TO authenticated
        USING (true); -- Simple policy for now, allows reading all logs

    -- Grant usage permissions
    GRANT SELECT, INSERT ON TABLE public.activity_log TO authenticated;
    GRANT USAGE, SELECT ON SEQUENCE activity_log_id_seq TO authenticated; -- If using serial id instead of uuid