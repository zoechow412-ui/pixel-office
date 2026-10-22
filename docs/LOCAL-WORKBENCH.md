# Local workbench and lively office

Implemented on 22 October 2026 for the existing Hang Fai checkout. These are local deterministic tools, not additional LLM services. All employees remain Codex-only, authenticated through ChatGPT. No model runs or outgoing email were used to verify this change.

## Available flows

- Characters: independent idle paths, reachable facility selection and fallback aisle walks, typing on actual working status, meeting arrival and return. The classic room had only twelve meeting places; overflow participants now receive separate, reachable floor positions. A simulation verifies all fourteen are physically inside the room. Explicit lively mode can opt into movement when the browser requests reduced motion; gentle mode remains available. Random illness has been disabled in the existing local settings so the game cannot interrupt business work.
- Search: current project references, owned deliverables, shared notes, imported text, reviewed OCR text and text PDFs. Chinese substring search complements FlexSearch. Agent tools enforce assigned project scope. Original imported PDFs are retained unchanged; no arbitrary filesystem path is accepted. Text PDFs: 4 MB, 30 pages and 200,000 characters per import. Scanned PDFs need page images for OCR.
- Quotations: integer-based rounding for quantity × price, flat discount, received amount and balance. Missing quantity or price is an error, not zero. Chinese PDF output is explicitly an internal review draft. It does not replace the original quotation system, Logo, layout, complex pricing rules, invoices or contractual terms.
- Calendar: Hong Kong dates, persisted appointments and completion flags. Due events join the CEO exception overview, without starting a model. Reminder badges update while the page is open; there are no SMS or email notifications.
- OCR: Tesseract.js runs locally with Traditional Chinese and English language data. First use downloads open-source language files; it does not call a paid AI service. PNG/JPEG input, 4 MB maximum, one job at a time. Recognition requires human review and is not an engineering drawing interpretation or measurement tool.
- Mail: original `.eml` import, plain text preview, attachment download, saved raw mail, draft creation, review record and unsent `.eml` export. HTML and remote tracking images are not rendered. Optional IMAP lists the last thirty messages and imports one selected message, including attachments. Optional SMTP requires review of the exact draft and a separate explicit send confirmation. Send attempts are marked before network transmission and never retried automatically. No test email was sent.
- Backups: all local `.pixel-office/{employees,projects,data,deliverables}` files, excluding credentials, tokens, auth files, integration secrets, links and worktrees. ZIP manifests contain SHA-256 hashes; creation and download verify decompression and file hashes. A backup is created on startup if needed, then checked hourly for a daily snapshot. Maximum 100 MB/15,000 files. This is a validated restore archive; the UI does not overwrite live data. Files and external systems outside these roots are not backed up.
- Chat progress: long-running working turns refresh their lifecycle timestamp, fixing the previous thirty-minute stale display. No chat content, tool arguments, mail or credentials are published.

## Mail connection boundary

The current local website has no usable IMAP/SMTP credentials. A ChatGPT Gmail connector session does not grant this separate Node server its own mail access. The existing inbox snapshot and `.eml` workflows work; continuous live mailbox access and actual delivery are not verified or advertised as connected.

If a trusted local operator later configures the existing mailbox, the server supports `OFFICE_IMAP_HOST`, `OFFICE_SMTP_HOST`, `OFFICE_MAIL_USER`, and either `OFFICE_MAIL_ACCESS_TOKEN` or `OFFICE_MAIL_PASSWORD` in the server environment. Never put these in chat, Git, agent prompts or frontend files. They are stripped from Codex subprocess environments. IMAP uses TLS port 993; SMTP uses TLS port 465. Review mailbox policy before configuration. No new credentials were requested or provisioned here.

## Verification

- `node scripts/test-local-workbench.mjs`: real temporary HTTP server; scoped search and isolation, path rejection, persisted calendar, reminders, MIME and attachment roundtrip, reviewed unsent email, Chinese PDF, PDF text extraction and original-byte roundtrip, archive decompression and SHA-256 verification. Test fixtures never enter production business data.
- `node scripts/test-lively-office.mjs`: ninety-second fourteen-person motion simulation, physical obstacle checks, actual working status, fourteen separate meeting places and exit.
- Existing layout equivalence/fuzz, safe file tools, fourteen-role roster and thirty-two-workspace preservation tests pass.
- Live browser: search of existing BHU files returns source excerpts. Quote test computes 2 × 120.50 − 1 = HK$240.00. Lively mode was visibly activated despite the browser reduced-motion preference; multiple characters enter `walk` poses. No fake task progress is displayed.
- Live OCR: `TOTAL HKD 1250.00` recognized with confidence 89. This is one synthetic sample, not a claim of universal accuracy.

These results apply to localhost. The Vercel production deployment remains unverified and is not made operational by this change. Local jobs require this computer and server to remain running.
