# Execution and usage repair

Codex runs are explicitly restricted to ChatGPT sign-in; inherited OPENAI_API_KEY and CODEX_API_KEY are omitted from the Codex child process. No API-key fallback is added. Existing cost rows are retained as API-equivalent estimates; the header now labels the amount as an estimate, not an invoice or debit. This does not establish the user's account billing history.

Windows CLI runs explicitly select the configured elevated sandbox and never approvals while keeping the existing workspace-write/read-only scope. A no-model sandbox preflight successfully read the operations file, wrote a draft file within the project and read it back. No sandbox bypass was used.

Employees now receive two narrow MCP tools: read_project_file (assigned text references only) and save_draft (new md/txt/csv files in the employee's internal deliverables folder). Draft writes reject plan/meeting sessions, traversal, existing-file overwrite and linked directory escapes. Files are read back before success is returned. This does not give agents full-system write permissions.

HQ manual mode no longer silently launches a CEO model turn when task events arrive. The free CEO exception scan remains; repeated status/reason pairs are deduplicated, and new alerts are added to the digest for the next explicit CEO turn. Project reference excerpts are reduced from 24K to 6K characters and the manager receives financial counts rather than all records by default.

Existing shared-note drafts were preserved as actual private Markdown files and recorded against affected tasks without changing their completion status. They remain unverified internal drafts. Superseded by Zoe’s latest instruction: every employee, including video Mia, now uses Codex with ChatGPT authentication. Gemini and other paid API engines are disabled. All 13 tasks have not been rerun after this repair; no end-to-end success for every employee is claimed.

Checks: typecheck/build, scoped file read/write readback, path/overwrite/plan-write rejection, character knowledge scope, coordinated meeting regression, native Windows no-model sandbox read/write preflight. No new model verification calls were made for this repair.

## Codex-only verification (2026-10-22 HKT)

32 local workspaces and 195 employee definitions (14 in HQ) use gpt-6.1-sol. Hiring defaults to Codex and only lists account Codex models. API rejects non-Codex assignments, other provider changes and API-key setup. Child processes enforce ChatGPT login and remove OPENAI_API_KEY/CODEX_API_KEY. Meeting termination reuses the transcript; no Claude summary call remains. One real read-only coordinated meeting with Ethan and Ava returned three priorities from the actual task board, correctly marking them blocked. The transcript was persisted. This consumes Codex plan quota; it is not unlimited usage. This verification applies to localhost, not a Vercel production deployment. Video scripting is available through Codex; actual video rendering is not established by this change.

