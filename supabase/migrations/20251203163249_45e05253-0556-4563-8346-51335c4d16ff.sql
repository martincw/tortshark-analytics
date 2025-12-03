-- Add is_enabled column to campaign_portfolio_settings
ALTER TABLE public.campaign_portfolio_settings
ADD COLUMN is_enabled BOOLEAN NOT NULL DEFAULT true;