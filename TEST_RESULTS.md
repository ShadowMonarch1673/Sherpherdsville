# Test Results

Tested on 3 September 2026 with Python 3.12.13, Django 6.0.7, and Django REST Framework 3.17.1.

## Passed

- `python manage.py check` — no issues
- `python manage.py makemigrations --check --dry-run` — no model/migration drift
- `python manage.py test` — 14/14 API regression tests passed, including existing-user email OTP login, phone-OTP rejection, automatic priority, and administrator-controlled room assignment
- Fresh SQLite migration — all migrations applied successfully
- `python manage.py seed_demo` — completed successfully twice (idempotency check)
- `python manage.py send_admin_digest` — completed successfully
- Frontend relative-import validation — all referenced local modules exist
- Frontend/API route-contract validation — every frontend API call has a backend route

## Environment note

The frontend package registry was unavailable in the test environment, so `npm ci` and a fresh `npm run build` could not be performed. The obsolete checked-in `frontend/dist` bundle is excluded from the corrected archive so it cannot serve the previous phone-OTP interface. The modified TypeScript source passed import and API-contract validation. Run `npm ci && npm run build` before production deployment.
