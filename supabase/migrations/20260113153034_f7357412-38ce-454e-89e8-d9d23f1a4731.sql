-- Drop the existing constraint
ALTER TABLE public.campaign_changelog DROP CONSTRAINT campaign_changelog_change_type_check;

-- Add the new constraint with all four change types
ALTER TABLE public.campaign_changelog 
ADD CONSTRAINT campaign_changelog_change_type_check 
CHECK (change_type = ANY (ARRAY['ad_creative'::text, 'targeting'::text, 'spend_increase'::text, 'spend_decrease'::text]));