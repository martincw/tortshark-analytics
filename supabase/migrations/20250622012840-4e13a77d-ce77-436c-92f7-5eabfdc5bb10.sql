
-- EMERGENCY: Disable RLS on all core data tables to restore immediate data visibility
-- This will make all data visible regardless of workspace membership

-- Disable RLS on campaigns table
ALTER TABLE public.campaigns DISABLE ROW LEVEL SECURITY;

-- Disable RLS on case_buyers table  
ALTER TABLE public.case_buyers DISABLE ROW LEVEL SECURITY;

-- Disable RLS on campaign_stats_history table
ALTER TABLE public.campaign_stats_history DISABLE ROW LEVEL SECURITY;

-- Disable RLS on campaign_targets table
ALTER TABLE public.campaign_targets DISABLE ROW LEVEL SECURITY;

-- Disable RLS on buyer_tort_coverage table
ALTER TABLE public.buyer_tort_coverage DISABLE ROW LEVEL SECURITY;

-- Disable RLS on campaign_buyer_stack table
ALTER TABLE public.campaign_buyer_stack DISABLE ROW LEVEL SECURITY;

-- Disable RLS on case_attributions table
ALTER TABLE public.case_attributions DISABLE ROW LEVEL SECURITY;

-- Disable RLS on account_connections table
ALTER TABLE public.account_connections DISABLE ROW LEVEL SECURITY;

-- Disable RLS on campaign_manual_stats table
ALTER TABLE public.campaign_manual_stats DISABLE ROW LEVEL SECURITY;
