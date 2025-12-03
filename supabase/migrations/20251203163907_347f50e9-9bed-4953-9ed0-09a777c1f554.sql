-- Add split_percentage column to campaign_portfolio_settings
ALTER TABLE public.campaign_portfolio_settings
ADD COLUMN split_percentage NUMERIC NOT NULL DEFAULT 100;