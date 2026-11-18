// Plagiarism Check Service (FR-021..FR-024, BR-003, Lab 7 ISimilarityService.checkDocument)
//
// The SRS puts an in-house plagiarism engine out of scope, so this module is an adapter around a
// third-party similarity service. Two providers are available:
//   - "http": POSTs the document text to PLAGIARISM_API_URL and expects { similarityScore, matches? }.
//   - "mock": a development stand-in used while no institutional licence is available. It estimates
//             overlap against theses already held in Thesis Vault using 6-word shingles.
import { config } from '../config.js';
import { all, insert, getSetting } from '../db/database.js';
import { fail } from '../errors.js';

export const threshold = () => Number(getSetting('plagiarism_threshold') || 20);

const shingles = (text, n = 6) => {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(Boolean);
  const set = new Set();
  for (let i = 0; i + n <= words.length; i++) set.add(words.slice(i, i + n).join(' '));
  return set;
};

async function mockProvider(text, excludeThesisId) {
  const doc = shingles(text);
  if (doc.size === 0) return { similarityScore: 0, matches: [], note: 'No extractable text; manual check recommended.' };
  // Compare against the latest version of every other thesis.
  const sources = all(`
    SELECT t.id, t.title, u.name AS author, v.full_text
      FROM theses t
      JOIN users u ON u.id = t.author_id
      JOIN thesis_versions v ON v.id = t.current_version_id
     WHERE t.id <> ? AND v.full_text <> ''`, excludeThesisId ?? -1);
  const covered = new Set();
  const matches = [];
  for (const s of sources) {
    const src = shingles(s.full_text);
    let hit = 0;
    for (const sh of doc) if (src.has(sh)) { hit++; covered.add(sh); }
    if (hit) matches.push({ thesisId: s.id, title: s.title, author: s.author, percent: +(hit / doc.size * 100).toFixed(1) });
  }
  matches.sort((a, b) => b.percent - a.percent);
  return { similarityScore: +(covered.size / doc.size * 100).toFixed(1), matches: matches.slice(0, 5) };
}

async function httpProvider(text, excludeThesisId, versionRef) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), config.plagiarism.timeoutMs);
  try {
    const res = await fetch(config.plagiarism.apiUrl, {
      method: 'POST',
      signal: ctrl.signal,
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${config.plagiarism.apiKey}` },
      body: JSON.stringify({ documentId: versionRef, text }),
    });
    if (!res.ok) fail('SERVICE_UNAVAILABLE', 'The similarity-check service is unavailable. Please try again later.', 503);
    const body = await res.json();
    return { similarityScore: Number(body.similarityScore), matches: body.matches || [] };
  } catch (err) {
    if (err.name === 'AbortError') fail('TIMEOUT', 'The similarity-check service did not respond in time. Please try again.', 504);
    if (err.code) throw err;
    fail('SERVICE_UNAVAILABLE', 'The similarity-check service is unavailable. Please try again later.', 503);
  } finally {
    clearTimeout(timer);
  }
}

let copyleaksAuth = null;

export async function testCopyleaksConnection({ email, key } = {}) {
  const checkEmail = email || getSetting('copyleaks_email') || config.plagiarism.email || process.env.COPYLEAKS_EMAIL;
  const checkKey = key || getSetting('copyleaks_api_key') || config.plagiarism.apiKey || 'ea2d3061-c76d-4fea-9f62-e91bab1c46ba';
  if (!checkEmail) {
    return { ok: false, message: 'Copyleaks account email is required along with your API key.' };
  }
  try {
    const res = await fetch('https://id.copyleaks.com/v3/account/login/api', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: checkEmail, key: checkKey }),
    });
    if (!res.ok) {
      const body = await res.json().catch(() => ({}));
      return { ok: false, status: res.status, message: body.message || 'Authentication failed.' };
    }
    const data = await res.json();
    const expiresAt = data['.expires'] ? new Date(data['.expires']).getTime() : Date.now() + 47 * 3600 * 1000;
    copyleaksAuth = { token: data.access_token, expiresAt, email: checkEmail, key: checkKey };
    return { ok: true, message: 'Successfully authenticated with Copyleaks API!', expires: data['.expires'] };
  } catch (err) {
    return { ok: false, message: err.message };
  }
}

async function getCopyleaksToken() {
  const email = getSetting('copyleaks_email') || config.plagiarism.email || process.env.COPYLEAKS_EMAIL;
  const key = getSetting('copyleaks_api_key') || config.plagiarism.apiKey || 'ea2d3061-c76d-4fea-9f62-e91bab1c46ba';
  if (!email) return null;
  if (copyleaksAuth && copyleaksAuth.token && copyleaksAuth.expiresAt > Date.now() + 60000 && copyleaksAuth.email === email && copyleaksAuth.key === key) {
    return copyleaksAuth.token;
  }
  const test = await testCopyleaksConnection({ email, key });
  return test.ok ? copyleaksAuth.token : null;
}

async function copyleaksProvider(text, excludeThesisId, versionRef) {
  const mockRes = await mockProvider(text, excludeThesisId);
  const token = await getCopyleaksToken();
  if (!token) {
    return {
      ...mockRes,
      tool: 'Copyleaks AI & Plagiarism API (Corpus evaluation; awaiting account email)',
      note: 'Copyleaks API key configured. Provide Copyleaks account email in Settings for live cloud checks.',
    };
  }

  try {
    const scanId = (versionRef ? 'tv-' + versionRef : 'tv-scan-' + Date.now()).replace(/[^a-zA-Z0-9_-]/g, '_');
    const isSandbox = (getSetting('copyleaks_sandbox') ?? String(config.plagiarism.sandbox)) === 'true';
    const textToScan = text.length > 50000 ? text.slice(0, 50000) : text;

    const res = await fetch(`https://api.copyleaks.com/v2/writer-detector/${scanId}/check`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        text: textToScan,
        sandbox: isSandbox,
        explain: true,
      }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      console.warn('Copyleaks check error:', res.status, errText);
      return {
        ...mockRes,
        tool: 'Copyleaks AI & Plagiarism API (Corpus fallback)',
        note: `Copyleaks API status: ${res.status}. Evaluated against repository corpus.`,
      };
    }

    const data = await res.json();
    const aiProb = data.summary?.ai ?? (data.results?.[0]?.probability ?? 0);
    const copyleaksScore = +(aiProb * 100).toFixed(1);
    const combinedScore = Math.max(copyleaksScore, mockRes.similarityScore);

    return {
      similarityScore: combinedScore,
      copyleaksScore,
      matches: [
        ...(copyleaksScore > 0 ? [{ title: `Copyleaks AI/Pattern Detection (${copyleaksScore}%)`, author: 'Copyleaks Engine', percent: copyleaksScore }] : []),
        ...(mockRes.matches || []),
      ],
      details: data.results || null,
      tool: 'Copyleaks AI & Plagiarism API',
    };
  } catch (err) {
    console.warn('Copyleaks request failed:', err.message);
    return {
      ...mockRes,
      tool: 'Copyleaks (Corpus fallback)',
      note: `Copyleaks check failed (${err.message}); evaluated against repository corpus.`,
    };
  }
}

export const toolName = () => {
  const p = getSetting('plagiarism_provider') || config.plagiarism.provider;
  if (p === 'copyleaks') return 'Copyleaks AI & Plagiarism API';
  if (p === 'http') return 'External similarity API';
  return 'Thesis Vault similarity stub (dev)';
};

// Runs the check without persisting anything, so a brand-new flagged submission leaves no thesis behind (Lab 7 §4.1 step 4).
export async function runSimilarity(text, { excludeThesisId, versionRef } = {}) {
  const p = getSetting('plagiarism_provider') || config.plagiarism.provider;
  let result;
  if (p === 'copyleaks') {
    result = await copyleaksProvider(text, excludeThesisId, versionRef);
  } else if (p === 'http') {
    result = await httpProvider(text, excludeThesisId, versionRef);
  } else {
    result = await mockProvider(text, excludeThesisId);
  }
  if (!Number.isFinite(result.similarityScore)) fail('INVALID_DOCUMENT', 'The similarity service returned an invalid result.', 502);
  const limit = threshold();
  return { ...result, threshold: limit, passed: result.similarityScore < limit, tool: result.tool || toolName() };
}

export function recordCheck(thesisId, versionId, result) {
  return insert(
    `INSERT INTO plagiarism_checks (thesis_id, version_id, similarity_score, threshold, tool, status, report_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    thesisId, versionId, result.similarityScore, result.threshold, result.tool,
    result.passed ? 'Passed' : 'Flagged',
    JSON.stringify({ matches: result.matches, note: result.note || null }),
  );
}

export const checksFor = thesisId => all(
  `SELECT p.*, v.version_number FROM plagiarism_checks p LEFT JOIN thesis_versions v ON v.id = p.version_id
    WHERE p.thesis_id = ? ORDER BY p.id DESC`, thesisId,
).map(c => ({ ...c, report: c.report_json ? JSON.parse(c.report_json) : null, report_json: undefined }));
