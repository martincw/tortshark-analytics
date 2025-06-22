
-- Create a default workspace for the current user and migrate all existing data
DO $$
DECLARE
    current_user_id UUID := '8f65ee91-ada0-4b63-8c54-1cb5f1dc5d09';
    default_workspace_id UUID;
BEGIN
    -- Check if user already has a workspace
    SELECT workspace_id INTO default_workspace_id 
    FROM public.workspace_members 
    WHERE user_id = current_user_id 
    LIMIT 1;
    
    -- If no workspace exists, create one
    IF default_workspace_id IS NULL THEN
        -- Create default workspace
        INSERT INTO public.workspaces (name, owner_id)
        VALUES ('Default Workspace', current_user_id)
        RETURNING id INTO default_workspace_id;
        
        -- Add user as owner
        INSERT INTO public.workspace_members (workspace_id, user_id, role)
        VALUES (default_workspace_id, current_user_id, 'owner');
    END IF;
    
    -- Update all existing data to belong to the user's default workspace
    UPDATE public.campaigns SET workspace_id = default_workspace_id WHERE user_id = current_user_id AND workspace_id IS NULL;
    UPDATE public.case_buyers SET workspace_id = default_workspace_id WHERE user_id = current_user_id AND workspace_id IS NULL;
    UPDATE public.account_connections SET workspace_id = default_workspace_id WHERE user_id = current_user_id AND workspace_id IS NULL;
    
    -- Handle records without direct user_id reference, using campaign_id
    UPDATE public.campaign_stats_history 
    SET workspace_id = default_workspace_id 
    WHERE campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = current_user_id) 
    AND workspace_id IS NULL;
    
    UPDATE public.campaign_manual_stats 
    SET workspace_id = default_workspace_id 
    WHERE campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = current_user_id)
    AND workspace_id IS NULL;
    
    UPDATE public.campaign_targets 
    SET workspace_id = default_workspace_id 
    WHERE campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = current_user_id)
    AND workspace_id IS NULL;
    
    UPDATE public.campaign_buyer_stack 
    SET workspace_id = default_workspace_id 
    WHERE campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = current_user_id)
    AND workspace_id IS NULL;
    
    UPDATE public.buyer_tort_coverage 
    SET workspace_id = default_workspace_id 
    WHERE campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = current_user_id)
    AND workspace_id IS NULL;
    
    UPDATE public.case_attributions 
    SET workspace_id = default_workspace_id 
    WHERE campaign_id IN (SELECT id FROM public.campaigns WHERE user_id = current_user_id)
    AND workspace_id IS NULL;
    
    -- Also update buyer_tort_coverage by buyer_id for buyers owned by this user
    UPDATE public.buyer_tort_coverage 
    SET workspace_id = default_workspace_id 
    WHERE buyer_id IN (SELECT id FROM public.case_buyers WHERE user_id = current_user_id)
    AND workspace_id IS NULL;
    
    RAISE NOTICE 'Data migration completed for user % with workspace %', current_user_id, default_workspace_id;
END
$$;
