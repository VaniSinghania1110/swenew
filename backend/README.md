# Thesis Vault - Backend

The backend is an Express-based REST API built with Node.js 22.13+ utilizing native SQLite (`node:sqlite` DatabaseSync) for fast, zero-dependency persistence.

## Structure

```
backend/
├── index.js              # Application entrypoint: Express server setup, security middleware, static routing
├── config.js             # Centralized environment configuration and defaults
├── errors.js             # Unified error classification and middleware response handler
├── db/
│   ├── database.js       # SQLite connection, transaction helper (tx), and statement cache
│   ├── schema.sql        # Database tables, foreign keys, append-only triggers, and FTS5 search index
│   └── seed.js           # Demo database seeder and reset utility
├── middleware/
│   └── auth.js           # JWT authentication and role-based access control (RBAC) middleware
├── routes/
│   ├── auth.js           # /api/auth: Login, registration, session validation, logout
│   ├── theses.js         # /api: Submissions, versions, supervisor/examiner reviews
│   ├── library.js        # /api: Cataloguing, DOI assignment, repository search, citations
│   └── admin.js          # /api/admin: User management, guide assignments, settings, audit log
└── services/
    ├── workflow.js       # State machine rules, transition validations, and role permissions
    ├── submission.js     # Thesis draft creation, PDF upload validation, revisions
    ├── review.js         # Review records, committee assignments, page annotations
    ├── catalogue.js      # Accession numbers, DDC classes, visibility, repository publication
    ├── plagiarism.js     # Plagiarism detection adapter (Copyleaks / simulated)
    ├── storage.js        # PDF validation (magic bytes), text extraction, atomic disk storage
    ├── search.js         # SQLite FTS5 full-text queries over metadata and extracted PDF text
    ├── history.js        # Immutable audit logging and user notifications
    ├── reports.js        # Research metrics, department breakdowns, review latency analytics
    └── detail.js         # Aggregates complete thesis record and access permissions
```

## Running the Backend

From the repository root:

- **Start server**: `npm start` (or `node backend/index.js`)
- **Watch mode**: `npm run dev` (auto-restarts on changes)
- **Seed demo data**: `npm run seed`
- **Wipe and reseed**: `npm run reset`
- **Run tests**: `npm test`
