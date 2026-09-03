# Suggested Upgrades — Sherpherdsville Final Year Project

## Already strong
- Dual role system (Resident / Admin)
- Complaint lifecycle + attachments + comments + reviews
- Shepherd chatbot
- Announcements + analytics + CSV export
- Frosted-glass UI + landing page + mobile sidebar

## High-impact next upgrades (recommended)

### 1. Real-time notifications (WebSockets)
Use Django Channels + Redis so status changes appear instantly without refresh.
**Why it impresses:** shows systems knowledge beyond REST polling.

### 2. Maintenance calendar / scheduled works
Admins publish planned outages (water, power). Residents see a calendar view.
**Models:** `ScheduledWork(title, category, start, end, affected_blocks)`.

### 3. SLA timers & overdue badges
Auto-flag complaints that exceed category-specific resolution SLAs (e.g. URGENT = 4h).
**Dashboard widget:** “Overdue (3)” with red badges.

### 4. Role specialization (Electrician / Plumber staff)
Expand roles so specialists only see their category queue.
You already have `category_specialization` on User — wire the UI.

### 5. AI triage (optional)
On complaint create, call a free LLM API (or rules) to suggest category + priority.
Show “Suggested: Plumbing · HIGH” with one-click accept.

### 6. Push / email digests
Daily summary email to admins: new + overdue tickets.
You already have email settings in Django.

### 7. Resident handbook / FAQ knowledge base
Searchable articles (“How to report a gas leak”) that Shepherd chatbot can also cite.

### 8. Offline-friendly PWA
Add `vite-plugin-pwa` so the portal installs on phones and caches the shell.

### 9. Audit log
Immutable log of who changed what (status, assignment). Great for viva questions.

### 10. Multi-hostel / block selector
If the residence has multiple blocks, filter complaints by block/wing.

## Presentation tips
1. Seed with `python manage.py seed_demo`
2. Demo path: Landing → Register/Login → Resident files complaint with photo → Admin assigns & resolves → Review + chart update
3. Open Shepherd chatbot mid-demo
4. Show mobile responsive view (Chrome DevTools)

## Quick wins still open
- [ ] Dark/light theme toggle (you’re dark-first already)
- [ ] Bulk status update for admins
- [ ] Filter by date range on analytics
- [ ] Profile picture upload UI
