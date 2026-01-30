
## What’s happening (re-stated clearly)

You’re seeing **“No Google Ads accounts found”** even though your Google account *does* have Ads access.

This isn’t actually “no accounts” — it’s the UI falling back to an empty list because the **google-ads-accounts Edge Function is failing** and returning `accounts: []`.

From the Edge Function logs, the real error is:

- `404 Not Found: /v17/customers:listAccessibleCustomers`

So the Google Ads REST API version we switched to (`v17`) is **not available anymore** (or not available at all in this environment). Google’s current REST docs show the endpoint on **`v20`**.

## Root cause

- Multiple Edge Functions are calling Google Ads API versions that are not valid anymore (`v17`, `v18`, `v16`).
- `google-ads-accounts` currently returns `{ success:false, accounts: [] }` with a 200 response, so the frontend shows the “No accounts” empty-state instead of the real error.

## Changes to implement

### Phase A — Fix account discovery (unblocks you immediately)

1) **Update Google Ads API version to `v20`** in all Edge Functions that hit `googleads.googleapis.com`

Files to update:
- `supabase/functions/google-ads-accounts/index.ts`
  - `https://googleads.googleapis.com/v17/customers:listAccessibleCustomers` → `.../v20/...`
  - `https://googleads.googleapis.com/v17/customers/${customerId}` → `.../v20/...`
- `supabase/functions/google-ads/index.ts`
  - same replacements (`v17` → `v20`)
- `supabase/functions/google-ads-data/index.ts`
  - `GOOGLE_ADS_API_VERSION = "v17"` → `"v20"`
  - hardcoded `v17/customers:listAccessibleCustomers` → `v20/...`
- `supabase/functions/google-ads-sync/index.ts`
  - `GOOGLE_ADS_API_VERSION = "v16"` → `"v20"`
- `supabase/functions/google-ads-manager/index.ts`
  - `GOOGLE_ADS_API_VERSION = "v18"` → `"v20"`

(These currently disagree with each other; we’ll align them all so “accounts”, “campaigns”, and “metrics” don’t break at different steps.)

2) **Make `google-ads-accounts` return real HTTP errors when Google API fails**
- When Google returns non-2xx, respond with an HTTP status like `502` (and include a trimmed error message).
- This ensures `supabase.functions.invoke(...)` surfaces an error instead of silently returning an empty list.

3) **Update the UI to show the real error instead of “No accounts”**
File:
- `src/components/integrations/GoogleAdsAccountSelector.tsx`

Change logic:
- If `data?.success === false` and `data?.error` exists → show that error in the red alert UI.
- Only show “No Google Ads accounts found…” when `success === true` and `accounts.length === 0`.

Result after Phase A:
- The account selector will either:
  - show your real Google Ads accounts, or
  - show a clear actionable error (developer token issue, permissions issue, etc.).

### Phase B — Fix campaign mapping end-to-end (and remove mock data)

You explicitly said: **no mock data** (live app). Currently, `google-ads-mapping` returns mock campaigns and also writes to a table that doesn’t exist.

4) **Replace mock campaigns with real Google Ads campaigns**
File:
- `supabase/functions/google-ads-mapping/index.ts`

Implement `action: "list-available-campaigns"` by calling Google Ads API `googleAds:search` (using API version `v20`) and returning real campaigns:
- Query example:
  - `SELECT campaign.id, campaign.name, campaign.status FROM campaign WHERE campaign.status != 'REMOVED'`

Token handling approach:
- Use a **service-role Supabase client** to read/refresh `google_ads_tokens` (because of RLS).
- Use `GOOGLE_ADS_DEVELOPER_TOKEN` (already configured).

5) **Fix mapping writes to use the real table: `campaign_ad_mappings`**
The database table that exists is:
- `campaign_ad_mappings` (not `campaign_mappings`)

Update `google-ads-mapping`:
- `create-mapping` → insert/upsert into `campaign_ad_mappings`
  - Use the existing unique constraint `(tortshark_campaign_id, google_account_id, google_campaign_id)` via upsert.
- `delete-mapping` → delete from `campaign_ad_mappings`
- `get-mappings-for-campaign` (if used) → select from `campaign_ad_mappings`

Important: **RLS**
- `campaign_ad_mappings` has RLS policies tied to campaign ownership.
- In the edge function, we should either:
  - create a “user-scoped” Supabase client with the incoming JWT so RLS works naturally, or
  - use service role but manually enforce “user owns this campaign” checks.
  
I will implement the safer/cleaner approach: **user-scoped client for writes** + service-role only for token reads.

Result after Phase B:
- The mapping dialog will list *real* campaigns.
- Mapping actions will persist correctly and respect user permissions.

### Phase C — Prevent the next breakage (campaign sync + metrics)

6) **Fix `google-ads-data` token refresh bug**
`google-ads-data/index.ts` currently attempts:
- `.eq("provider", "google")` on `google_ads_tokens`

That column does not exist, so refresh updates can fail.
We’ll remove that filter and ensure updates target `.eq("user_id", userId)` only (and use service-role when needed).

7) **Re-test campaigns + spend sync**
Because `google-ads-sync` is used to load campaigns in `src/components/data-sources/GoogleAdsCampaigns.tsx`, it must also be on `v20`.

### Deployment + verification

8) Redeploy these Edge Functions after edits:
- `google-ads-accounts`
- `google-ads`
- `google-ads-data`
- `google-ads-sync`
- `google-ads-manager`
- `google-ads-mapping`

9) End-to-end test checklist (you can do immediately after the deploy)
- Go to `/data-sources?source=googleads`
- Connect Google Ads (OAuth)
- Confirm the account selector shows accounts (or a real error message, not the empty-state)
- Select multiple accounts → Save Connections
- Open the campaign mapping UI (where you map Google campaigns to TortShark campaigns)
- Confirm campaign lists are real (not mock) and mapping persists after refresh
- Confirm campaign sync calls work (no version errors)

## Why this will fix your exact symptom

Your “No accounts found” screen is being caused by a **hard 404 from Google** due to an invalid API version path. Switching to a valid REST version (`v20`) and surfacing backend errors in the UI will immediately either:
- populate accounts correctly, or
- reveal the next real blocker (developer token approval, manager header, permissions), instead of hiding it.

## Files that will be changed (summary)

Frontend:
- `src/components/integrations/GoogleAdsAccountSelector.tsx` (show real errors)

Edge Functions:
- `supabase/functions/google-ads-accounts/index.ts` (v20 + better error responses)
- `supabase/functions/google-ads/index.ts` (v20)
- `supabase/functions/google-ads-data/index.ts` (v20 + fix token refresh update logic)
- `supabase/functions/google-ads-sync/index.ts` (v20)
- `supabase/functions/google-ads-manager/index.ts` (v20)
- `supabase/functions/google-ads-mapping/index.ts` (remove mock data + write to correct table + RLS-safe)

