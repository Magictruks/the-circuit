/*
# Create User Follows Table

This migration creates the `user_follows` table to store relationships between users.

1.  **New Tables**
    *   `user_follows`
        *   `follower_id` (uuid, FK to profiles.user_id, PK) - The user initiating the follow.
        *   `following_id` (uuid, FK to profiles.user_id, PK) - The user being followed.
        *   `created_at` (timestamptz) - Timestamp of when the follow action occurred.

2.  **Constraints**
    *   Primary Key: (`follower_id`, `following_id`)
    *   Foreign Keys: `follower_id` and `following_id` reference `profiles(user_id)`.
    *   Check Constraint: Ensures a user cannot follow themselves (`follower_id <> following_id`).

3.  **Indexes**
    *   Index on `follower_id` for quick lookup of who a user follows.
    *   Index on `following_id` for quick lookup of a user's followers.

4.  **Security**
    *   Enable Row Level Security (RLS) on `user_follows`.
    *   Policy: "Users can view their own follow relationships": Allows users to see who they follow and who follows them.
    *   Policy: "Users can follow/unfollow others": Allows users to insert (follow) and delete (unfollow) rows where they are the `follower_id`.
*/

-- 1. Create Table
CREATE TABLE IF NOT EXISTS public.user_follows (
    follower_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    following_id uuid NOT NULL REFERENCES public.profiles(user_id) ON DELETE CASCADE,
    created_at timestamp with time zone DEFAULT now() NOT NULL,
    CONSTRAINT user_follows_pkey PRIMARY KEY (follower_id, following_id),
    CONSTRAINT check_cannot_follow_self CHECK ((follower_id <> following_id))
);

-- Add comments to the table and columns
COMMENT ON TABLE public.user_follows IS 'Stores the follower/following relationships between users.';
COMMENT ON COLUMN public.user_follows.follower_id IS 'The user initiating the follow.';
COMMENT ON COLUMN public.user_follows.following_id IS 'The user being followed.';
COMMENT ON COLUMN public.user_follows.created_at IS 'Timestamp of when the follow action occurred.';


-- 2. Add Indexes
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON public.user_follows USING btree (follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON public.user_follows USING btree (following_id);

-- 3. Enable RLS
ALTER TABLE public.user_follows ENABLE ROW LEVEL SECURITY;

-- 4. Create RLS Policies
DROP POLICY IF EXISTS "Users can view their own follow relationships" ON public.user_follows;
CREATE POLICY "Users can view their own follow relationships"
    ON public.user_follows
    AS PERMISSIVE
    FOR SELECT
    TO authenticated
    USING ((( SELECT auth.uid() AS uid) = follower_id) OR (( SELECT auth.uid() AS uid) = following_id));

DROP POLICY IF EXISTS "Users can follow/unfollow others" ON public.user_follows;
CREATE POLICY "Users can follow/unfollow others"
    ON public.user_follows
    AS PERMISSIVE
    FOR ALL -- Covers INSERT and DELETE
    TO authenticated
    USING ((( SELECT auth.uid() AS uid) = follower_id))
    WITH CHECK ((( SELECT auth.uid() AS uid) = follower_id));
