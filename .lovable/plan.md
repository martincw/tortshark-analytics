

# Fix Google Ads API Version - 404 Error

## Problem Identified

The Google Ads integration is failing because the edge functions are calling a **non-existent API version (v18)**. The Google Ads API is returning a 404 error:

```
The requested URL /v18/customers:listAccessibleCustomers was not found on this server.
```

The database shows your OAuth tokens are valid and properly stored - the issue is purely an API version mismatch.

## Solution

Update all Google Ads edge functions to use **v17** (the current stable version as of late 2024).

## Files to Update

| File | Current Version | Change To |
|------|-----------------|-----------|
| `supabase/functions/google-ads-accounts/index.ts` | v18 | v17 |
| `supabase/functions/google-ads/index.ts` | v18 | v17 |
| `supabase/functions/google-ads-data/index.ts` | v16 | v17 |

## Changes Required

### 1. google-ads-accounts/index.ts
- Line 144: Change `v18` to `v17` in listAccessibleCustomers URL
- Line 184: Change `v18` to `v17` in customer details URL

### 2. google-ads/index.ts
- Line 165: Change `v18` to `v17` in listAccessibleCustomers URL
- Line 220: Change `v18` to `v17` in customer details URL

### 3. google-ads-data/index.ts
- Line 185: Change `v16` to `v17` in listAccessibleCustomers URL

### 4. Deploy all three edge functions

## Expected Result

After this fix:
- The "No Google Ads accounts found" error will be resolved
- Your connected Google account will show available Ads accounts
- You can proceed to select accounts and map campaigns

