

# Fix Date Selector Issues - "Last 180 Days", "Last 270 Days" and "All Time"

## Problem Summary

The date selector has several bugs that cause incorrect behavior when selecting longer time periods:

1. **Missing `isSelected` cases**: The "Last 180 Days" and "Last 270 Days" buttons never highlight as selected because the `isSelected()` function doesn't have cases for them
2. **Broken "All Time" detection**: When "All Time" is selected, it sets empty strings (`{ startDate: '', endDate: '' }`), but the `isSelected('AllTime')` check looks for dates 2 years ago - these will never match
3. **No "Trailing 6 months" option exists**: The closest options are "Last 180 Days" (~6 months) and "Last 270 Days" (~9 months)

## Root Cause

In `src/components/dashboard/QuickDateSelector.tsx`:

**Selection logic (works correctly)**:
- Lines 110-117 correctly set `Last180Days` and `Last270Days` date ranges
- Line 120 correctly sets empty strings for `AllTime`

**Highlight logic (broken)**:
- Lines 168-269: The `isSelected()` switch statement is missing cases for:
  - `Last180Days`
  - `Last270Days`
- Lines 219-224: The `AllTime` case incorrectly checks for a 2-year-old start date instead of checking for empty strings

## Technical Solution

Update the `isSelected()` function in `QuickDateSelector.tsx` to:

1. **Add missing cases for Last180Days and Last270Days**:
```javascript
case 'Last180Days':
  const last180End = new Date(yesterday);
  const last180Start = subDays(last180End, 179);
  return (
    format(startDate, "yyyy-MM-dd") === format(last180Start, "yyyy-MM-dd") &&
    format(endDate, "yyyy-MM-dd") === format(last180End, "yyyy-MM-dd")
  );
case 'Last270Days':
  const last270End = new Date(yesterday);
  const last270Start = subDays(last270End, 269);
  return (
    format(startDate, "yyyy-MM-dd") === format(last270Start, "yyyy-MM-dd") &&
    format(endDate, "yyyy-MM-dd") === format(last270End, "yyyy-MM-dd")
  );
```

2. **Fix the AllTime detection** to check for empty strings:
```javascript
case 'AllTime':
  // AllTime uses empty strings, so check if currentRange has no dates
  return !currentRange?.startDate && !currentRange?.endDate;
```

## File Changes

| File | Changes |
|------|---------|
| `src/components/dashboard/QuickDateSelector.tsx` | Add missing `isSelected` cases for Last180Days, Last270Days; Fix AllTime detection logic |

## Expected Behavior After Fix

- Selecting "Last 180 Days" will correctly highlight the button as selected
- Selecting "Last 270 Days" will correctly highlight the button as selected  
- Selecting "All Time" will correctly highlight the button as selected
- The actual date filtering logic already works correctly - this fix is for the UI indication

