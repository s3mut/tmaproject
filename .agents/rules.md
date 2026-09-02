# E1-TMA Development & Coding Rules

## 1. Architecture & Business Logic Guardrails
- **Unified Transaction Lifecycle**: All asset movements (Loan, Mutation, Repair) MUST use the unified `asset_transactions` table[cite: 3].
- **6-Phase Loan Workflow**: Always adhere to the 6-phase loan state machine:
  `Requested` ➡ `Approved` ➡ `In Transit` ➡ `In Progress` ➡ `Returning` ➡ `Completed`[cite: 1].
- **Auto-Restoration Guarantee**: When an asset loan reaches `Completed` status, the system MUST automatically restore `master_assets.site_alias` back to `from_site_code` (origin regional warehouse)[cite: 1, 3]. Permanent mutations update to `to_site_code`[cite: 1].
- **Asset Locking**: Assets tied to active, uncompleted transactions MUST be flagged as locked (`lockedAssetIds`) to prevent duplicate assignments and exclude them from Stock Opname scan lists[cite: 3].
- **Asset Status Domain**: `master_assets.status` is strictly limited to physical conditions: `'Active' | 'Backup' | 'Retired' | 'Disposed'`[cite: 1, 3]. Never add movement statuses into `asset_status`[cite: 3].

## 2. Database & Supabase Conventions
- **PostgREST 1,000-Row Bypass**: Any full-table inventory query MUST use range chunking (`.range(from, to)`) to bypass the default 1,000-row limit[cite: 2, 3].
- **Strict Category Validation**: Never bypass `master_categories` validation[cite: 2, 3]. All CSV imports must validate categories and use chunked batching (250 rows/chunk) with UPSERT on `serial_number`[cite: 1, 2, 3].
- **RPC & RLS Security**: Web authentication, role assignment, and schema updates must go through RPCs declared with `SECURITY DEFINER`[cite: 1, 2, 3]. Never expose password hashes or administrative bypasses to client queries.
- **CSV & Excel Compatibility**: Every CSV export (Odoo Reconciliation, Disaster Recovery, Disposal Draft) MUST include the UTF-8 BOM prefix (`\uFEFF`) to prevent character corruption in Microsoft Excel[cite: 1, 2, 3].

## 3. UI/UX & Mobile-First Telegram Standards
- **Atomic UI Design System**: Build views strictly from `src/components/ui/` (`Button`, `Input`, `Select`, `Badge`, `ModalShell`, `SiteSearchInput`)[cite: 2, 3]. Do NOT write raw inline Tailwind buttons or ad-hoc input styles[cite: 3].
- **Zero Window Dialogs**: NEVER use native `window.alert()`, `window.confirm()`, or `window.prompt()` inside Telegram WebView (unreliable on mobile clients)[cite: 3]. Use `ConfirmModal` and custom toast notifications[cite: 3].
- **High-Performance Search**: Use `SiteSearchInput` for branch/site selection to ensure zero lag across 2,000+ branch records[cite: 1, 2, 3].
- **Dual Authentication**: Always check for `Telegram.WebApp.initDataUnsafe.user` first for auto-login[cite: 2, 3]. Fallback gracefully to Web Login (`verify_web_login_v2`) when accessed outside Telegram[cite: 2, 3].
- **Theme Adaptability**: All color styles must support dual theme classes (e.g., `text-slate-900 dark:text-white` or CSS variables) to seamlessly support Light and Dark modes[cite: 2, 3].

## 4. TypeScript & Code Quality Standards
- **No Implicit Any**: Keep strict TypeScript typing. Run `npx tsc --noEmit` validation before concluding any task[cite: 2, 3].
- **Hooks Lifecycle**: Never call React hooks conditionally or below early returns (prevent React Error #310)[cite: 3].
- **Date Standardization**: Store and manipulate dates in standard ISO strings / UTC; display dates formatted in Indonesian locale (`id-ID`)[cite: 1].
- **Audit Logging**: Every mutating action (mutation, loan phase transition, bulk disposal, role modification) must append a record to transaction notes or audit logs[cite: 2, 3].

## Git Auto-Push Shortcut
Whenever I type `autopush` or `/push`:
1. Check changed files using `git status` and `git diff`.
2. Stage all files: `git add .`
3. Generate a concise, meaningful commit message following Conventional Commits (`feat:`, `fix:`, `refactor:`, `chore:`).
4. Commit the changes: `git commit -m "<generated_message>"`
5. Push to the remote repository: `git push`
6. Output a brief confirmation containing the commit message used and the push status.