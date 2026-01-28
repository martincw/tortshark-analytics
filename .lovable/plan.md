
# Google Ads Integration - Complete Multi-Account Setup

## Overview
You want to connect multiple Google Ads accounts and map each Google Ads campaign to a TortShark campaign. The core infrastructure exists, but there are gaps in the user flow that prevent the integration from working end-to-end.

## Current Issues Identified

1. **Missing Account Selection Step**: After OAuth, there's no UI to select which Google Ads accounts to connect
2. **Platform field inconsistency**: Some code uses `'google'`, some uses `'google_ads'`
3. **Disconnected components**: The `GoogleAdsAccountSelector` component exists but isn't integrated into the main flow
4. **No accounts in database**: The `account_connections` table has no Google Ads accounts stored

## Implementation Plan

### Phase 1: Fix the Integration Flow

**1.1 Update GoogleAdsIntegration component**
- Add an "Accounts" tab between "Connection" and "Campaigns"
- After successful OAuth, automatically show the account selector
- Integrate `GoogleAdsAccountSelector` component into the flow
- Flow becomes: Connect OAuth -> Select Accounts -> View/Map Campaigns

**1.2 Standardize platform field**
- Use `'google_ads'` consistently across all code
- Update `google-ads-sync` edge function queries to use correct platform value

**1.3 Fix GoogleAdsCampaigns component**
- Currently queries with `platform = 'google_ads'` which is correct
- Ensure account selector saves with the same platform value

### Phase 2: Improve Account Selection

**2.1 Auto-connect accounts after OAuth**
- After OAuth callback, automatically fetch available accounts
- Show the account selection UI immediately
- Save selected accounts to `account_connections` table

**2.2 Add account management UI**
- Show connected accounts with their status
- Allow adding/removing accounts
- Show last sync time for each account

### Phase 3: Campaign Mapping Enhancements

**3.1 Improve the mapping tab**
- Already exists in `GoogleAdsCampaignMapping.tsx`
- Show campaigns grouped by account
- Clear indicators for mapped vs unmapped

**3.2 Ensure data flows correctly**
- Mapped campaigns get ad spend synced automatically
- Display sync status and last sync time

## Technical Details

### Files to Modify

| File | Changes |
|------|---------|
| `src/components/data-sources/GoogleAdsIntegration.tsx` | Add "Accounts" tab, integrate account selector, improve flow |
| `src/components/integrations/GoogleAdsAccountSelector.tsx` | Fix platform field to `'google_ads'` consistently |
| `src/components/data-sources/GoogleAdsCampaigns.tsx` | Minor fixes if needed |
| `supabase/functions/google-ads-sync/index.ts` | Ensure platform query uses `'google_ads'` |

### Database Tables Used

- `google_ads_tokens` - Stores OAuth tokens (already working)
- `account_connections` - Stores which Google Ads accounts are connected
- `campaign_ad_mappings` - Maps Google Ads campaigns to TortShark campaigns
- `campaign_stats_history` - Where synced ad spend data is stored

### User Flow After Implementation

```text
1. User clicks "Login with Google" on Data Sources page
2. User authorizes via Google OAuth
3. User is redirected back to Data Sources
4. App shows list of accessible Google Ads accounts
5. User selects which accounts to connect
6. User goes to "Campaigns" tab to see all campaigns from connected accounts
7. User maps Google Ads campaigns to TortShark campaigns
8. Ad spend syncs automatically every 15 minutes
```

## What This Enables

- Connect multiple Google Ads accounts (MCC or individual)
- See all campaigns across all connected accounts
- Map each Google Ads campaign to a TortShark campaign
- Automatic ad spend syncing for mapped campaigns
- Clear visibility into which campaigns are mapped vs unmapped
