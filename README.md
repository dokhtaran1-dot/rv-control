# RV CONTROL — Sahand Consortium / Royal Village Café

**Independent restaurant staff and operations control app.**

## Canonical implementation — 2026-11-25
- GitHub source deployed: **dokhtaran1-dot/rv-control**, branch main. Different repository from Royal One (dokhtaran1-dot/sahand-flutter-app).
- Public static frontend: https://dokhtaran1-dot.github.io/rv-control/
- Dedicated Supabase project: **RV-CONTROL** (wtwbemwyntvocdilaukk), separate from Royal One.
- index.html contains login, owner overview, 75-second QR attendance, staff roster, purchase workflow and protected base payroll.
- rv-modules.js provides 14-day shift planning, daily sales and costs, inventory ledger, bonus/deduction reviews and restricted staff-account authorization.
- Legacy branch sahand-flutter-app/rv-control-pages was inspected READ-ONLY. It is not the canonical deployed RV CONTROL. The Royal One main branch was not changed.

## Current data — no fake values
- 28 historical staff rows: 21 active, 7 inactive. None removed during these updates.
- 21 salary records including 3 intentionally unknown amounts. Salary amounts are private database content, not GitHub source.
- One confirmed and previously signed-in Auth user has the owner app role, linked to **ترانه (محمدیان)**.
- User states that **حامد قنبری درویش** is the legal owner. Do NOT silently remove Taraneh's current account; create/confirm Hamed's separate login identity before reconciling delegated application role.
- No actual attendance scans, scheduled shifts, recorded daily sales/costs, inventory movements or payroll adjustments in latest database counts.
- No other active employee or manager Auth user profiles are confirmed.
- Free tier only; no paid plans, SMS or OTP provider enabled.

## Authentication — mobile identifier + password without SMS
Staff number is used as a LOGIN IDENTIFIER, not verified ownership of the phone number.
Iranian phone 0914xxxxxxx is transformed to an internal reserved alias such as rv-98914xxxxxxx@example.com. This is NOT a real mailbox. An administrator must create and confirm that account in the independent project's Supabase Authentication > Users and only then approve it for an active RV staff member in the owner-only Accounts tab. Do not share or commit passwords.
Privileged automated Auth user creation was NOT deployed.
Real phone/browser password authentication tests still require a user-controlled login.

## Permissions and backend
Database roles: owner, executive, manager, chef, stock, procurement, cashier, accountant, auditor, staff and kiosk. All sensitive RPC functions independently verify role on the server.
- 14-day shifts: non-overlap, cancellation and audit; employees can see their own future shifts.
- Attendance: rotating 75-second QR, check-in and check-out, management review with notes. No scan is NOT evidence of confirmed absence.
- Daily sales and costs: change history, expense reversal with reason, time-bounded reports; difference is NOT net profit.
- Payroll adjustments: proposal, owner approval/rejection, and role-protected listings.
- Warehouse: inbound/outbound append-only movements and recorded-balance checks.
- Access board: existing confirmed Supabase Auth users may be assigned to active staff by the authorized owner account; no browser-side role grant.
- Sensitive new tables have RLS enabled and direct privileges revoked for public/anon/authenticated users; access uses guarded RPCs.

## Requested management directory
- Legal owner/president: حامد قنبری درویش
- CEO: جهانگیر دلجو
- Salon manager: امیر ماهنور
- Head chef: داوود چرخت (Charhat)
- ناصر سلمان‌زاده and مسعود اتحاد‌نژاد are excluded from current management.
The directory is informative, not an Auth role assignment.

## Verified versus awaiting live test
- GitHub Pages workflow succeeded on latest independent frontend commit.
- Source syntax validated and no legacy Royal One Supabase project URL in active frontend.
- Supabase backend ACTIVE_HEALTHY; structure and selected role-based SQL read paths checked.
- Anonymous EXECUTE privilege denied on all RV CONTROL RPC functions.
- NOT LIVE-TESTED end-to-end: employee mobile/password login in Android browser, true QR scans on premises, real stock entry/exit, actual payroll approval, sales/expense data entry, individual staff permissions and owner identity handover.
- Do not describe any untested behavior as complete.

## Data separation
Only public static HTML/JS and publishable project key are in GitHub. Private salaries, staff records, sales and authentication data remain in dedicated RV-CONTROL Supabase. Never commit secrets, service-role keys, raw employee data, passwords, or contact details into public frontend.
No Royal One services, database, or main-branch files should be modified.
