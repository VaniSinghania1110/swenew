# 🎓 Thesis Vault — Complete Viva & Codebase Guide

> **Created for Viva Preparation (CS314 Software Development Lab / SWE Project Defense)**  
> This guide covers **every single file** in the project, what happens inside it, which requirements it satisfies, and the **exact answers to give your external/internal examiner**.

---

## ⚡ Super-Quick Viva Cheat Sheet ("Exam Examiner Ne Poocha Toh Ye Bolna")

| If the Examiner Asks... | Direct File to Mention | Core Function / Mechanism |
|---|---|---|
| **"Where is login and authentication handled?"** | `backend/routes/auth.js` & `backend/middleware/auth.js` | Bcrypt password hashing + JWT token signed in `httpOnly`, `SameSite=Strict` cookie (`tv_session`) + 5-attempt rate limiter. |
| **"Where is Role-Based Access Control (RBAC) enforced?"** | `backend/middleware/auth.js` | `requireRole(...roles)` middleware checks `req.user.role` against 6 system roles. |
| **"Where is the thesis lifecycle / state machine?"** | `backend/services/workflow.js` | `TRANSITIONS` map enforces state transitions (Draft → Submitted → UnderGuideReview ⇄ RevisionRequired → UnderCommitteeReview → Approved → Catalogued → Published). |
| **"How is plagiarism / similarity checked?"** | `backend/services/plagiarism.js` | 6-word shingle n-gram algorithm (mock) or third-party HTTP adapter; compares score against institute threshold (default 20%). |
| **"Where is PDF validation & atomic file writing?"** | `backend/services/storage.js` | Validates `%PDF-` magic bytes (not just file extension); writes via `.part` temporary file + atomic rename (`fs.renameSync`) so no partial uploads occur. |
| **"How is full-text search done on thesis text?"** | `backend/services/search.js` & `backend/db/schema.sql` | SQLite `FTS5` virtual table (`thesis_fts`) with BM25 ranking over metadata + extracted PDF text using the Porter stemmer. |
| **"Where are database transactions handled?"** | `backend/db/database.js` | Native Node 22 SQLite `DatabaseSync` with re-entrant `tx(fn)` helper using `BEGIN IMMEDIATE` and `COMMIT` / `ROLLBACK`. |
| **"How are append-only versions & audit logs enforced?"** | `backend/db/schema.sql` | Database triggers `BEFORE DELETE` and `BEFORE UPDATE` execute `SELECT RAISE(ABORT, ...)` preventing tampering. |
| **"Why is there no React or Webpack in frontend?"** | `frontend/index.html` & `frontend/js/app.js` | Built as a zero-build Vanilla JS Single Page Application (SPA) using native ES Modules (`import`/`export`), loading instantly with zero bundle overhead. |

---

## 🗂️ 1. Backend Architecture (`backend/`)

```
backend/
├── index.js              # Express app entry, security headers, static routing
├── config.js             # Environment variables & runtime directory paths
├── errors.js             # Central error catalog & Express error handler
├── db/
│   ├── database.js       # SQLite connection, transaction wrapper & prepared statements
│   ├── schema.sql        # Database tables, triggers, indices, FTS5 virtual table
│   └── seed.js           # Demo database seeder & wipe utility
├── middleware/
│   └── auth.js           # JWT authentication & requireRole RBAC middleware
├── routes/
│   ├── auth.js           # Login, self-registration, session check, logout
│   ├── theses.js         # Scholar submissions, drafts, revisions, PDF streaming
│   ├── library.js        # Cataloguing queue, classification, DOI publishing, repository
│   └── admin.js          # User management, guide assignments, system settings, audit log
└── services/
    ├── workflow.js       # State machine, valid transitions & access rules
    ├── submission.js     # Thesis metadata validation, drafting, submission, revisions
    ├── review.js         # Supervisor & examiner reviews, workload-based examiner assignment
    ├── catalogue.js      # Accession numbers, DDC classes, DOI issuance, APA/IEEE citations
    ├── plagiarism.js     # Similarity check adapter & 6-word shingle algorithm
    ├── storage.js        # Magic byte PDF validation, text extraction, atomic disk writes
    ├── search.js         # FTS5 search queries, BM25 ranking, facets, snippet generation
    ├── history.js        # Immutable audit logging & user notifications
    ├── reports.js        # Institutional research analytics, review latency, CSV export
    └── detail.js         # Dynamic thesis record assembly & role-based field redaction
```

---

### Detailed File Breakdown — Backend

#### `backend/index.js` — *Server Entrypoint & Security Pipeline*
- **What it does**: Initializes the Express application, applies HTTP security headers, parses incoming JSON/cookies, registers all API routes under `/api`, serves static frontend files, and starts HTTP/HTTPS listener.
- **Key Code**:
  - Security headers: `res.setHeader('Content-Security-Policy', ...)` prevents XSS; `X-Content-Type-Options: nosniff`; `X-Frame-Options: SAMEORIGIN` prevents clickjacking.
  - Static fallback: `app.use(express.static(config.publicDir))` and `app.get('/{*splat}', ...)` serves `frontend/index.html` for client-side routing.
- **Viva Answer**: *"This is our backend entrypoint. It configures enterprise security headers (CSP, CORS, frame options), connects the authentication middleware to every request, mounts the API routes, and serves the frontend SPA statically."*

#### `backend/config.js` — *Central Configuration*
- **What it does**: Reads environment variables (`PORT`, `JWT_SECRET`, `DATA_DIR`, `PLAGIARISM_API_KEY`) and provides directory paths (`dbFile`, `uploadDir`, `publicDir`).
- **Key Code**: Defaults to `./data` for runtime SQLite and `./frontend` for the UI.
- **Viva Answer**: *"Centralizes all configurable parameters such as JWT secret, port, upload size limits (50 MB), and plagiarism API keys so secrets are not hardcoded."*

#### `backend/errors.js` — *Standard Error Catalog*
- **What it does**: Defines application error classes (`AppError`), status codes, and an Express error handling middleware (`errorHandler`).
- **Key Code**: `fail(code, message, status, details)` maps errors to standardized JSON responses `{ error: { code, message, details } }`.
- **Viva Answer**: *"Ensures consistent error responses across all endpoints, matching the Lab 7 Software Interface Specification codes like `MISSING_REQUIRED`, `GUIDE_NOT_ASSIGNED`, and `INVALID_FILE`."*

#### `backend/db/database.js` — *SQLite Engine & Transactions*
- **What it does**: Connects to SQLite using Node 22's built-in `node:sqlite` (`DatabaseSync`), executes `schema.sql`, provides statement caching (`stmt`), and exposes atomic transaction helper `tx(fn)`.
- **Key Code**:
  - `PRAGMA journal_mode = WAL; PRAGMA foreign_keys = ON;`
  - `tx(fn)`: Uses `BEGIN IMMEDIATE` and `COMMIT` / `ROLLBACK`. Supports nested calls via a re-entrant depth counter.
- **Viva Answer**: *"We use Node 22's native DatabaseSync SQLite with Write-Ahead Logging (WAL) for high concurrency. Multi-step operations like submitting a thesis or recording a review run inside our `tx()` transaction helper to guarantee ACID atomicity (NFR-008)."*

#### `backend/db/schema.sql` — *Relational Data Model & Triggers*
- **What it does**: DDL for all 11 tables (`users`, `departments`, `theses`, `thesis_versions`, `plagiarism_checks`, `reviews`, `annotations`, `revision_requests`, `catalogue_records`, `thesis_history`, `notifications`, `audit_log`, `settings`) and the `thesis_fts` virtual table.
- **Key Highlights**:
  - Triggers `versions_no_delete` & `versions_no_overwrite`: Blocks DELETE or UPDATE on `thesis_versions` (enforces BR-005: append-only versions).
  - Triggers `audit_no_update` & `audit_no_delete`: Enforces immutable audit logging (NFR-016).
  - Virtual Table `thesis_fts USING fts5`: Indexes title, abstract, keywords, author, and full PDF text with Porter stemming.
- **Viva Answer**: *"Our database schema enforces business rules directly at the engine level using SQL triggers—preventing any version deletion or audit record tampering even if someone tried via raw SQL."*

#### `backend/db/seed.js` — *Demo Data Generator*
- **What it does**: Populates demo departments (CSE, ECE, ME, etc.), users for all 6 roles with password `Password@123`, and 14 theses spanning every stage of the lifecycle.
- **Viva Answer**: *"Drives the actual service methods to seed realistic demo data, ensuring all audit logs, notifications, and approval records reflect genuine workflow actions."*

#### `backend/middleware/auth.js` — *Authentication & Role-Based Authorization*
- **What it does**:
  - `issueSession`: Signs JWT containing `{ sub: user.id, role: user.role }` and stores it in an `httpOnly`, `SameSite=Strict`, `secure` cookie named `tv_session`.
  - `authenticate`: Runs on every request. Decodes JWT and fetches current user status from DB.
  - `requireRole(...roles)`: Verifies caller possesses an authorized role; otherwise halts with 403 Forbidden.
- **Viva Answer**: *"Authentication uses JWT tokens stored in httpOnly cookies so client JavaScript cannot access them, preventing token theft via XSS. RBAC is enforced per route with `requireRole`."*

#### `backend/routes/auth.js` — *Authentication Endpoints*
- **What it does**:
  - `POST /api/auth/login`: Verifies email and password using `bcrypt.compare`. Implements brute-force throttling (max 5 failed attempts per IP+email per 15 minutes).
  - `POST /api/auth/register`: Scholar self-registration restricted to `@lnmiit.ac.in` domain (FR-001).
  - `GET /api/auth/me`: Returns currently authenticated user and unread notification count.
  - `POST /api/auth/logout`: Clears session cookie.
- **Viva Answer**: *"Handles login, registration, and session verification with built-in rate-limiting against brute force attacks."*

#### `backend/routes/theses.js` — *Thesis Submission & Review Endpoints*
- **What it does**:
  - Scholar routes: `POST /theses/submit`, `POST /theses/draft`, `PUT /theses/:id/draft`, `POST /theses/:id/revisions`, `GET /theses/mine`. Uses `multer` in-memory storage for PDF uploads.
  - Detail & Streaming: `GET /theses/:id`, `GET /theses/:id/versions/:vid/file` (streams the stored PDF file to the browser with correct MIME headers).
  - Review queue: `GET /reviews`, `POST /theses/:id/reviews`, `POST /theses/:id/annotations`.
- **Viva Answer**: *"Mounts all submission, review, annotation, and PDF download endpoints, connecting HTTP requests to our submission and review services."*

#### `backend/routes/library.js` — *Cataloguing & Repository Endpoints*
- **What it does**:
  - Librarian routes: `GET /catalogue/queue`, `GET /catalogue/:id`, `PUT /catalogue/:id`, `POST /catalogue/:id/complete`, `POST /catalogue/:id/publish`, `PUT /catalogue/:id/visibility`.
  - Public repository: `GET /repository/search` (FTS5 search), `GET /repository/facets`.
- **Viva Answer**: *"Provides endpoints for librarians to catalogue approved theses, assign DOIs, configure access visibility, and allows public repository searching."*

#### `backend/routes/admin.js` — *Administration & Reports Endpoints*
- **What it does**:
  - `GET /admin/users`, `POST /admin/users`, `PUT /admin/users/:id`: User management.
  - `PUT /admin/users/:id/guide`: Assigns supervisor to research scholar.
  - `GET /admin/audit`: Accesses the immutable audit log.
  - `GET /admin/settings`, `PUT /admin/settings`: Configures similarity thresholds and institutional domains.
  - `GET /reports`: Institutional research output metrics and CSV download (`GET /reports/export/published.csv`).
- **Viva Answer**: *"Secured endpoints restricted to administrators and management for user provisioning, guide assignments, system settings, and institutional reporting."*

#### `backend/services/workflow.js` — *State Machine & Access Rules*
- **What it does**: Defines `TRANSITIONS` matrix and validates all status changes.
- **Key Code**:
  - Transition map:
    - `Draft` → `Submitted`
    - `Submitted` → `UnderGuideReview`
    - `UnderGuideReview` → `RevisionRequired`, `UnderCommitteeReview`, `Rejected`
    - `RevisionRequired` → `UnderGuideReview`
    - `UnderCommitteeReview` → `Approved`, `Rejected`, `RevisionRequired`
    - `Approved` → `Catalogued`
    - `Catalogued` → `Published`
  - `assertCanView(user, thesis)`: Checks if a user is author, guide, examiner, or librarian before granting access to working records.
- **Viva Answer**: *"Implements the thesis state machine. Any attempt to skip steps or transition illegally throws an `INVALID_TRANSITION` (409 Conflict) error."*

#### `backend/services/submission.js` — *Submission & Versioning Service*
- **What it does**:
  - `submitThesis`: Checks scholar has an assigned guide (`requireScholarWithGuide`), validates PDF magic bytes, checks declaration of originality, executes similarity check, inserts into `theses` and `thesis_versions`, updates FTS5 index, writes audit log, and notifies the supervisor.
  - `saveDraft`: Allows saving incomplete metadata without a PDF or guide.
  - `uploadRevision`: Handles version incrementing (`v2`, `v3`) when a thesis is in `RevisionRequired` status.
- **Viva Answer**: *"Manages thesis creation, draft saving, and revisions. It coordinates PDF validation, plagiarism checks, atomic file writes, and database record insertions inside a single transaction."*

#### `backend/services/review.js` — *Review & Evaluation Service*
- **What it does**:
  - `reviewQueue`: Returns theses pending review for the logged-in supervisor or examiner.
  - `recordReview`: Records feedback and decision (`Approved`, `RevisionRequested`, `Rejected`).
  - Auto-assign examiner (`assignExaminer`): When supervisor approves, it selects an examiner from the same department with the lowest active workload.
  - PDF Annotations (`addAnnotation`, `listAnnotations`, `deleteAnnotation`): Page-anchored sticky notes on PDF submissions.
- **Viva Answer**: *"Handles the two-tier evaluation workflow (Supervisor review and Committee evaluation) and intelligently auto-assigns examiners based on department workload."*

#### `backend/services/catalogue.js` — *Cataloguing & Archival Service*
- **What it does**:
  - `completeCataloguing`: Validates Dewey Decimal Classification (DDC) code and generates unique accession number (`TV-YYYY-####`).
  - `publishToRepository`: Assigns persistent DOI (`10.5555/lnmiit/...`), marks status `Published`, and notifies scholar and guide.
  - `citations`: Generates formatted APA and IEEE academic citations for download.
- **Viva Answer**: *"Handles the library archival workflow—assigning accession numbers, DDC subject codes, DOI handles, visibility settings, and automated citation formatting."*

#### `backend/services/plagiarism.js` — *Similarity Checking Engine*
- **What it does**:
  - `runSimilarity`: Tests submission against configured similarity threshold (default 20%).
  - `mockProvider`: Offline developer adapter utilizing a **6-word shingle algorithm** (extracts overlapping 6-word n-grams against all existing theses in the vault).
  - `httpProvider`: Production adapter sending text to third-party similarity APIs (e.g. Copyleaks).
- **Viva Answer**: *"Our similarity service checks document overlap against existing theses using 6-word shingles. If the score exceeds the institute threshold, submission is blocked with `PLAGIARISM_THRESHOLD_EXCEEDED` (BR-003)."*

#### `backend/services/storage.js` — *Atomic File Storage & PDF Parsing*
- **What it does**:
  - `validatePdf`: Verifies file starts with `%PDF-` magic bytes (NFR-015).
  - `storeFile`: Writes uploaded buffer to `.<name>.part` temporary file and renames it atomically to `v{version}-{uuid}.pdf` (NFR-008).
  - `extractText`: Uses `unpdf` to extract raw text and page count for search indexing.
  - `resolveFile`: Prevents path traversal attacks by ensuring resolved path stays within `uploads/`.
- **Viva Answer**: *"Guarantees storage integrity: validates binary PDF signatures, prevents path traversal, and uses temp-file renaming so interrupted uploads never leave corrupt files on disk."*

#### `backend/services/search.js` — *Repository Search Engine*
- **What it does**:
  - `searchTheses`: Executes full-text search using SQLite `FTS5` with BM25 ranking (`bm25(thesis_fts, 10.0, 4.0, 6.0, 5.0, 1.0)`).
  - Filters by department, degree, author, keywords, and year ranges.
  - Redacts restricted theses for unauthenticated guests.
- **Viva Answer**: *"Powers the public repository using SQLite's FTS5 full-text engine with BM25 relevance ranking over titles, abstracts, keywords, and extracted PDF text."*

#### `backend/services/history.js` — *Audit Logging & Notifications*
- **What it does**:
  - `audit`: Writes immutable records into `audit_log` (user, action, entity, details, IP, timestamp).
  - `recordAndNotify`: Logs status change to `thesis_history` and inserts in-app notification rows for affected users.
- **Viva Answer**: *"Implements enterprise audit trails (NFR-016) and in-app notifications for every state transition in the system."*

#### `backend/services/reports.js` — *Institutional Analytics*
- **What it does**: Aggregates research metrics for institute leaders: total submissions, acceptance/rejection rates, review latency (`avgDaysToPublish`), similarity distribution buckets, and CSV export.
- **Viva Answer**: *"Computes institutional research intelligence queries and generates downloadable CSV reports for accreditation and management."*

#### `backend/services/detail.js` — *Detail View Aggregator*
- **What it does**: Gathers complete thesis history, versions, reviews, annotations, and plagiarism scores, applying role-based field redactions (e.g., hiding examiner identity or restricted PDFs from guests).
- **Viva Answer**: *"Assembles the unified thesis view and applies granular field-level access control so users only see data permitted by their role."*

---

## 💻 2. Frontend Architecture (`frontend/`)

```
frontend/
├── index.html            # Single Page Application HTML document & viewport
├── README.md             # Frontend architectural overview
├── css/
│   └── app.css           # Design system tokens, layout grid, dark/light themes, badges
└── js/
    ├── app.js            # Client-side router, authentication state & layout shell
    ├── api.js            # Fetch wrapper, error translation & unauthorized event
    ├── ui.js             # Reusable UI components (modals, toasts, icons, confirmations)
    └── views/            # Single-page views for each role & capability
        ├── home.js           # Public landing page with showcase, stats & departments
        ├── auth.js           # Login & registration screens + 1-click demo role switcher
        ├── scholar.js        # Scholar submission form, draft management, revision upload
        ├── review.js         # Supervisor & examiner review queues, inline PDF notes, rubrics
        ├── catalogue.js      # Librarian cataloguing interface, DDC classification, DOI publisher
        ├── repository.js     # Public archive search with faceted filters
        ├── thesis.js         # Detailed thesis view, history timeline, versions & citations
        ├── dashboard.js      # Role-specific workspaces
        ├── notifications.js  # Notification center & user account profile
        ├── admin.js          # Admin oversight: users, guide assignment, audit log, settings
        └── reports.js        # Institute analytics: submissions, review latency & charts
```

---

### Detailed File Breakdown — Frontend

#### `frontend/index.html` — *Single Page App Entrypoint*
- **What it does**: Minimal HTML5 container. Preloads Google Fonts (Inter & Source Serif 4), includes `css/app.css`, defines `<div id="app">`, and boots JavaScript via `<script type="module" src="/js/app.js">`.
- **Viva Answer**: *"The sole HTML file of the application. The browser boots our ES module router from here with zero page refreshes."*

#### `frontend/css/app.css` — *Design System & Styling*
- **What it does**: 1,200+ lines of custom CSS using CSS custom properties (`--brand`, `--accent`, `--surface`, `--text`). Includes light/dark theme variables, responsive grid breakpoints, modal dialogs, status badges, timelines, and print stylesheets.
- **Viva Answer**: *"Contains our custom academic design system with CSS custom properties, responsive grid layouts, and automatic dark/light theme switching."*

#### `frontend/js/api.js` — *HTTP Client & Error Handling*
- **What it does**: `api.get()`, `api.post()`, `api.put()`, `api.del()`. Normalizes JSON responses, handles `FormData` for PDF uploads, intercepts 401s to trigger session expiration, and throws structured `ApiError` instances.
- **Viva Answer**: *"A lightweight fetch wrapper that handles JSON serialization, file uploads, error parsing, and session timeout events."*

#### `frontend/js/app.js` — *Client Router & Application Shell*
- **What it does**: Hash-based client router (`#/...`). Matches URL paths with regex, enforces role route guards (`route.roles.includes(state.user.role)`), renders the application sidebar/header shell, and polls for unread notifications.
- **Viva Answer**: *"Manages client-side routing and authorization guards. When navigating, it asynchronously imports only the requested view and renders it into the DOM."*

#### `frontend/js/ui.js` — *Reusable UI Library & Components*
- **What it does**: Safe HTML template tag (`html`), SVG icon dictionary (`icon('vault')`, `icon('check')`), notifications (`toast()`), modal popups (`modal()`), confirm dialogs (`confirmDialog()`), and pagination controls.
- **Viva Answer**: *"Provides our reusable UI primitives—safe template literal rendering, toast messages, confirmation dialogs, and SVG icons."*

#### `frontend/js/views/home.js` — *Academic Showcase & Landing Page*
- **What it does**: Public landing portal showcasing university departments (CSE, ECE, ME, etc.), workflow step cards, live stats counter, demo role selector, and recent publications.
- **Viva Answer**: *"The institutional showcase page welcoming visitors, explaining the thesis lifecycle, and providing quick access to demo roles."*

#### `frontend/js/views/auth.js` — *Authentication Views*
- **What it does**: Login screen with quick one-click role demo buttons (`scholar`, `guide`, `examiner`, `librarian`, `admin`, `dean`) and institutional self-registration form.
- **Viva Answer**: *"Renders the login and registration interfaces, including demo buttons that prefill credentials for viva evaluation."*

#### `frontend/js/views/scholar.js` — *Scholar Workspace*
- **What it does**: Lists scholar's theses, submission form with live validation, PDF drop-zone, declaration checkbox, and the revision upload form with version changelog notes.
- **Viva Answer**: *"The research scholar portal for drafting, uploading PDFs, viewing similarity results, and submitting revised versions."*

#### `frontend/js/views/review.js` — *Reviewer Workspace*
- **What it does**: Dedicated queue for Supervisors and Examiners. Displays submitted PDF, page-anchored annotation tools, structured review rubric, and decision buttons (Approve, Request Revision, Reject).
- **Viva Answer**: *"The evaluation interface where faculty inspect manuscripts, add page-specific sticky notes, and submit formal decisions."*

#### `frontend/js/views/catalogue.js` — *Librarian Cataloguing*
- **What it does**: Cataloguing queue for approved dissertations. Allows librarians to input Dewey Decimal codes, generate accession IDs, configure Public/Restricted visibility, and publish with a DOI.
- **Viva Answer**: *"Provides library staff with metadata cataloguing tools, accession numbering, and repository publishing workflows."*

#### `frontend/js/views/repository.js` — *Public Archive Search*
- **What it does**: Public discovery interface with live keyword search, department and degree filters, year sliders, sort controls, and search result snippets with keyword highlighting.
- **Viva Answer**: *"The public search catalogue enabling researchers to discover published dissertations with full-text filters and highlighted snippets."*

#### `frontend/js/views/thesis.js` — *Thesis Detail & Citations*
- **What it does**: Detailed view showing metadata, version history list, review timeline, embedded PDF viewer, and copy buttons for formatted APA & IEEE citations.
- **Viva Answer**: *"Displays the comprehensive thesis dossier, version history, audit timeline, and citation generators."*

#### `frontend/js/views/dashboard.js` — *Role Dashboards*
- **What it does**: Tailors the home screen based on active user role: scholars see their submission progress; guides see pending reviews; librarians see items awaiting cataloguing.
- **Viva Answer**: *"Adapts the home dashboard to the logged-in user's role, highlighting pending tasks and quick actions."*

#### `frontend/js/views/notifications.js` — *Notifications & Profile*
- **What it does**: Notification feed with mark-as-read capability and user profile details.
- **Viva Answer**: *"Allows users to view in-app alerts when their thesis status changes or when new reviews are submitted."*

#### `frontend/js/views/admin.js` — *Admin Control Center*
- **What it does**: Panels for user account management, guide assignment dropdown, live system audit log viewer, and threshold configuration.
- **Viva Answer**: *"Administrative control panel for creating users, assigning faculty supervisors, auditing system actions, and tuning plagiarism thresholds."*

#### `frontend/js/views/reports.js` — *Research Output Analytics*
- **What it does**: Charts and analytics for institute leaders: submission velocity, review turnaround times, department comparisons, and CSV export.
- **Viva Answer**: *"Renders research intelligence dashboards and enables CSV report exports for academic oversight."*

---

## 🧪 3. Tests & Supporting Files

#### `tests/workflow.test.js` — *Automated Integration Test Suite*
- **What it does**: Runs 13 comprehensive end-to-end integration tests using Node's native test runner (`node:test`). Tests run against an isolated temporary SQLite database created via `fs.mkdtempSync()`.
- **What it verifies**:
  - `FR-001`: Registration requires institutional email (`@lnmiit.ac.in`).
  - `FR-002`: Wrong password rejected.
  - `NFR-003`: Bcrypt password hashing.
  - `BR-006/BR-007`: Role-based access control on admin endpoints.
  - `UC-003`: Submission blocked until guide is assigned.
  - `BR-004`: Missing metadata validation.
  - `NFR-015`: Non-PDF uploads rejected via magic bytes.
  - `Lifecycle`: Full end-to-end lifecycle (Submit → Guide Review → Committee Review → Catalogue → Publish → FTS5 Search).
  - `BR-005`: Revisions create append-only versions; deletion blocked by triggers.
  - `BR-003`: Similarity threshold enforcement.
  - `Restricted Theses`: Metadata and PDF access controls for guests.
  - `NFR-016`: Append-only audit logging.
- **Viva Answer**: *"We have 13 automated integration tests covering all functional requirements, security rules, and business constraints running against a throwaway test database."*

#### `.env.example` — *Environment Variable Documentation*
- Documents all configurable server parameters (`PORT`, `JWT_SECRET`, `DATA_DIR`, `PLAGIARISM_API_KEY`, `DOI_PREFIX`).

#### `samples/` — *Test Submission Artifacts*
- `original-thesis.pdf`: Clean sample document that passes similarity checks.
- `plagiarised-thesis.pdf`: Sample document containing copied text that triggers rejection with ~97% similarity.

---

## 🏆 Top 5 Tough Viva Questions & Winning Answers

### Q1: "How do you prevent a malicious student from uploading an executable renamed as `.pdf`?"
> **Answer**: *"We do not rely on the file extension. In `backend/services/storage.js` inside `validatePdf()`, we inspect the file buffer's first 5 bytes for the `%PDF-` binary magic signature (NFR-015). If the header is missing, the upload is rejected immediately before reaching the disk."*

### Q2: "What happens if the server crashes in the middle of a multi-step thesis submission?"
> **Answer**: *"We guarantee ACID atomicity in two ways: First, all database operations (theses, versions, similarity checks, audit log, notifications) run inside our `tx()` transaction helper in `backend/db/database.js` using `BEGIN IMMEDIATE` and `COMMIT/ROLLBACK`. Second, file storage in `backend/services/storage.js` writes to a temporary file (`.part`) and renames it atomically via `fs.renameSync()`. If any step fails, the file is unlinked and the database transaction rolls back cleanly."*

### Q3: "Can a student delete or overwrite an old version of their thesis?"
> **Answer**: *"No. In `backend/db/schema.sql`, we implemented native SQLite database triggers `versions_no_delete` and `versions_no_overwrite`. Any `DELETE` or `UPDATE` query on `thesis_versions` causes SQLite to abort with `RAISE(ABORT)`. New drafts always create a new version record (`v2`, `v3`) with append-only integrity (BR-005)."*

### Q4: "How does the search engine find words inside the actual PDF document?"
> **Answer**: *"When a PDF is uploaded, `backend/services/storage.js` uses `unpdf` to extract the full text. This text is indexed into SQLite's `FTS5` virtual table `thesis_fts` with Porter stemming. In `backend/services/search.js`, queries match against `thesis_fts` using BM25 relevance ranking, weighting the title (10x), keywords (6x), author (5x), and PDF body (1x)."*

### Q5: "How do you protect authentication tokens from being stolen by XSS attacks?"
> **Answer**: *"Instead of storing JWTs in browser `localStorage` where malicious scripts could read them, `backend/middleware/auth.js` issues tokens inside an `httpOnly`, `SameSite=Strict` cookie. The browser automatically sends it with requests, but JavaScript cannot read or access the token."*
