-- Follow requests / connections table
CREATE TABLE IF NOT EXISTS public.follow_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  recipient_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (requester_id, recipient_id)
);

ALTER TABLE public.follow_requests ENABLE ROW LEVEL SECURITY;

-- Users can see requests they sent or received
CREATE POLICY "Users can view own follow requests" ON public.follow_requests
  FOR SELECT USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Users can send follow requests
CREATE POLICY "Users can send follow requests" ON public.follow_requests
  FOR INSERT WITH CHECK (auth.uid() = requester_id);

-- Recipients can update status (accept/decline); requesters can cancel (delete only)
CREATE POLICY "Recipients can update follow requests" ON public.follow_requests
  FOR UPDATE USING (auth.uid() = recipient_id);

-- Requester can cancel / delete their own request; recipient can delete declined
CREATE POLICY "Users can delete own follow requests" ON public.follow_requests
  FOR DELETE USING (auth.uid() = requester_id OR auth.uid() = recipient_id);

-- Admins full access
CREATE POLICY "Admins can manage all follow requests" ON public.follow_requests
  FOR ALL USING (public.has_role(auth.uid(), 'admin'));
