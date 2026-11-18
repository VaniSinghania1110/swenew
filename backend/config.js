import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendDir = path.join(root, 'frontend');
const defaultPublic = fs.existsSync(frontendDir) ? frontendDir : path.join(root, 'public');

export const config = {
  root,
  port: Number(process.env.PORT || 3000),
  dataDir: process.env.DATA_DIR || path.join(root, 'data'),
  get dbFile() { return path.join(this.dataDir, 'thesis-vault.db'); },
  get uploadDir() { return path.join(this.dataDir, 'uploads'); },
  publicDir: process.env.PUBLIC_DIR || defaultPublic,

  // NFR-003/NFR-004: secrets and TLS come from the environment in production.
  jwtSecret: process.env.JWT_SECRET || 'dev-only-secret-change-me',
  sessionHours: 8,
  tlsKey: process.env.TLS_KEY_FILE || '',
  tlsCert: process.env.TLS_CERT_FILE || '',

  maxUploadBytes: 50 * 1024 * 1024, // wireframe: "Maximum file size: 50 MB"

  // FR-021: third-party similarity service adapter.
  plagiarism: {
    provider: process.env.PLAGIARISM_PROVIDER || 'copyleaks',
    apiUrl: process.env.PLAGIARISM_API_URL || '',
    apiKey: process.env.PLAGIARISM_API_KEY || 'ea2d3061-c76d-4fea-9f62-e91bab1c46ba',
    email: process.env.PLAGIARISM_EMAIL || '',
    sandbox: process.env.PLAGIARISM_SANDBOX === 'true' || false,
    timeoutMs: Number(process.env.PLAGIARISM_TIMEOUT_MS || 25000),
  },

  doiPrefix: process.env.DOI_PREFIX || '10.5555/lnmiit',
};
