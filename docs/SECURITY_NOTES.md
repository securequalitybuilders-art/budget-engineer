# Security Notes — Budget Engineer OS

## Threat Model

Budget Engineer is a **local-first SPA**. All data lives in IndexedDB in the user's browser.
There is no server-side backend, no cloud database, and no remote authentication service.

| Threat | Mitigation |
|--------|-----------|
| XSS via imported project data | Content-Security-Policy restricts script sources to `'self'`. All HTML rendering uses `sanitizeHtml()`. |
| Malicious .beproj file | Import validates JSON structure, schema version, and required fields before any write. |
| CSV injection | Export CSV values are escaped (`escapeCsv`). |
| Path traversal | No server filesystem access. PWA scope is restricted to `/`. |
| Dependency vulnerabilities | `npm audit` runs in CI at `--audit-level=high`. |

## CSP Policy

The following Content-Security-Policy is enforced via `<meta http-equiv="Content-Security-Policy">`:

```
default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline';
img-src 'self' data: blob:; font-src 'self' data:; connect-src 'self';
worker-src 'self' blob:; manifest-src 'self';
```

`'unsafe-inline'` is required for:
- Tailwind's JIT-generated styles (style-src)
- Vite's HMR dev runtime (script-src — development only)

For production deployment via nginx (see Dockerfile), these can be tightened further.

## Sanitization

All user-facing text output passes through `sanitizeHtml()` in `src/lib/security/sanitize.ts`.
Import filenames are sanitized via `sanitizeFileName()`.
