-- Create campaign changelog table
CREATE TABLE public.campaign_changelog (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  workspace_id UUID REFERENCES public.workspaces(id),
  change_type TEXT NOT NULL CHECK (change_type IN ('ad_creative', 'targeting')),
  title TEXT NOT NULL,
  description TEXT,
  change_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.campaign_changelog ENABLE ROW LEVEL SECURITY;

-- Create policies for workspace members
CREATE POLICY "Workspace members can view changelog"
  ON public.campaign_changelog
  FOR SELECT
  USING (is_workspace_member_safe(workspace_id));

CREATE POLICY "Workspace members can create changelog entries"
  ON public.campaign_changelog
  FOR INSERT
  WITH CHECK (is_workspace_member_safe(workspace_id));

CREATE POLICY "Workspace members can update changelog entries"
  ON public.campaign_changelog
  FOR UPDATE
  USING (is_workspace_member_safe(workspace_id));

CREATE POLICY "Workspace members can delete changelog entries"
  ON public.campaign_changelog
  FOR DELETE
  USING (is_workspace_member_safe(workspace_id));

-- Create index for faster lookups
CREATE INDEX idx_campaign_changelog_campaign_id ON public.campaign_changelog(campaign_id);
CREATE INDEX idx_campaign_changelog_change_date ON public.campaign_changelog(change_date);
CREATE INDEX idx_campaign_changelog_workspace_id ON public.campaign_changelog(workspace_id);

-- Create trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_campaign_changelog_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_campaign_changelog_updated_at
  BEFORE UPDATE ON public.campaign_changelog
  FOR EACH ROW
  EXECUTE FUNCTION public.update_campaign_changelog_updated_at();