# RV CONTROL

**Independent management portal for Le Royal Village Café (رویال ویلاژ کافه).**

## Project isolation
- Independent GitHub repository: `dokhtaran1-dot/rv-control`.
- Royal One repository `dokhtaran1-dot/sahand-flutter-app` and its default branch have not been altered by this migration.
- No Royal One Supabase URL, key or customer/employee data is embedded in this repository.
- Production launch requires a **separate** Supabase backend and approved owner/admin accounts.

## Modules designed
- Owner reporting dashboard
- Role-based staff login and access control
- Rotating QR attendance registration
- Warehouse stock requests and procurement approval flow
- Protected payroll data (never hardcode salary or identity data in the public frontend)

## Current state
The frontend is stored in `index.html`, but remains disconnected from backend by design. Visitors see a setup notice until a dedicated Supabase project is configured. Do not enter credentials or share a QR for employee use before production deployment and access-control tests.

## Publishing
After configuring the separate backend, in GitHub: `Settings → Pages → Build and deployment → Deploy from a branch → main → /(root)`.
Expected page URL after activation: `https://dokhtaran1-dot.github.io/rv-control/`.

## Security requirements
Configure role-based row-level security, explicit invitation and assignment of owner/staff identities, data visibility and updates, audit logs, scheduled backup, and abuse/rate controls. No secret service-role key should ever be added to this repository.
