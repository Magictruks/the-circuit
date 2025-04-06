/*
      # Create feedback table

      This migration creates a table to store user feedback and suggestions.

      1. New Tables
        - `feedback`
          - `id` (uuid, primary key, default: gen_random_uuid())
          - `created_at` (timestamptz, default: now())
          - `user_id` (uuid, foreign key to auth.users, nullable): ID of the user submitting feedback (if logged in).
          - `email` (text, nullable): User's email (captured automatically if logged in).
          - `feedback_type` (text, not null): Type of feedback ('contact', 'gym_suggestion'). -- UPDATED
          - `message` (text, not null): The actual feedback message.
          - `status` (text, default: 'new'): Status of the feedback (e.g., 'new', 'reviewed', 'archived').
      2. Security
        - Enable RLS on `feedback` table.
        - Add policy for authenticated users to insert their own feedback.
        - Add policy for service_role to select/update/delete (for admin use).
      3. Indexes
        - Create indexes on `user_id`, `status`, and `feedback_type`.
      4. Trigger
        - Create a function `handle_new_feedback` to auto-populate `user_id` and `email`.
        - Create a trigger `on_feedback_insert` to call the function before inserting new feedback.
    */

    -- 1. Create Table
    CREATE TABLE IF NOT EXISTS feedback (
      id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
      created_at timestamptz DEFAULT now(),
      user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL, -- Allow feedback even if user is deleted
      email text, -- Store email for easier contact, populated by trigger
      feedback_type text NOT NULL CHECK (feedback_type IN ('contact', 'gym_suggestion')), -- UPDATED: Changed 'suggestion' to 'gym_suggestion'
      message text NOT NULL CHECK (char_length(message) > 0), -- Ensure message is not empty
      status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'reviewed', 'archived')) -- Feedback status
    );

    -- 2. Security
    ALTER TABLE feedback ENABLE ROW LEVEL SECURITY;

    -- 3. RLS Policies
    DROP POLICY IF EXISTS "Allow authenticated users to insert their own feedback" ON feedback;
    CREATE POLICY "Allow authenticated users to insert their own feedback"
      ON feedback
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);

    DROP POLICY IF EXISTS "Allow service_role full access" ON feedback;
    CREATE POLICY "Allow service_role full access"
      ON feedback
      FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);

    -- 4. Indexes
    CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback(user_id);
    CREATE INDEX IF NOT EXISTS idx_feedback_status ON feedback(status);
    CREATE INDEX IF NOT EXISTS idx_feedback_type ON feedback(feedback_type);

    -- 5. Function and Trigger to auto-populate user_id and email
    CREATE OR REPLACE FUNCTION public.handle_new_feedback()
    RETURNS TRIGGER AS $$
    BEGIN
      -- Set user_id from the authenticated user
      NEW.user_id := auth.uid();
      -- Set email from the authenticated user's email
      NEW.email := (SELECT email FROM auth.users WHERE id = auth.uid());
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql SECURITY DEFINER;

    -- Trigger to call the function before insert
    DROP TRIGGER IF EXISTS on_feedback_insert ON public.feedback; -- Drop existing trigger first
    CREATE TRIGGER on_feedback_insert
      BEFORE INSERT ON public.feedback
      FOR EACH ROW
      EXECUTE FUNCTION public.handle_new_feedback();