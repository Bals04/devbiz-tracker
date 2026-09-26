# Add team photos and payment splits

## Summary

- Show Erman, Jasmine, and Jonhyl’s photos on avatars (Settings → Team, task assignees, payment splits) instead of initials only.
- When recording a payment, choose **Split** to assign each teammate a percent of that payment. Shares are percents of the payment amount (for example 15% of ₱3,000 = ₱450). Anything not assigned stays unassigned.
- Click a card in **Payment history** (or a row on the Payments tab) to open the split calculation: who got what, the formula, and what is left.

## Test plan

- [ ] Apply `supabase/migrations/202609100001_payment_splits.sql` in the Supabase SQL editor (required before listing or recording splits).
- [ ] Open Settings → Team and confirm Erman, Jasmine, and Jonhyl show their photos.
- [ ] Record a payment of ₱3000, set Team split to **Split**, give one member 15% and another 50%, and confirm the live amounts (₱450 and ₱1,500) and unassigned remainder.
- [ ] Confirm there is no “Person” placeholder and no “% of what’s left” option; the first available teammate is selected automatically.
- [ ] Click that payment in Payment history and confirm the dialog shows `₱3,000 × 15% = ₱450`, then the next share, then unassigned.
- [ ] Record a payment with **No split** and confirm it still saves, and the dialog says it was not split.
- [ ] Confirm photos also appear on task assignee chips.

## Deploy note

Run the new migration before deploying this branch. Payment lists join `payment_splits`; without the table those requests will fail.
