---
name: project-security-review
description: Review security-sensitive project changes. Use when work touches authentication, authorization, secrets, user input, file uploads, API endpoints, database queries, payments, private data, or third-party integrations.
---

# Project Security Review

Use this skill before implementing or delivering security-sensitive work.

## Trigger Areas

- authentication or sessions
- authorization or role checks
- secrets, tokens, credentials, or environment variables
- user input, forms, uploads, imports, or external payloads
- API endpoints, webhooks, background jobs, or queues
- database queries, migrations, or access policies
- payments, billing, private user data, health data, or enterprise data
- third-party SDKs, MCP servers, or remote automation

## Review Checklist

- Secrets: no hardcoded keys, tokens, passwords, or private URLs.
- Config: sensitive values come from environment or approved secret storage.
- Input: every boundary validates and normalizes input before use.
- Database: use parameterized queries or safe ORM/query-builder patterns.
- Authorization: check permissions before sensitive reads, writes, deletes, exports, or activation.
- Auth storage: prefer secure server-side sessions or httpOnly cookies for browser tokens.
- XSS: avoid unsafe HTML; sanitize user-controlled markup when rendering is required.
- Uploads: validate size, type, extension, and storage destination.
- Logging: redact secrets and private data from logs, telemetry, reports, and errors.
- Dependencies: avoid adding new packages for security-sensitive code unless necessary and reviewed.
- External effects: require explicit user approval before posting, pushing, publishing, deleting, billing, or changing third-party resources.

## Output Format

- `安全范围`
- `检查结果`
- `阻断问题`
- `建议修复`
- `剩余风险`
