# Security Policy

## Supported Versions

| Version | Supported          |
| ------- | ------------------ |
| 1.0.x   | ✅ Currently Maintained |
| 0.x.x   | ❌ End of Life     |

## Reporting a Vulnerability

We take security vulnerabilities seriously. If you discover a security issue, please report it responsibly.

### How to Report

1. **Do NOT** create a public GitHub issue for security vulnerabilities
2. Email us at: **security@aether-os.dev**
3. Include the following information:
   - Type of vulnerability
   - Full paths of source file(s) related to the vulnerability
   - Location of the affected source code (tag/branch/commit or direct URL)
   - Step-by-step instructions to reproduce the issue
   - Proof-of-concept or exploit code (if possible)
   - Impact of the issue (including how an attacker might exploit it)

### What to Expect

- **Acknowledgment**: Within 48 hours, you'll receive acknowledgment of your report
- **Initial Assessment**: We'll assess the severity and impact within 7 days
- **Updates**: We'll keep you updated on our progress
- **Resolution**: We'll work on a fix and coordinate disclosure
- **Credit**: With your permission, we'll credit you in the security advisory

### Scope

We consider the following as in-scope:
- Data encryption issues
- Authentication/authorization flaws
- Cross-site scripting (XSS)
- Cross-site request forgery (CSRF)
- Server-side code execution
- Sensitive data exposure
- Dependency vulnerabilities

### Security Features

Aether OS implements the following security measures:

- **Encryption**: AES-256-GCM for sensitive data at rest
- **Authentication**: OAuth2/OIDC, JWT tokens with refresh
- **CORS**: Configurable cross-origin policies
- **CSP**: Content Security Policy headers
- **Sanitization**: Input sanitization for user content
- **Sandboxing**: Plugin isolation in sandboxed iframes

### Security Updates

Security updates are released as patch versions. We recommend:

```bash
# Always use the latest version
npm install aether-os@latest
```

### Security Resources

- [OWASP Top 10](https://owasp.org/www-project-top-ten/)
- [Web Security Guidelines](https://developer.mozilla.org/en-US/docs/Web/Security)
- [Tauri Security Model](https://tauri.app/v1/guides/security/)

---

Thank you for helping keep Aether OS and its users safe!
