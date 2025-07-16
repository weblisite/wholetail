# Financier Features - Temporarily Disabled

## Overview
Financier features have been temporarily disabled pending CBK (Central Bank of Kenya) licensing approval.

## Backed Up Files
- `wholetail-frontend/src/components/Landing/FinancierLandingPage.tsx` → `FinancierLandingPage.tsx.backup`
- `wholetail-frontend/src/components/Dashboards/FinancierDashboard.tsx` → `FinancierDashboard.tsx.backup`

## Changes Made
1. **Landing.tsx**: Removed financier option from user type switcher
   - Removed `FinancierLandingPage` import
   - Updated `UserType` to exclude 'financier'
   - Removed financier object from `userTypes` array
   - Removed financier case from `renderLandingPage()` switch statement

2. **App.tsx**: Removed financier dashboard route
   - Removed `FinancierDashboard` import
   - Removed `/dashboard/financier` route

## To Restore When CBK Licensed
1. Rename backup files back to original names:
   ```bash
   mv FinancierLandingPage.tsx.backup FinancierLandingPage.tsx
   mv FinancierDashboard.tsx.backup FinancierDashboard.tsx
   ```

2. Restore imports and routes in Landing.tsx and App.tsx

3. Add financier back to user type options

## Current Active User Types
- Retailers: Buy wholesale, save 25%
- Wholesalers: Reach 8,500+ retailers

---
*Date: January 2025*
*Reason: Awaiting CBK licensing for financial services* 