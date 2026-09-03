# Sherpherdsville Hostel Management System

Production-oriented final-year project: hostel complaints, operations, handbook, calendar, analytics, and AI-assisted triage.

## Implemented upgrades (all 10)

1. **Near real-time notifications** — 15s polling + badge dropdown (Channels packages included for optional WebSocket upgrade)
2. **Maintenance calendar** — scheduled works with affected blocks
3. **SLA / overdue badges** — Urgent 4h · High 24h · Medium 72h · Low 7d
4. **Specialist roles** — Electrician, Plumber, Carpenter, Cleaner, Security + category specialization
5. **AI triage** — rule-based category & priority suggestions on file-complaint
6. **Admin email digest** — `python manage.py send_admin_digest`
7. **FAQ / Resident handbook** — searchable; Shepherd chatbot answers from FAQ
8. **PWA** — installable via `vite-plugin-pwa`
9. **Audit log** — immutable action trail (admin UI)
10. **Bulk actions + analytics filters** — multi-select status updates; `/api/analytics/range/?from=&to=`

## Quick start

### Backend
```bash
cd Sherpherdsville-main
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # set SECRET_KEY + DB
python manage.py migrate
python manage.py seed_demo
python manage.py runserver
```

Demo logins after seed:
- `admin` / `admin123`
- `jane` / `demo123`

### Frontend
```bash
cd frontend
npm install
npm run dev
```

### Optional: admin digest cron
```bash
0 8 * * * cd /path/to/Sherpherdsville-main && venv/bin/python manage.py send_admin_digest
```

### Optional: Django Channels (true WebSockets)
Packages are in requirements. Wire `ASGI_APPLICATION` + Redis channel layer for production push; the UI already refreshes notifications every 15s without Redis.

## API highlights
| Endpoint | Purpose |
|----------|---------|
| `POST /api/triage/` | AI category/priority suggestion |
| `GET /api/scheduled-works/` | Maintenance calendar |
| `GET /api/faq/` | Handbook |
| `GET /api/audit-logs/` | Admin audit trail |
| `POST /api/complaints/bulk/` | Bulk status update |
| `GET /api/complaints/overdue/` | Overdue list |
| `GET /api/analytics/range/` | Date-filtered analytics |
| `POST /api/chatbot/` | Shepherd (+ FAQ answers) |

## Stack
Django 6 · DRF · JWT · PostgreSQL · React · Vite · TypeScript · Tailwind · Framer Motion · Recharts · PWA
