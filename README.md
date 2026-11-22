# RV CONTROL · Le Royal Village Café

Independent restaurant operations app under Sahand Consortium / Royal Mall.

## Current verified state — 2026-11-22

- **GitHub repository:** `dokhtaran1-dot/rv-control`, branch `main`.
- **Dedicated Supabase project:** `RV-CONTROL` (`wtwbemwyntvocdilaukk`), healthy; creation quote **$0/month** (free-tier limits apply).
- The web frontend in `index.html` connects **only** to the dedicated RV-CONTROL backend, not to Royal One.
- Independent database contains **21 active RV staff**, **9 inactive/former/Royal Mall-only entries**, **21 salary records**, and **3 deliberately blank salaries**; known salary sum is **632,000,000 toman**.
- The old Royal One project and repository have not been modified by this migration.
- **GitHub Pages is not yet enabled** (`has_pages=false` at last verification).
- Owner/staff accounts are **not yet onboarded**. The app is not ready for live use until roles are assigned and verified.

## Publish the public frontend (data stays private)

GitHub → repo **Settings** → **Pages** → `Deploy from a branch` → `main` → `/(root)` → Save.
Then check `https://dokhtaran1-dot.github.io/rv-control/`.
The repository is public, so **never commit passwords, private salary lists, employee IDs, secret keys, or service-role keys**. A Supabase **publishable key** is safe in a browser but access control depends on Auth and RLS.

## Authentication

Employee signup alone grants **no** access. Owner must approve role in `rvctl_access` referencing the user's confirmed Auth UUID. Do not assign owner rights based on email text alone. The owner account must be verified before activating staff accounts. No service upgrades or paid operations were activated.

## Implemented modules

Owner reporting dashboard; login and per-role access; time-limited QR attendance; staff roster; owner-approved purchase workflow; inventory requests; confidential salary display.

## Security

- All public-data tables have RLS enabled.
- Anonymous table access and salary access by nonprivileged employees are blocked.
- Privileged RPC functions check authenticated role on every call.
- The QR challenge storage has RLS without a SELECT policy intentionally (tokens cannot be enumerated by the client).
- Before production: test end-to-end authentication, staff QR scanning, approval transitions and payroll visibility.

## Pending

1. Turn on GitHub Pages.
2. Set up and authorize the verified owner identity.
3. Validate real sign-in, QR scanning, warehouse workflow and permission boundaries.
4. Optional: Android home-screen install via PWA when tested.

No expenses above the free tier were approved or enabled.
