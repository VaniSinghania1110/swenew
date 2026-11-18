import { api, qs } from '../api.js';
import { html, raw, icon, $, $$, toast, busy, initials } from '../ui.js';
import { state, setUser, go } from '../app.js';

const DEMO_ROLES = [
  { role: 'Scholar', email: 'scholar@lnmiit.ac.in', name: 'Aarav Sharma', icon: 'upload', badge: 'Submit & Track', desc: 'Submit dissertation drafts, review similarity reports, manage revisions, and track committee status.' },
  { role: 'Supervisor / Guide', email: 'guide@lnmiit.ac.in', name: 'Dr. Rajesh Verma', icon: 'file', badge: 'Review & Guide', desc: 'Critique scholar submissions, check plagiarism scores, provide inline notes, and approve for defense.' },
  { role: 'Examiner', email: 'examiner@lnmiit.ac.in', name: 'Prof. Sunita Rao', icon: 'award', badge: 'Evaluation', desc: 'Conduct blind evaluations, submit detailed evaluation rubrics, scorecards, and viva recommendations.' },
  { role: 'Librarian', email: 'librarian@lnmiit.ac.in', name: 'Kavita Sen', icon: 'book', badge: 'Catalogue & Archive', desc: 'Assign university accession numbers, classify Dublin Core metadata, configure embargoes, and archive.' },
  { role: 'Administrator', email: 'admin@lnmiit.ac.in', name: 'Admin User', icon: 'settings', badge: 'System Oversight', desc: 'Manage user accounts, assign faculty guides, configure plagiarism limits, and monitor audit trails.' },
  { role: 'Dean / Institute', email: 'dean.research@lnmiit.ac.in', name: 'Dean Research', icon: 'chart', badge: 'Analytics', desc: 'Access high-level institutional metrics, departmental research trends, and publication statistics.' },
];

const DEPARTMENTS_DATA = [
  { id: 1, code: 'CSE', name: 'Computer Science and Engineering', degrees: ['PhD', 'M.Tech', 'B.Tech'], icon: 'chart', desc: 'AI, Post-Quantum Cryptography, Distributed Systems, Cloud Computing' },
  { id: 2, code: 'ECE', name: 'Electronics and Communication Engineering', degrees: ['PhD', 'M.Tech', 'B.Tech'], icon: 'shield', desc: 'VLSI Design, Embedded Systems, Signal Processing, IoT Systems' },
  { id: 3, code: 'CCE', name: 'Communication and Computer Engineering', degrees: ['PhD', 'M.Tech', 'B.Tech'], icon: 'globe', desc: '5G Networks, Cyber-Physical Systems, Information Theory' },
  { id: 4, code: 'ME', name: 'Mechanical-Mechatronics Engineering', degrees: ['PhD', 'M.Tech', 'B.Tech'], icon: 'settings', desc: 'Robotics, Thermal Engineering, Additive Manufacturing, Smart Materials' },
  { id: 5, code: 'PHY', name: 'Physics', degrees: ['PhD', 'M.Sc'], icon: 'sparkle', desc: 'Condensed Matter Physics, Nanotechnology, Quantum Information' },
  { id: 6, code: 'MATH', name: 'Mathematics', degrees: ['PhD', 'M.Sc'], icon: 'list', desc: 'Applied Mathematics, Cryptanalysis, Numerical Optimization' },
  { id: 7, code: 'HSS', name: 'Humanities and Social Sciences', degrees: ['PhD'], icon: 'book', desc: 'Science Policy, Technology Ethics, Linguistics, Economics' },
];

const isDark = () => {
  const t = document.documentElement.dataset.theme;
  return t ? t === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
};

export async function homePage(root) {
  if (!state.meta?.departments?.length) {
    try { state.meta = await api.get('/meta'); } catch { /* ignore */ }
  }

  const u = state.user;
  const instituteName = state.meta?.institute || 'The LNM Institute of Information Technology, Jaipur';
  const degrees = state.meta?.degrees || ['PhD', 'M.Tech', 'M.Sc', 'MS (Research)', 'B.Tech'];

  root.innerHTML = String(html`
    <div class="home-wrapper">
      <!-- TOP NAVIGATION BAR (Header with prominent Sign In button) -->
      <header class="home-nav" role="banner">
        <div class="home-nav-container">
          <a class="home-brand" href="#/home">
            <span class="home-brand-mark">${icon('vault')}</span>
            <div class="home-brand-text">
              <span class="home-brand-name">Thesis Vault</span>
              <span class="home-brand-sub">${state.meta?.domain ? 'LNMIIT Jaipur' : 'Academic Archive'}</span>
            </div>
          </a>

          <nav class="home-nav-menu" aria-label="Portal Navigation">
            <a href="#/repository" class="home-nav-link">${icon('search')} Repository</a>
            <a href="#workflow" class="home-nav-link">${icon('history')} Workflow</a>
            <a href="#departments" class="home-nav-link">${icon('cap')} Departments</a>
            <a href="#featured" class="home-nav-link">${icon('book')} Featured</a>
            <a href="#roles" class="home-nav-link">${icon('users')} Roles & Demo</a>
          </nav>

          <div class="home-nav-actions">
            <button class="icon-btn" data-theme-toggle aria-label="Toggle dark mode" title="Toggle dark mode">
              ${icon(isDark() ? 'sun' : 'moon')}
            </button>

            ${u ? html`
              <a class="user-chip" href="#/account" title="Account profile">
                <span class="avatar">${initials(u.name)}</span>
                <span class="who"><b>${u.name}</b><span>${u.roleLabel}</span></span>
              </a>
              <a class="btn primary" href="#/dashboard">${icon('home')} Dashboard</a>
              <button class="icon-btn" data-home-logout aria-label="Sign out" title="Sign out">${icon('logout')}</button>
            ` : html`
              <a class="btn ghost home-register-btn" href="#/register">Register</a>
              <a class="btn primary home-signin-top-btn" href="#/login" id="top-signin-btn">
                ${icon('vault')} <span>Sign in</span>
              </a>
            `}
          </div>
        </div>
      </header>

      <!-- HERO SECTION -->
      <section class="home-hero">
        <div class="home-hero-glow"></div>
        <div class="home-hero-content">
          <div class="home-pill">
            ${icon('sparkle')}
            <span>Official Institutional Repository & Dissertation Vault</span>
          </div>

          <h1 class="home-hero-title">
            Preserving, Reviewing & Showcasing <span class="gradient-text">Academic Excellence</span>
          </h1>

          <p class="home-hero-sub">
            The unified digital thesis ecosystem for ${instituteName}.
            Supporting scholars, faculty supervisors, examiners, and librarians through every phase —
            from draft submission and automated plagiarism checking to defense approval and permanent open archival.
          </p>

          <!-- HERO SEARCH BOX -->
          <form class="home-hero-search-card" data-hero-search role="search">
            <div class="search-input-group">
              ${icon('search', 'search-icon')}
              <input
                id="hero-search-query"
                name="q"
                type="text"
                placeholder="Search published dissertations, authors, guides, keywords or topics…"
                autocomplete="off"
              >
            </div>
            <div class="search-select-group">
              <label class="sr-only" for="hero-degree-select">Filter by Degree</label>
              <select id="hero-degree-select" name="degree">
                <option value="">All Degrees</option>
                ${degrees.map(d => html`<option value="${d}">${d}</option>`)}
              </select>
            </div>
            <button type="submit" class="btn primary home-search-btn">
              ${icon('search')} <span>Search Vault</span>
            </button>
          </form>

          <div class="home-search-tags">
            <span class="tags-label">Popular Topics:</span>
            <button type="button" class="topic-tag" data-tag="Quantum">Quantum Cryptography</button>
            <button type="button" class="topic-tag" data-tag="IoT">Healthcare IoT</button>
            <button type="button" class="topic-tag" data-tag="Machine Learning">Machine Learning</button>
            <button type="button" class="topic-tag" data-tag="5G">5G Networks</button>
            <button type="button" class="topic-tag" data-tag="Mechatronics">Mechatronics</button>
          </div>

          <!-- HERO CTA BUTTONS -->
          <div class="home-hero-cta">
            ${u ? html`
              <a class="btn primary btn-hero-lg" href="#/dashboard">
                ${icon('home')} Go to Dashboard ${icon('arrowRight')}
              </a>
              <a class="btn btn-hero-lg" href="#/repository">
                ${icon('search')} Browse Repository
              </a>
            ` : html`
              <a class="btn primary btn-hero-lg" href="#/login">
                ${icon('vault')} Sign in to Vault ${icon('arrowRight')}
              </a>
              <a class="btn btn-hero-lg" href="#/repository">
                ${icon('search')} Browse Published Theses
              </a>
              <button type="button" class="btn btn-hero-lg accent" data-scroll-to="roles">
                ${icon('users')} Test Demo Roles
              </button>
            `}
          </div>

          <!-- TRUST BADGES -->
          <div class="home-trust-badges">
            <div class="trust-badge-item">${icon('check')} <span>100% Similarity Checked</span></div>
            <div class="trust-badge-item">${icon('shield')} <span>Multi-Stage Faculty Review</span></div>
            <div class="trust-badge-item">${icon('lock')} <span>Granular Embargo Control</span></div>
            <div class="trust-badge-item">${icon('book')} <span>Dublin Core Compliant</span></div>
          </div>
        </div>
      </section>

      <!-- INSTITUTIONAL METRICS -->
      <section class="home-section stats-section" id="stats">
        <div class="home-container">
          <div class="home-stats-grid">
            <div class="home-stat-card">
              <div class="stat-icon-wrap">${icon('book')}</div>
              <div class="stat-metric" data-metric-total>1,200+</div>
              <div class="stat-title">Catalogued Theses</div>
              <div class="stat-desc">Doctoral dissertations, master's theses & undergraduate honors projects</div>
            </div>
            <div class="home-stat-card">
              <div class="stat-icon-wrap">${icon('cap')}</div>
              <div class="stat-metric">7</div>
              <div class="stat-title">Academic Departments</div>
              <div class="stat-desc">Engineering, Physics, Mathematics, and Humanities research centers</div>
            </div>
            <div class="home-stat-card">
              <div class="stat-icon-wrap">${icon('shield')}</div>
              <div class="stat-metric">&le; 20%</div>
              <div class="stat-title">Similarity Threshold</div>
              <div class="stat-desc">Strict automated plagiarism prevention before supervisor endorsement</div>
            </div>
            <div class="home-stat-card">
              <div class="stat-icon-wrap">${icon('history')}</div>
              <div class="stat-metric">4-Stage</div>
              <div class="stat-title">Milestone Lifecycle</div>
              <div class="stat-desc">Submission, Guide Review, Committee Evaluation & Library Archival</div>
            </div>
          </div>
        </div>
      </section>

      <!-- LIFECYCLE WORKFLOW SECTION -->
      <section class="home-section" id="workflow">
        <div class="home-container">
          <div class="section-head text-center">
            <div class="section-tag">${icon('history')} Scholarly Journey</div>
            <h2 class="section-title">End-to-End Dissertation Lifecycle</h2>
            <p class="section-sub">A transparent, auditable digital workflow designed in accordance with university academic ordinances.</p>
          </div>

          <div class="workflow-steps-grid">
            <div class="workflow-step-card">
              <div class="step-num">01</div>
              <div class="step-icon">${icon('upload')}</div>
              <h3>Scholar Submission</h3>
              <p>Scholars fill structured Dublin Core metadata, input detailed abstracts, and upload chapterwise PDF manuscripts with SHA-256 integrity fingerprinting.</p>
              <div class="step-foot">${icon('check')} Automated PDF validation & hashing</div>
            </div>

            <div class="workflow-step-card">
              <div class="step-num">02</div>
              <div class="step-icon">${icon('shield')}</div>
              <h3>Similarity Screening</h3>
              <p>Built-in NLP similarity engine automatically scans the document against the institute's repository corpus. Reports above 20% require revision before review.</p>
              <div class="step-foot">${icon('check')} Anti-plagiarism verification report</div>
            </div>

            <div class="workflow-step-card">
              <div class="step-num">03</div>
              <div class="step-icon">${icon('users')}</div>
              <h3>Guide & Committee Review</h3>
              <p>Supervisors provide feedback and revisions. Upon guide endorsement, external examiners perform blind evaluation with standardized evaluation rubrics.</p>
              <div class="step-foot">${icon('check')} Full version history & audit log</div>
            </div>

            <div class="workflow-step-card">
              <div class="step-num">04</div>
              <div class="step-icon">${icon('book')}</div>
              <h3>Cataloguing & Archival</h3>
              <p>The institute librarian assigns permanent accession numbers (e.g. LNMIIT/TH/2026/001), applies embargo rules, and publishes to the searchable repository.</p>
              <div class="step-foot">${icon('check')} Full-text FTS5 search indexing</div>
            </div>
          </div>
        </div>
      </section>

      <!-- ACADEMIC DEPARTMENTS -->
      <section class="home-section alt-bg" id="departments">
        <div class="home-container">
          <div class="section-head text-center">
            <div class="section-tag">${icon('cap')} Disciplines & Faculties</div>
            <h2 class="section-title">Explore Research by Department</h2>
            <p class="section-sub">Discover innovative dissertations and publications across engineering, fundamental sciences, and humanities.</p>
          </div>

          <div class="departments-grid">
            ${DEPARTMENTS_DATA.map(dept => html`
              <article class="dept-card" data-dept-id="${dept.id}">
                <div class="dept-head">
                  <span class="dept-code">${dept.code}</span>
                  <div class="dept-degrees">${dept.degrees.map(d => html`<span class="badge plain">${d}</span>`)}</div>
                </div>
                <h3>${dept.name}</h3>
                <p class="dept-desc">${dept.desc}</p>
                <a href="#/repository?department=${dept.id}" class="dept-link">
                  <span>Browse ${dept.code} Theses</span>
                  ${icon('arrowRight')}
                </a>
              </article>
            `)}
          </div>
        </div>
      </section>

      <!-- FEATURED PUBLICATIONS (Dynamic from DB) -->
      <section class="home-section" id="featured">
        <div class="home-container">
          <div class="section-head flex-between">
            <div>
              <div class="section-tag">${icon('award')} Research Highlights</div>
              <h2 class="section-title">Recent Publications in the Vault</h2>
              <p class="section-sub">Peer-reviewed doctoral and master's research recently archived and open for discovery.</p>
            </div>
            <a href="#/repository" class="btn">View All Theses ${icon('arrowRight')}</a>
          </div>

          <div class="featured-theses-grid" data-featured-container>
            <div class="loading"></div>
          </div>
        </div>
      </section>

      <!-- STAKEHOLDER ROLES & INTERACTIVE DEMO LOGIN -->
      <section class="home-section alt-bg" id="roles">
        <div class="home-container">
          <div class="section-head text-center">
            <div class="section-tag">${icon('users')} Stakeholder Portals</div>
            <h2 class="section-title">Tailored Workspaces for Every Academic Role</h2>
            <p class="section-sub">Experience Thesis Vault from any perspective. Click <b>"Quick Test Login"</b> below to explore any role immediately.</p>
          </div>

          <div class="roles-grid">
            ${DEMO_ROLES.map(r => html`
              <div class="role-card">
                <div class="role-card-top">
                  <div class="role-icon-box">${icon(r.icon)}</div>
                  <span class="badge plain role-badge">${r.badge}</span>
                </div>
                <h3>${r.role}</h3>
                <div class="role-user-name">${r.name}</div>
                <p class="role-desc">${r.desc}</p>
                <div class="role-actions">
                  <button type="button" class="btn small primary role-demo-btn" data-demo-email="${r.email}">
                    ${icon('vault')} <span>Quick Test as ${r.role.split(' ')[0]}</span>
                  </button>
                </div>
              </div>
            `)}
          </div>
        </div>
      </section>

      <!-- GOVERNANCE, COMPLIANCE & SECURITY -->
      <section class="home-section" id="features">
        <div class="home-container">
          <div class="section-head text-center">
            <div class="section-tag">${icon('shield')} Institutional Integrity</div>
            <h2 class="section-title">Built for Rigorous Academic Compliance</h2>
            <p class="section-sub">Engineered with high standards of institutional governance, cryptographic auditing, and data confidentiality.</p>
          </div>

          <div class="security-features-grid">
            <div class="sec-feat-card">
              <div class="sec-feat-icon">${icon('shield')}</div>
              <h4>Cryptographic Audit Trail</h4>
              <p>Every milestone event, manuscript submission, evaluation verdict, and grade is registered in an immutable append-only ledger for archival proof.</p>
            </div>
            <div class="sec-feat-card">
              <div class="sec-feat-icon">${icon('lock')}</div>
              <h4>Embargo & IP Protection</h4>
              <p>Granular visibility options (Public, Restricted, Embargoed) safeguard proprietary data, patent filings, and sponsor agreements.</p>
            </div>
            <div class="sec-feat-card">
              <div class="sec-feat-icon">${icon('search')}</div>
              <h4>Full-Text FTS5 Search</h4>
              <p>High-performance SQLite FTS5 search enables researchers across the globe to query thesis titles, abstracts, authors, and full manuscript content.</p>
            </div>
            <div class="sec-feat-card">
              <div class="sec-feat-icon">${icon('book')}</div>
              <h4>Shodhganga & INFLIBNET Standard</h4>
              <p>Standardized metadata formats enable seamless compliance with National Institutional Ranking Framework (NIRF) and academic repository networks.</p>
            </div>
          </div>
        </div>
      </section>

      <!-- CALL TO ACTION BANNER -->
      <section class="home-cta-banner">
        <div class="home-container">
          <div class="cta-inner-card">
            <div class="cta-text">
              <h2>Ready to access the LNMIIT Thesis Vault?</h2>
              <p>Sign in with your institutional credentials or create a research scholar profile to submit your dissertation.</p>
            </div>
            <div class="cta-btns">
              ${u ? html`
                <a class="btn primary btn-hero-lg" href="#/dashboard">${icon('home')} Go to Dashboard</a>
              ` : html`
                <a class="btn primary btn-hero-lg" href="#/login">${icon('vault')} Sign in to Vault</a>
                <a class="btn ghost btn-hero-lg" href="#/register">Create Scholar Account</a>
              `}
            </div>
          </div>
        </div>
      </section>

      <!-- ACADEMIC FOOTER -->
      <footer class="home-footer" role="contentinfo">
        <div class="home-container">
          <div class="footer-grid">
            <div class="footer-brand-col">
              <div class="home-brand">
                <span class="home-brand-mark">${icon('vault')}</span>
                <span class="home-brand-name">Thesis Vault</span>
              </div>
              <p class="footer-subtext">
                Centralized Digital Thesis Archive and Dissertation Management System.
                An official scholarly initiative of ${instituteName}.
              </p>
              <div class="footer-meta-pill">
                ${icon('shield')} Academic Ordinance Compliant
              </div>
            </div>

            <div class="footer-col">
              <h5>Repository</h5>
              <ul>
                <li><a href="#/repository">Browse Archive</a></li>
                <li><a href="#/repository?sort=newest">Latest Theses</a></li>
                <li><a href="#departments">Departments</a></li>
                <li><a href="#/repository?degree=PhD">Doctoral Dissertations</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h5>Workspaces</h5>
              <ul>
                <li><a href="#/login">Institutional Sign In</a></li>
                <li><a href="#/register">Scholar Registration</a></li>
                <li><a href="#workflow">Review Lifecycle</a></li>
                <li><a href="#roles">Stakeholder Roles</a></li>
              </ul>
            </div>

            <div class="footer-col">
              <h5>Institutional</h5>
              <ul>
                <li><a href="https://lnmiit.ac.in" target="_blank" rel="noopener">LNMIIT Jaipur</a></li>
                <li><a href="#/admin/audit">System Audit Log</a></li>
                <li><a href="#features">Security & Standards</a></li>
                <li><a href="mailto:library@lnmiit.ac.in">Library Desk</a></li>
              </ul>
            </div>
          </div>

          <div class="footer-bottom">
            <div>&copy; ${new Date().getFullYear()} ${instituteName}. All rights reserved.</div>
            <div class="footer-bottom-links">
              <a href="#workflow">Workflow</a>
              <span>&bull;</span>
              <a href="#/repository">Repository</a>
              <span>&bull;</span>
              <a href="#/login">Portal Sign In</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  `);

  // ---- Event Handlers ----

  // Theme Toggle Button
  const themeToggle = $('[data-theme-toggle]', root);
  themeToggle?.addEventListener('click', () => {
    const dark = !isDark();
    document.documentElement.dataset.theme = dark ? 'dark' : 'light';
    try { localStorage.setItem('tv-theme', dark ? 'dark' : 'light'); } catch { /* ignore */ }
    themeToggle.innerHTML = String(icon(dark ? 'sun' : 'moon'));
  });

  // Logout Button (if logged in)
  $('[data-home-logout]', root)?.addEventListener('click', async () => {
    try {
      await api.post('/auth/logout');
      state.user = null;
      toast('You have been signed out.');
      homePage(root);
    } catch (err) {
      toast(err.message, 'bad');
    }
  });

  // Hero Search Form
  const searchForm = $('[data-hero-search]', root);
  searchForm?.addEventListener('submit', e => {
    e.preventDefault();
    const q = (searchForm.q.value || '').trim();
    const degree = searchForm.degree.value;
    const params = {};
    if (q) params.q = q;
    if (degree) params.degree = degree;
    go(`/repository${qs(params)}`);
  });

  // Topic Tags
  $$('.topic-tag', root).forEach(tagBtn => {
    tagBtn.addEventListener('click', () => {
      const tag = tagBtn.dataset.tag;
      go(`/repository?q=${encodeURIComponent(tag)}`);
    });
  });

  // Scroll to section button
  $('[data-scroll-to="roles"]', root)?.addEventListener('click', () => {
    const el = document.getElementById('roles');
    el?.scrollIntoView({ behavior: 'smooth' });
  });

  // Quick Demo Login Buttons
  $$('[data-demo-email]', root).forEach(btn => {
    btn.addEventListener('click', async () => {
      const email = btn.dataset.demoEmail;
      try {
        const { user } = await busy(btn, () => api.post('/auth/login', { email, password: 'Password@123' }));
        await setUser(user);
        toast(`Signed in as ${user.name} (${user.roleLabel})`, 'ok');
        go('/dashboard');
      } catch (err) {
        toast(err.message, 'bad');
      }
    });
  });

  // Fetch real featured theses and stats from API
  loadLiveContent(root);
}

async function loadLiveContent(root) {
  try {
    const data = await api.get('/repository/search?page=1');
    const totalEl = $('[data-metric-total]', root);
    if (totalEl && data.total != null) {
      totalEl.textContent = `${data.total} Available`;
    }

    const container = $('[data-featured-container]', root);
    if (!container) return;

    if (!data.results || !data.results.length) {
      container.innerHTML = `<div class="empty">${icon('book')}<h3>No published theses yet</h3><p>Published dissertations will appear here.</p></div>`;
      return;
    }

    const items = data.results.slice(0, 3);
    container.innerHTML = String(html`
      ${items.map(r => html`
        <article class="featured-card">
          <div class="featured-card-top">
            <span class="badge plain">${r.degree}</span>
            <span class="badge plain dept-pill">${r.department || 'LNMIIT'}</span>
            <span class="featured-year">${r.year}</span>
          </div>

          <h3 class="featured-title">
            <a href="#/thesis/${r.id}">${r.title}</a>
          </h3>

          <div class="featured-meta">
            <span><b>Author:</b> ${r.author_name}</span>
            ${r.guide_name ? html`<span> &bull; <b>Supervisor:</b> ${r.guide_name}</span>` : ''}
          </div>

          <p class="featured-abstract">
            ${r.abstract && r.abstract.length > 220 ? r.abstract.slice(0, 220) + '…' : (r.abstract || 'Archived research thesis.')}
          </p>

          <div class="featured-card-foot">
            <span class="accession-tag mono">${r.accession_no || 'ARCHIVED'}</span>
            <div class="featured-links">
              ${r.canDownload && r.version_id ? html`
                <a class="btn small" href="/api/theses/${r.id}/versions/${r.version_id}/file" target="_blank" rel="noopener">
                  ${icon('eye')} PDF
                </a>
              ` : ''}
              <a class="btn small primary" href="#/thesis/${r.id}">
                Details ${icon('arrowRight')}
              </a>
            </div>
          </div>
        </article>
      `)}
    `);
  } catch (err) {
    const container = $('[data-featured-container]', root);
    if (container) {
      container.innerHTML = `<div class="alert info">${icon('info')}<span>Browse published dissertations in the <a href="#/repository">Repository</a>.</span></div>`;
    }
  }
}
