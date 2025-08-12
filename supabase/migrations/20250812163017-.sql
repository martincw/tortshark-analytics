-- Create table to cache LeadProsper daily aggregates per user and campaign
CREATE TABLE IF NOT EXISTS public.lp_campaign_daily_aggregates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lp_campaign_id INTEGER NOT NULL,
  lp_campaign_name TEXT NOT NULL,
  date DATE NOT NULL,
  leads INTEGER NOT NULL DEFAULT 0,
  accepted INTEGER NOT NULL DEFAULT 0,
  duplicated INTEGER NOT NULL DEFAULT 0,
  failed INTEGER NOT NULL DEFAULT 0,
  revenue NUMERIC NOT NULL DEFAULT 0,
  cost NUMERIC NOT NULL DEFAULT 0,
  profit NUMERIC NOT NULL DEFAULT 0,
  last_fetched_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT lp_campaign_daily_aggregates_unique UNIQUE (user_id, lp_campaign_id, date)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_lp_daily_user_date ON public.lp_campaign_daily_aggregates (user_id, date);
CREATE INDEX IF NOT EXISTS idx_lp_daily_user_campaign_date ON public.lp_campaign_daily_aggregates (user_id, lp_campaign_id, date);

-- Enable Row Level Security
ALTER TABLE public.lp_campaign_daily_aggregates ENABLE ROW LEVEL SECURITY;

-- RLS policies: users can only manage their own cached aggregates
CREATE POLICY IF NOT EXISTS "Users can view their own LP aggregates"
ON public.lp_campaign_daily_aggregates
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can insert their own LP aggregates"
ON public.lp_campaign_daily_aggregates
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can update their own LP aggregates"
ON public.lp_campaign_daily_aggregates
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY IF NOT EXISTS "Users can delete their own LP aggregates"
ON public.lp_campaign_daily_aggregates
FOR DELETE
USING (auth.uid() = user_id);
