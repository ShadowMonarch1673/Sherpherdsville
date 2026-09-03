# Sherpherdsville Hostel Complaint Management System

A Django REST API and React/Vite portal for resident complaint reporting, staff workflows, announcements, maintenance scheduling, notifications, analytics, and audit history.

## Requirements

- Python 3.12+
- Node.js 20+
- PostgreSQL for production (SQLite is used automatically for local development)

## Local setup

### Backend

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

The backend is available at `http://127.0.0.1:8000`.

### Frontend

In another terminal:

```bash
cd frontend
npm ci
npm run dev
```

The frontend is available at `http://127.0.0.1:5173` and proxies `/api` to Django.

## Demo access

- Administrator: `admin` / `ChangeMe123!`
- Residents: request an OTP using any seeded email listed in `db-demo.txt`. Existing active resident users can also sign in with the email saved on their user record; a separate registry entry is not required.
- With the default development configuration, the OTP is returned in the API response and printed by the console email backend. Set `OTP_DEBUG_RETURN_CODE=False` in production.

Change the demonstration administrator password before any shared deployment.

## Tests and checks

```bash
python manage.py check
python manage.py makemigrations --check
python manage.py test
cd frontend
npm run build
```

## Environment configuration

Local development starts without PostgreSQL or email credentials. See `.env.example` for all options.

- `DATABASE_URL`: primary PostgreSQL connection in production.
- `EXTERNAL_DATABASE_URL`: optional read-only resident registry database. Email is the only OTP identifier. When omitted, existing resident users and the local `ResidentRegistry` table are checked.
- `BREVO_API_KEY`: optional Brevo email API key. When omitted, Django's configured email backend is used.
- `VITE_API_URL`: optional frontend API base URL; defaults to `/api`.

Never enable `DEBUG` or `OTP_DEBUG_RETURN_CODE` in production.

## Main API routes

| Route | Purpose |
| --- | --- |
| `POST /api/auth/otp/request/` | Request a resident OTP by email |
| `POST /api/auth/otp/verify/` | Exchange an OTP for JWT tokens |
| `GET/POST /api/complaints/` | List or file complaints |
| `GET/PATCH /api/complaints/<id>/` | Read or update a complaint |
| `POST /api/complaints/<id>/reopen/` | Re-open a closed complaint |
| `POST /api/complaints/bulk/` | Admin bulk status update |
| `GET /api/analytics/` | Role-scoped complaint analytics |
| `GET /api/analytics/range/?from=&to=` | Date-filtered analytics |
| `GET/POST /api/announcements/` | View or publish announcements |
| `GET/POST /api/scheduled-works/` | View or publish maintenance work |
| `GET /api/faq/?q=` | Search the resident handbook |
| `GET /api/audit-logs/` | Admin audit trail |
| `POST /api/triage/` | Rule-based category and priority suggestion |
| `POST /api/chatbot/` | Resident helper and FAQ search |

Room numbers are assigned by administrators on resident user records and cannot be changed through the resident profile or complaint form. Complaint priority is assigned automatically from the title and description; staff may override it after operational review.

## Daily administrator digest

Run manually with:

```bash
python manage.py send_admin_digest
```

Example cron entry:

```text
0 8 * * * cd /path/to/Sherpherdsville-main && .venv/bin/python manage.py send_admin_digest
```

## Production notes

1. Set `DEBUG=False`, a strong `SECRET_KEY`, production hosts/origins, `DATABASE_URL`, and real email settings.
2. Run `python manage.py migrate` and `python manage.py collectstatic --noinput` during deployment.
3. Build the frontend with `npm ci && npm run build` and serve `frontend/dist` from the web root.
4. Start Django with the included `Procfile` command or an equivalent process manager.
