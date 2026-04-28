-- Run this in Supabase SQL editor to enable user search + direct messaging.

-- Allow authenticated users to discover profiles by name.
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
DROP POLICY IF EXISTS profiles_select_authenticated ON public.profiles;
CREATE POLICY profiles_select_authenticated
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Direct messages table.
CREATE TABLE IF NOT EXISTS public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL CHECK (char_length(content) <= 4000),
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS direct_messages_sender_idx ON public.direct_messages(sender_id);
CREATE INDEX IF NOT EXISTS direct_messages_recipient_idx ON public.direct_messages(recipient_id);
CREATE INDEX IF NOT EXISTS direct_messages_created_at_idx ON public.direct_messages(created_at DESC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS direct_messages_select_participant ON public.direct_messages;
CREATE POLICY direct_messages_select_participant
  ON public.direct_messages FOR SELECT TO authenticated
  USING (sender_id = auth.uid() OR recipient_id = auth.uid());

DROP POLICY IF EXISTS direct_messages_insert_sender ON public.direct_messages;
CREATE POLICY direct_messages_insert_sender
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (sender_id = auth.uid());

DROP POLICY IF EXISTS direct_messages_update_recipient ON public.direct_messages;
CREATE POLICY direct_messages_update_recipient
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (recipient_id = auth.uid())
  WITH CHECK (recipient_id = auth.uid());

-- Allow users to create message notifications for recipients.
DROP POLICY IF EXISTS notifications_insert_message_sender ON public.notifications;
CREATE POLICY notifications_insert_message_sender
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND type = 'message_received'
    AND post_application_id IS NULL
    AND user_id <> auth.uid()
  );

notify pgrst, 'reload schema';

