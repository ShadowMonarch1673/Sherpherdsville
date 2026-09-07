# Test Results

Tested on 3 September 2026 with Python 3.12.13, Django 6.0.7, and Django REST Framework 3.17.1.

## Passed

- `python manage.py check`: no issues
- `python manage.py makemigrations --check --dry-run`: no model/migration drift
- `python manage.py test`: 14/14 API regression tests passed, including existing-user email OTP login, phone-OTP rejection, automatic priority, and administrator-controlled room assignment
- Fresh SQLite migration: all migrations applied successfully
- `python manage.py seed_demo`: completed successfully twice (idempotency check)
- `python manage.py send_admin_digest`: completed successfully
- Frontend relative-import validation: all referenced local modules exist
- Frontend/API route-contract validation: every frontend API call has a backend route
- Railway backend-host regression check: `RAILWAY_PUBLIC_DOMAIN` is appended to Django's `ALLOWED_HOSTS`
- Railway frontend-host configuration: Vite preview restricts access to the injected `RAILWAY_PUBLIC_DOMAIN`
- Public homepage asset check: no external or local imagery is rendered on the homepage
- UI palette check: public homepage, login, navigation shell, dashboard statistics, statuses, CTA, and pinned labels use the approved complaint-portal colors
- Screenshot audit: reviewed 24 supplied admin and resident screenshots
- Resident navigation audit: limited to Dashboard, Complaints, Announcements, Profile, and New Complaint
- Route authorization audit: Maintenance Calendar is protected for staff in both React routing and the API
- Public copy audit: removed legacy login explanation, unused Handbook and chatbot interfaces, and user-facing em dashes
- Light-theme contrast guard: remaining legacy translucent-white text utilities are converted to readable gray within the portal shell

## Environment note

The frontend package registry was unavailable in the test environment, so `npm ci` and a fresh `npm run build` could not be performed. The obsolete checked-in `frontend/dist` bundle is excluded from the corrected archive so it cannot serve the previous phone-OTP interface. Python files passed syntax compilation. The previously completed 14-test backend run remains recorded above; the latest staff-calendar authorization assertion should be rerun by Railway or CI after dependencies install. Run `npm ci && npm run build` and `python manage.py test` before production deployment.
