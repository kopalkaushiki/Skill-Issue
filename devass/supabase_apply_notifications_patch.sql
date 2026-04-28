-- Run this in Supabase SQL Editor to allow dashboard apply notifications.

DROP POLICY IF EXISTS notifications_insert_applicant_to_author ON public.notifications;
CREATE POLICY notifications_insert_applicant_to_author
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    from_user_id = auth.uid()
    AND type = 'new_application'
    AND user_id <> auth.uid()
  );

notify pgrst, 'reload schema';

