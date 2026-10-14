# Telegram Mini App, Bot, and Notifications

**E1-TMA** is a Telegram Mini App (TMA). Local `npm run dev` is only the frontend. Production operations depend on this workflow: host the Vite app on HTTPS, register it in BotFather, deploy two Supabase Edge Functions, store bot secrets on the server, and point Telegram’s webhook at `/webhook`.

Without this setup, staff can still use the **web login form** in a browser. They will **not** get auto-login inside Telegram, one-click access approval, transaction approve/reject from chat, dispatch DMs, or daily overdue reminders.

Related code:

| Piece | Path |
|---|---|
| Mini App bootstrap | `src/App.tsx` (`Telegram.WebApp.ready` / `expand`) |
| Telegram identity | `src/services/userService.ts`, `src/services/authService.ts` |
| Access request + test invoke | `src/services/userService.ts` (`telegram-bot/request-access`, `telegram-bot/test`) |
| Transaction notify | `src/services/transactionService.ts` (`telegram-bot/notify`) |
| Bot handler | `supabase/functions/telegram-bot/index.ts` |
| Daily overdue / stuck transit | `supabase/functions/cron-overdue/index.ts` |
| Diagnostic CLI | `scripts/test-bot-notification.mjs` |

---

## Architecture

```
Staff phone (Telegram)
        │
        ├─ Mini App (HTTPS Vite build) ──► Supabase PostgREST (anon key)
        │
        └─ Inline buttons / DMs
                │
                ▼
        Telegram Bot API
                │
                ▼  setWebhook
        Edge Function telegram-bot  (/request-access, /notify, /dispatch, /webhook, /test)
                │
                ▼  service role
        PostgreSQL (telegram_users, asset_transactions, …)

Scheduled (once per day)
        pg_cron / Supabase scheduled function
                │
                ▼
        Edge Function cron-overdue ──► Telegram DMs to admin telegram_id
```

**Do not put the bot token in the Vite client for production.** `VITE_TELEGRAM_BOT_TOKEN` is only a last-resort fallback in `userService.ts`. The real path is Supabase secrets used by Edge Functions.

`supabase/config.toml` already sets `verify_jwt = false` on both functions so Telegram can POST to `/webhook` without a user JWT. Do not enable JWT verification on `telegram-bot` unless you add a separate authenticated route.

---

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with the E1-TMA schema applied (see README SQL order, then `sql/` upgrades as needed)
- [Supabase CLI](https://supabase.com/docs/guides/cli) (`npx supabase` is enough)
- A Telegram account that can talk to [@BotFather](https://t.me/BotFather)
- An **HTTPS** URL for the Mini App (Telegram will not open `http://localhost` as a production Mini App). Typical hosts: Vercel, Netlify, Cloudflare Pages, or a reverse proxy with TLS.

Frontend env (Vite / hosting provider):

```env
VITE_SUPABASE_URL=https://<PROJECT_REF>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-or-publishable-key>
```

Optional local-only fallback (not required if Edge Functions are deployed):

```env
VITE_TELEGRAM_BOT_TOKEN=
VITE_TELEGRAM_ADMIN_CHAT_ID=
```

---

## Setup

### 1. Create the bot and Mini App in BotFather

1. Open [@BotFather](https://t.me/BotFather) → `/newbot` → copy the **bot token**.
2. `/newapp` (or Bot Settings → Configure Mini App) and set:
   - **Title:** E1-TMA
   - **Short name:** a unique slug
   - **Web App URL:** `https://<your-frontend-host>/` (must be HTTPS)
3. `/setmenubutton` → choose the bot → set the button label (for example `Buka E1-TMA`) and the same HTTPS URL.
4. Optional: `/setprivacy` → **Disable** if the bot must read group messages. For this project the bot mainly **sends** DMs and group messages and receives **callback queries**, so privacy mode can stay default.
5. Add the bot to the IT admin group (if you use a group as `TELEGRAM_ADMIN_CHAT_ID`). Send any message in that group, then get the chat id (see Troubleshooting).

### 2. Link the CLI to Supabase and set secrets

From the repo root:

```bash
npx supabase login
npx supabase link --project-ref <PROJECT_REF>
```

Set **Edge Function** secrets (not Vite env):

```bash
npx supabase secrets set TELEGRAM_BOT_TOKEN="<bot-token-from-botfather>"
npx supabase secrets set TELEGRAM_ADMIN_CHAT_ID="<admin-user-id-or-group-id>"
npx supabase secrets set WEBHOOK_SECRET="<long-random-string>"
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically on hosted Edge Functions. Do not commit the service role key.

`TELEGRAM_ADMIN_CHAT_ID` is the fallback target when no active `admin` rows exist in `telegram_users`. It can be:

- a **user id** (positive integer) — that person must press **Start** on the bot first
- a **group/supergroup id** (usually negative, e.g. `-100…`) — the bot must be a member of the group

`WEBHOOK_SECRET` is optional but recommended. If set, Telegram must send header `X-Telegram-Bot-Api-Secret-Token` and the function rejects other callers with `401`.

Aliases `BOT_TOKEN` and `ADMIN_CHAT_ID` are also accepted by `telegram-bot`. Prefer the `TELEGRAM_*` names.

### 3. Deploy Edge Functions

```bash
npx supabase functions deploy telegram-bot --no-verify-jwt
npx supabase functions deploy cron-overdue --no-verify-jwt
```

`--no-verify-jwt` matches `config.toml`. After deploy, the public URLs are:

```
https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot
https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot/test
https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot/request-access
https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot/notify
https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot/dispatch
https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot/webhook
https://<PROJECT_REF>.supabase.co/functions/v1/cron-overdue
```

### 4. Register the Telegram webhook

Replace placeholders. `secret_token` must equal `WEBHOOK_SECRET` if you set that secret.

```bash
curl -s "https://api.telegram.org/bot<BOT_TOKEN>/setWebhook" \
  -d "url=https://<PROJECT_REF>.supabase.co/functions/v1/telegram-bot/webhook" \
  -d "secret_token=<WEBHOOK_SECRET>" \
  -d "allowed_updates=[\"callback_query\",\"message\"]"
```

Confirm:

```bash
curl -s "https://api.telegram.org/bot<BOT_TOKEN>/getWebhookInfo"
```

`url` must match the function, `pending_update_count` should drop to `0` after a test click, and `last_error_message` should be empty.

### 5. Host the Mini App frontend

1. Build: `npm run build` (output: `dist/`).
2. Deploy `dist/` to the HTTPS host you registered in BotFather.
3. Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` **in the host’s environment** (for example Vercel Project Settings) **before** the production build. Vite inlines these at build time.
4. Redeploy after changing Vite env vars.

Local preview of the **web** login path:

```bash
npm run dev
```

Open `http://localhost:5173`. Telegram Mini App features (auto-login, native scan, haptics) only work inside Telegram’s WebView.

To try the Mini App against a local Vite server during development, use a tunnel (ngrok, Cloudflare Tunnel) with HTTPS and temporarily point BotFather’s Web App URL at that tunnel. Point it back to production when you are done.

### 6. Seed at least one admin who can receive DMs

Access-request and transaction buttons are sent to:

1. Every `telegram_users` row with `role = 'admin'` and `is_active = true` (user `telegram_id`)
2. Plus `TELEGRAM_ADMIN_CHAT_ID`

That admin must have started the bot (`/start`). Regional routing uses `assigned_region` (`ALL` receives every region). After changing region columns, run `docs/telegram_bot_migration.sql` if `telegram_users.region` is still missing on older databases.

### 7. Schedule `cron-overdue` (daily reminders)

`cron-overdue` reads `view_overdue_loans` (borrowing `In Progress` past `due_date`) and `asset_transactions` stuck `In Transit` for more than 3 days, then DMs each admin for their region.

Apply the view if it is missing:

```sql
-- docs/overdue_reminder_migration.sql
```

Then schedule a daily POST (Supabase Dashboard → Edge Functions → `cron-overdue` → Schedules, or `pg_cron` + `net.http_post`). Example `pg_cron` (replace ref and **service role** key; never commit the key):

```sql
select cron.schedule(
  'e1-tma-overdue-daily',
  '0 8 * * *',  -- 08:00 UTC; adjust for Asia/Jakarta if the project timezone is set
  $$
  select net.http_post(
    url := 'https://<PROJECT_REF>.supabase.co/functions/v1/cron-overdue',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer <SERVICE_ROLE_KEY>'
    ),
    body := '{}'::jsonb
  );
  $$
);
```

A `200` body like `Tidak ada overdue & tidak ada transit nyangkut hari ini.` means the job ran and there was nothing to send.

---

## Usage

### Open the Mini App

1. Open the bot in Telegram → tap the menu button, or the Mini App link from BotFather.
2. The WebView loads the HTTPS frontend. `App.tsx` calls `WebApp.ready()` and `expand()`.
3. `userService` reads `window.Telegram.WebApp.initDataUnsafe.user` and upserts `telegram_users`.
4. Guests see limited UI. IT staff need role `user` or `admin`.

### Request IT access (guest)

1. Profile → **Request Akses Tim IT**.
2. Frontend invokes `telegram-bot/request-access`.
3. Admins (and the admin chat) receive a message with **Setujui (User)**, **Setujui (Admin)**, **Tolak**.
4. A tap hits `/webhook`, updates `telegram_users.role`, edits the original message, and DMs the requester.

If the Edge Function is down, the client may try a direct Bot API send when `VITE_TELEGRAM_*` is set. Button clicks still require the webhook.

### Approve a mutation / loan from chat

1. Creating a transaction calls `telegram-bot/notify`.
2. Region-matched admins get **Setujui** / **Tolak** (`APPROVE_TRX` / `REJECT_TRX`).
3. `/webhook` updates `asset_transactions` and notifies the requester.

### Dispatch notification

When IT allocates a unit, the app can invoke `telegram-bot/dispatch`. The requester receives a DM with transaction code, brand/model, and serial number, and should confirm receipt in the Mini App.

### Endpoints (for operators)

| Route or `body.action` | Who calls it | Purpose |
|---|---|---|
| `/test` or `action: "test"` | Diagnostic script / admin test | Send a connectivity message |
| `/request-access` | Mini App | Guest access request + inline buttons |
| `/notify` | Mini App | New transaction approval card |
| `/dispatch` | Mini App | DM requester that a unit shipped |
| `/webhook` | Telegram only | Callback query handler |
| `cron-overdue` POST | Scheduler | Daily overdue + stuck transit recap |

The handler also accepts `{ "action": "…" }` on the function root so `supabase.functions.invoke('telegram-bot')` works if path routing fails.

---

## Verify the pipeline

From the repo root, with `.env` containing `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, and optionally tokens:

```bash
node scripts/test-bot-notification.mjs
# or
node scripts/test-bot-notification.mjs "<BOT_TOKEN>" "<ADMIN_CHAT_ID>"
```

The script:

1. Calls Telegram `getMe`
2. Sends a direct HTML test message (and a dummy inline button)
3. POSTs `telegram-bot/test` through the Edge Function

Manual checks:

1. Open the Mini App as a **guest** → request access → admin Telegram shows buttons → approve → guest role updates without opening the web UI.
2. Create a mutation as `user` → admin gets `/notify` buttons → approve/reject updates the transaction list.
3. Trigger `cron-overdue` once from the Supabase dashboard when you have a borrowing row past `due_date`.

---

## Troubleshooting

| Symptom | Likely cause | What to do |
|---|---|---|
| Mini App opens blank / “Missing Supabase environment variables” | Vite env not present **at build time** | Set `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` on the host, rebuild, redeploy. |
| Mini App URL rejected by BotFather | HTTP or localhost | Use HTTPS on a public host or a tunnel. |
| Auto-login does not run; login form appears | Opened in a normal browser | Expected. Use the bot menu button. Web users set a password from Profile after one Telegram login. |
| Request access “succeeds” in UI but no Telegram message | Function not deployed, secrets empty, or admin never started the bot | Deploy `telegram-bot`; `npx supabase secrets list`; user must `/start` the bot; check function logs. |
| `TELEGRAM_BOT_TOKEN / BOT_TOKEN belum dikonfigurasi` | Secret name mismatch | Set `TELEGRAM_BOT_TOKEN` (or `BOT_TOKEN`) via `supabase secrets set`, then redeploy the function. |
| `chat not found` | User/group never talked to the bot, or wrong id | Open `t.me/<bot>` → Start. For groups, add the bot and use the negative id. |
| `bot was blocked by the user` | User blocked the bot | Unblock, then `/start`. |
| Buttons do nothing | Webhook not set, wrong URL, or JWT gateway | `getWebhookInfo`; `setWebhook` to `…/telegram-bot/webhook`; keep `verify_jwt = false`. |
| Webhook `401 Unauthorized` | `WEBHOOK_SECRET` set but Telegram `secret_token` missing/mismatch | `setWebhook` again with the same `secret_token`. |
| `400 Bad Request` on sendMessage | Unescaped HTML in names | The function escapes `& < >`. If you fork it, keep `escapeHtml` and `parse_mode: HTML`. |
| Admin in region A gets tickets for region B | `assigned_region` null/wrong | Set `assigned_region` to the region name or `ALL`. Super-admins use `ALL`. |
| Overdue cron never fires | Schedule not created or view missing | Run `docs/overdue_reminder_migration.sql`; add the schedule in §7. Confirm `view_overdue_loans`. |
| Overdue cron `200` but no DMs | No matching rows, or admin `telegram_id` cannot receive DMs | Check view rows (`status = 'In Progress'`, `due_date < now()`). Admins must `/start` the bot. |
| Edge Function `404` | Name/path wrong | Deploy `telegram-bot`; invoke `telegram-bot/test` not a stale Node `bot_webhook_handler.js` (that file is gone). |
| CORS / invoke error in browser | Function crash or gateway | Open Supabase → Edge Functions → Logs. Retry with `{ action: "test" }` on the function root. |
| Approve in chat works, Mini App still shows old role | Frontend cache | Pull to refresh / reopen the Mini App; `telegram_users` should already be updated. |

### Logs

```bash
npx supabase functions logs telegram-bot --tail
npx supabase functions logs cron-overdue --tail
```

Useful log lines: `Callback diterima`, missing token errors, Telegram `description` from `sendTelegramMessage`.

### Security notes

- Rotate the bot token in BotFather if it ever landed in git, chat, or `VITE_*` production builds.
- Prefer Edge Function secrets over `VITE_TELEGRAM_BOT_TOKEN` so the token is not shipped to every Mini App client.
- Keep `WEBHOOK_SECRET` set so strangers cannot POST fake `APPROVE_*` payloads to `/webhook`.
- The function uses the **service role** to update roles and transactions. Treat logs and dashboard access accordingly.

---

## Local Edge Function development (optional)

```bash
npx supabase start
npx supabase functions serve telegram-bot --no-verify-jwt --env-file .env
```

Point a tunnel at the local functions port and `setWebhook` to that tunnel **only while testing**. Restore the hosted webhook URL afterward.

`cron-overdue` can be invoked with:

```bash
curl -X POST http://127.0.0.1:54321/functions/v1/cron-overdue
```
