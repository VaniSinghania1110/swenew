# Thesis Vault - Frontend

The frontend is a fast, dependency-free Single Page Application (SPA) written in modern vanilla JavaScript (ES Modules) and responsive CSS3. It requires **no build step, no bundler, and no external framework**.

## Structure

```
frontend/
├── index.html            # Application entrypoint and HTML shell
├── css/
│   └── app.css           # Complete styling system, CSS custom properties & themes (light/dark)
└── js/
    ├── app.js            # Client-side router, authentication state & layout shell
    ├── api.js            # REST API client wrapper with standardized error handling
    ├── ui.js             # Reusable UI components (modals, toasts, alerts, icons, badges)
    └── views/            # Screen views corresponding to each user role and feature
        ├── home.js           # Public landing and institute showcase page
        ├── auth.js           # Login, registration and one-click role demo switcher
        ├── scholar.js        # Scholar dashboard, thesis drafting, PDF submission, revisions
        ├── review.js         # Supervisor & examiner queues, PDF review, annotations, decisions
        ├── catalogue.js      # Librarian queue, metadata cataloguing, DOI and publishing
        ├── repository.js     # Public archive search with filters (department, degree, year)
        ├── thesis.js         # Detailed thesis view, history timeline, versions and citations
        ├── dashboard.js      # Role-tailored workspace dashboard
        ├── notifications.js  # User notifications center and account profile
        ├── admin.js          # Admin management: users, guides, audit logs, system settings
        └── reports.js        # Institute analytics: submissions, review latency, research charts
```

## Key Architectural Principles

1. **Zero Build Step**: Native browser ES Modules (`import`/`export`) load files directly.
2. **Client-side Routing**: Hash-based routing (`#/repository`, `#/dashboard`, `#/theses`, etc.) with role-based route protection.
3. **Reactive UI Components**: Lightweight template literals render safe HTML fragments with helper functions (`html`, `raw`, `icon`).
4. **Theme Support**: Seamless switching between light and dark mode respecting system preferences.
5. **Backend Integration**: Communicates via standard JSON REST endpoints rooted at `/api/*`.
