# uStudy Grade Verification System

**Version:** MVP v2 (implemented)  
**Last Updated:** July 2026

This document describes the **current implementation** in this repository.

---

## Overview

Grade verification confirms HKUST students before enabling seller access (`users.is_seller = true`).

Stack:

- Next.js route handlers
- Supabase Auth + PostgreSQL
- Private transcript storage (Cloudflare R2 preferred, Supabase Storage fallback)
- Gemini parsing + regex fallback
- Human admin review for edge cases

---

## End-to-End Flow

```text
Student uploads PDF (/grades/upload)
        │
        ▼
Pre-checks (auth, email verified, profile complete, quota, not already seller)
        │
        ▼
Store PDF privately (R2/Supabase)
        │
        ▼
Parse + risk scoring (Gemini -> regex fallback)
        │
        ├─ Parse failed ──────────────► manual_required
        │                                 ├─ manual grade submit
        │                                 └─ admin review request
        │
        └─ Parse succeeded ───────────► pending_review + review_rows
                                          │
                                          ├─ All Green + eligible ──► POST /api/grades/confirm
                                          │                              ├─ approved
                                          │                              ├─ is_seller = true
                                          │                              └─ delete PDF
                                          │
                                          └─ Purple/Orange or risk ───► POST /api/grades/admin-review
                                                                         └─ admin approve/reject
```

---

## Row Review Model

Each parsed course row is tracked in `grade_verifications.review_rows`:

| State | Meaning |
|-------|---------|
| Green | AI extracted, user made no edits |
| Purple | AI extracted, user edited fields |
| Orange | User added missing course |

Auto-approval requires:

- `auto_approval_eligible = true` (low-risk parser decision)
- all rows Green
- user confirms via `POST /api/grades/confirm`

---

## API Endpoints

| Endpoint | Purpose |
|----------|---------|
| `POST /api/grades/upload` | Upload transcript, parse, create verification |
| `POST /api/grades/confirm` | User confirms all-green rows, auto-approve + seller activation |
| `POST /api/grades/admin-review` | Request manual admin review |
| `POST /api/grades/admin-review/cancel` | Cancel pending review + delete stored PDF |
| `POST /api/grades/manual` | Submit manual courses when parse fails |
| `GET /api/grades/status` | Latest verification + queue status |
| `GET /api/grades/config` | Public runtime limits |
| `GET/POST /api/admin/grades/reviews` | Admin review queue |
| `GET/POST /api/admin/grades/reviews/[requestId]` | Admin detail + approve/reject |
| `POST /api/internal/grades/retention-cleanup` | Delete rejected PDFs after retention window |

---

## Database Tables

- `grade_verifications` — core status, parsed/manual data, risk metadata, review rows
- `grade_parse_queue` — support routing and queue state
- `review_actions` — audit trail
- `admin_review_requests` — manual escalation requests
- `user_roles` — support/admin authorization

Key migration files:

- `docs/migrations/007_grade_verifications.sql`
- `docs/migrations/008_transcript_verification_pipeline.sql`
- `docs/migrations/009_admin_review_requests.sql`
- `docs/migrations/010_transcript_storage_fields.sql`
- `docs/migrations/011_human_review_pipeline.sql`
- `docs/migrations/012_admin_review_external_transcript_url.sql`
- `docs/migrations/013_grade_verification_confirmation_and_retention.sql`

---

## Storage Policy

- Parsed + user-confirmed auto-approval: PDF deleted immediately after approval
- Manual/admin review: PDF retained until resolution
- Rejected: PDF retained until `rejected_retention_until`, then deleted by retention cleanup cron

Supabase stores metadata and structured course data only (no permanent PDF storage).

---

## Admin Portal

Staff-facing transcript review UI (maps to the 8-part admin portal spec):

| Spec route | UStudy route |
|---|---|
| Dashboard | `/admin` |
| Verification queue | `/admin/grades` |
| Review page | `/admin/grades/[requestId]` |
| Audit log | `/admin/audit` |

| Spec table | UStudy table |
|---|---|
| `transcript_requests` | `admin_review_requests` + `grade_verifications` |
| `transcript_courses` | `grade_verifications.review_rows` |
| `audit_logs` | `review_actions` |
| `admin_users` | `users` + `user_roles` |

Run migrations **014** (reviewer lock) and **017** (structured reject reasons) before using the admin portal.

---

## Configuration

Defaults (overridable via env):

| Setting | Development | Production |
|---------|-------------|------------|
| Uploads/day | 50 | 3 |
| Max file size | 10 MB | 20 MB |
| Parse retries | 10 | 2 |
| Signed URL TTL | 600s | 600s |
| Reject retention | 30 days | 30 days |

Environment variables:

- `GRADE_MAX_UPLOADS_PER_DAY`
- `GRADE_MAX_FILE_SIZE_MB`
- `GRADE_MAX_PARSE_RETRIES`
- `GRADE_SIGNED_URL_EXPIRES_SECONDS`
- `GRADE_REJECT_RETENTION_DAYS`
- `GRADE_RETENTION_CRON_SECRET`

---

## Seller Gate

`/notes/upload` is protected by middleware:

- unauthenticated users -> login
- non-sellers -> redirect to `/grades/upload?reason=seller_required`

Seller flag is set on:

- successful `POST /api/grades/confirm`
- admin approve in `POST /api/admin/grades/reviews/[requestId]`

---

## Emails

- Admin review request email (to `ADMIN_REVIEW_EMAIL`)
- Student approval email
- Student rejection email

---

## Operations

Schedule retention cleanup (example daily cron):

```bash
curl -X POST https://<your-domain>/api/internal/grades/retention-cleanup \
  -H "x-cron-secret: $GRADE_RETENTION_CRON_SECRET"
```

---

## Status Values

`grade_verifications.status`:

- `manual_required`
- `pending_review`
- `approved`
- `rejected`
