import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

// ─── Environment Variables ───────────────────────────────────────────────────
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TELEGRAM_BOT_TOKEN =
  Deno.env.get("TELEGRAM_BOT_TOKEN") || Deno.env.get("BOT_TOKEN") || "";
const TELEGRAM_ADMIN_CHAT_ID =
  Deno.env.get("TELEGRAM_ADMIN_CHAT_ID") || Deno.env.get("ADMIN_CHAT_ID") || "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "";

// ─── Supabase Client (Service Role for Admin DB operations) ───────────────────
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

// ─── CORS Headers ────────────────────────────────────────────────────────────
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-telegram-bot-api-secret-token",
  "Access-Control-Allow-Methods": "POST, GET, OPTIONS",
};

// ─── HTML Entity Escape Helper (prevents 400 Bad Request on special chars) ───
function escapeHtml(text: unknown): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

// ─── Send Message via Telegram Bot API with Full Error Capture ───────────────
interface TelegramSendResult {
  ok: boolean;
  error_code?: number;
  description?: string;
  result?: {
    message_id: number;
    chat: { id: number; title?: string; username?: string };
  };
}

async function sendTelegramMessage(
  token: string,
  chatId: string | number,
  htmlText: string,
  replyMarkup?: unknown
): Promise<TelegramSendResult> {
  if (!token) {
    const msg = "[TelegramBot] ERROR: TELEGRAM_BOT_TOKEN / BOT_TOKEN belum diset di Supabase Secrets!";
    console.error(msg);
    return { ok: false, description: msg };
  }
  if (!chatId) {
    const msg = "[TelegramBot] ERROR: chat_id target pengiriman kosong!";
    console.error(msg);
    return { ok: false, description: msg };
  }

  const payload: Record<string, unknown> = {
    chat_id: chatId,
    text: htmlText,
    parse_mode: "HTML",
  };

  if (replyMarkup) {
    payload.reply_markup = replyMarkup;
  }

  try {
    const response = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    const resJson: TelegramSendResult = await response.json();

    if (!resJson.ok) {
      console.error(`[TelegramBot] Telegram API Error (HTTP ${response.status}):`, {
        chat_id: chatId,
        error_code: resJson.error_code,
        description: resJson.description,
      });
    } else {
      console.log(
        `[TelegramBot] Pesan berhasil terkirim ke chat_id: ${chatId} (msg_id: ${resJson.result?.message_id})`
      );
    }

    return resJson;
  } catch (err: unknown) {
    const errStr = err instanceof Error ? err.message : String(err);
    console.error(`[TelegramBot] Network/Fetch Error ke chat_id ${chatId}:`, errStr);
    return { ok: false, description: errStr };
  }
}

// ─── Main Request Handler ────────────────────────────────────────────────────
Deno.serve(async (req) => {
  // Handle CORS Preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const pathname = url.pathname;

    let body: Record<string, any> = {};
    if (req.method === "POST") {
      try {
        body = await req.json();
      } catch {
        body = {};
      }
    }

    const action = body.action || "";

    // =========================================================================
    // 0. DIAGNOSTIC ENDPOINT: /test (atau action === "test")
    // =========================================================================
    if (pathname.endsWith("/test") || action === "test") {
      const targetChatId = body.chat_id || TELEGRAM_ADMIN_CHAT_ID;
      const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });

      if (!TELEGRAM_BOT_TOKEN) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "TELEGRAM_BOT_TOKEN / BOT_TOKEN belum dikonfigurasi di Supabase Secrets.",
          }),
          { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      if (!targetChatId) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "TELEGRAM_ADMIN_CHAT_ID / ADMIN_CHAT_ID belum dikonfigurasi dan tidak ada chat_id di request body.",
          }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const testMessage =
        `🚀 <b>TES KONEKSI TELEGRAM BOT — E1-TMA</b>\n\n` +
        `✅ <b>Status:</b> Edge Function & Bot API Terhubung!\n` +
        `⏰ <b>Waktu Server:</b> ${timestamp}\n` +
        `🤖 <b>Bot Token:</b> Valid & Terverifikasi\n` +
        `🎯 <b>Target Chat ID:</b> <code>${targetChatId}</code>\n\n` +
        `<i>Modul notifikasi siap mengirim request akses dan approval transaksi.</i>`;

      const result = await sendTelegramMessage(TELEGRAM_BOT_TOKEN, targetChatId, testMessage);

      return new Response(
        JSON.stringify({
          success: result.ok,
          target_chat_id: targetChatId,
          telegram_response: result,
        }),
        {
          status: result.ok ? 200 : 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // =========================================================================
    // 1. ENDPOINT: /request-access (atau action === "request-access")
    // Pengajuan akses Tim IT dari Guest -> Notifikasi ke Admin via Telegram
    // =========================================================================
    if (pathname.endsWith("/request-access") || action === "request-access") {
      const { telegram_id, name, username, note } = body;

      if (!telegram_id || !name) {
        return new Response(
          JSON.stringify({ error: "Parameter 'telegram_id' dan 'name' wajib diisi." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const timestamp = new Date().toLocaleString("id-ID", { timeZone: "Asia/Jakarta" });
      const usernameDisplay = username ? `@${escapeHtml(username)}` : "<i>Tanpa Username</i>";

      const messageText =
        `🔔 <b>REQUEST AKSES TIM IT BARU</b>\n\n` +
        `👤 <b>Nama:</b> ${escapeHtml(name)}\n` +
        `🏷️ <b>Username:</b> ${usernameDisplay}\n` +
        `🆔 <b>Telegram ID:</b> <code>${telegram_id}</code>\n` +
        `📝 <b>Catatan/Alasan:</b> ${escapeHtml(note || "-")}\n` +
        `📅 <b>Waktu:</b> ${timestamp}\n\n` +
        `<i>Silakan pilih tindakan persetujuan role:</i>`;

      // Format inline keyboard sesuai standar Telegram API (callback_data <= 64 bytes)
      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "✅ Setujui (User)", callback_data: `APPROVE_USER:${telegram_id}` },
            { text: "👑 Setujui (Admin)", callback_data: `APPROVE_ADMIN:${telegram_id}` },
          ],
          [
            { text: "❌ Tolak Permintaan", callback_data: `REJECT_USER:${telegram_id}` },
          ],
        ],
      };

      // Cari Admin IT aktif dari tabel telegram_users
      const { data: admins } = await supabase
        .from("telegram_users")
        .select("telegram_id")
        .eq("role", "admin")
        .eq("is_active", true);

      const targetChatIds = new Set<string | number>();

      if (admins && admins.length > 0) {
        for (const adm of admins) {
          if (adm.telegram_id) targetChatIds.add(adm.telegram_id);
        }
      }

      // Selalu sertakan TELEGRAM_ADMIN_CHAT_ID sebagai fallback/grup utama
      if (TELEGRAM_ADMIN_CHAT_ID) {
        targetChatIds.add(TELEGRAM_ADMIN_CHAT_ID);
      }

      if (targetChatIds.size === 0) {
        console.warn("[TelegramBot] Tidak ada Admin IT terdaftar dan TELEGRAM_ADMIN_CHAT_ID kosong.");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Tidak ada Admin IT di database dan TELEGRAM_ADMIN_CHAT_ID belum diset di secrets.",
          }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results: TelegramSendResult[] = [];
      for (const chatId of targetChatIds) {
        const res = await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, messageText, inlineKeyboard);
        results.push(res);
      }

      const successCount = results.filter((r) => r.ok).length;

      return new Response(
        JSON.stringify({
          success: successCount > 0,
          total_targets: targetChatIds.size,
          successful_sent: successCount,
          results,
        }),
        { status: successCount > 0 ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // 2. ENDPOINT: /notify (atau action === "notify")
    // Pengajuan Transaksi/Mutasi Aset -> Notifikasi ke Admin Region
    // =========================================================================
    if (pathname.endsWith("/notify") || action === "notify") {
      const {
        transaction_id,
        asset_brand,
        asset_model,
        type = "Mutasi",
        from_site,
        to_site,
        target_region,
        requested_by_name,
      } = body;

      if (!transaction_id) {
        return new Response(
          JSON.stringify({ error: "Parameter 'transaction_id' wajib diisi." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const messageText =
        `🔔 <b>PENGAJUAN ${escapeHtml(type.toUpperCase())} ASET</b>\n\n` +
        `📦 <b>Barang:</b> ${escapeHtml(asset_brand || "")} ${escapeHtml(asset_model || "Perangkat IT")}\n` +
        `🚚 <b>Dari:</b> <code>${escapeHtml(from_site || "Unknown")}</code> ➡️ <b>Tujuan:</b> <code>${escapeHtml(to_site || "Unknown")}</code>\n` +
        `👤 <b>Pemohon:</b> ${escapeHtml(requested_by_name || "Unknown")}\n\n` +
        `<i>Mohon persetujuan Admin:</i>`;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "✅ Setujui", callback_data: `APPROVE_TRX:${transaction_id}` },
            { text: "❌ Tolak", callback_data: `REJECT_TRX:${transaction_id}` },
          ],
        ],
      };

      // Query Admin IT: cek region target OR ALL
      let query = supabase
        .from("telegram_users")
        .select("telegram_id")
        .eq("role", "admin")
        .eq("is_active", true);

      if (target_region && target_region !== "Tanpa Region") {
        query = query.or(`assigned_region.eq.${target_region},assigned_region.eq.ALL,assigned_region.is.null`);
      }

      const { data: admins } = await query;

      const targetChatIds = new Set<string | number>();
      if (admins && admins.length > 0) {
        for (const a of admins) {
          if (a.telegram_id) targetChatIds.add(a.telegram_id);
        }
      }

      // Fallback ke TELEGRAM_ADMIN_CHAT_ID jika tidak ada admin region
      if (targetChatIds.size === 0 && TELEGRAM_ADMIN_CHAT_ID) {
        targetChatIds.add(TELEGRAM_ADMIN_CHAT_ID);
      }

      if (targetChatIds.size === 0) {
        console.warn("[TelegramBot] Tidak ada target Admin untuk transaksi:", transaction_id);
        return new Response(
          JSON.stringify({ error: "Admin tidak ditemukan untuk region transaksi." }),
          { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const results: TelegramSendResult[] = [];
      for (const chatId of targetChatIds) {
        const res = await sendTelegramMessage(TELEGRAM_BOT_TOKEN, chatId, messageText, inlineKeyboard);
        results.push(res);
      }

      const successCount = results.filter((r) => r.ok).length;

      return new Response(
        JSON.stringify({
          success: successCount > 0,
          notified_admins: successCount,
          results,
        }),
        { status: successCount > 0 ? 200 : 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // =========================================================================
    // 3. ENDPOINT: /dispatch (atau action === "dispatch")
    // Notifikasi ke pemohon bahwa unit sudah dialokasikan & dikirim
    // =========================================================================
    if (pathname.endsWith("/dispatch") || action === "dispatch") {
      const {
        transaction_code,
        type = "Pengiriman",
        requested_by,
        asset_brand,
        asset_model,
        serial_number,
      } = body;

      if (!requested_by) {
        return new Response(
          JSON.stringify({ error: "Parameter 'requested_by' wajib diisi." }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const messageText =
        `📦 <b>PENGIRIMAN ASET (${escapeHtml(type.toUpperCase())})</b>\n\n` +
        `Unit pesanan Anda telah <b>Dialokasikan dan Dikirim</b> oleh Admin IT.\n\n` +
        `🔖 <b>Kode Trx:</b> <code>${escapeHtml(transaction_code || "-")}</code>\n` +
        `💻 <b>Barang:</b> ${escapeHtml(asset_brand || "")} ${escapeHtml(asset_model || "")}\n` +
        `🔢 <b>S/N:</b> <code>${escapeHtml(serial_number || "-")}</code>\n\n` +
        `<i>Silakan konfirmasi penerimaan di aplikasi TMA setelah unit tiba di lokasi Anda.</i>`;

      const result = await sendTelegramMessage(TELEGRAM_BOT_TOKEN, requested_by, messageText);

      return new Response(JSON.stringify({ success: result.ok, result }), {
        status: result.ok ? 200 : 502,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // =========================================================================
    // 4. ENDPOINT: /webhook
    // Menangani callback query interaktif saat tombol inline ditekan oleh Admin
    // =========================================================================
    if (pathname.endsWith("/webhook")) {
      // Verifikasi secret token jika diset
      const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
      if (WEBHOOK_SECRET && secretToken !== WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      const update = body;

      if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const data: string = callbackQuery.data || "";
        const adminId = callbackQuery.from.id;
        const adminName = callbackQuery.from.first_name || "Admin";
        const messageId = callbackQuery.message?.message_id;
        const chatId = callbackQuery.message?.chat?.id;

        console.log(`[TelegramBot] Callback diterima: "${data}" dari ${adminName} (${adminId})`);

        // ─────────────────────────────────────────────────────────────────────
        // A. Handle Persetujuan Akses User (APPROVE_USER / APPROVE_ADMIN / REJECT_USER)
        // ─────────────────────────────────────────────────────────────────────
        const isUserApproval =
          data.startsWith("APPROVE_USER:") ||
          data.startsWith("APPROVE_ADMIN:") ||
          data.startsWith("REJECT_USER:") ||
          data.startsWith("approve_user_") ||
          data.startsWith("approve_admin_") ||
          data.startsWith("reject_");

        if (isUserApproval) {
          let targetTelegramId: number | null = null;
          let newRole: "admin" | "user" | "guest" = "user";
          let actionLabel = "";
          let isReject = false;

          if (data.startsWith("APPROVE_USER:")) {
            targetTelegramId = parseInt(data.replace("APPROVE_USER:", ""), 10);
            newRole = "user";
            actionLabel = "✅ DISETUJUI SEBAGAI USER";
          } else if (data.startsWith("APPROVE_ADMIN:")) {
            targetTelegramId = parseInt(data.replace("APPROVE_ADMIN:", ""), 10);
            newRole = "admin";
            actionLabel = "👑 DISETUJUI SEBAGAI ADMIN";
          } else if (data.startsWith("REJECT_USER:")) {
            targetTelegramId = parseInt(data.replace("REJECT_USER:", ""), 10);
            newRole = "guest";
            actionLabel = "❌ DITOLAK";
            isReject = true;
          } else if (data.startsWith("approve_user_")) {
            targetTelegramId = parseInt(data.replace("approve_user_", ""), 10);
            newRole = "user";
            actionLabel = "✅ DISETUJUI SEBAGAI USER";
          } else if (data.startsWith("approve_admin_")) {
            targetTelegramId = parseInt(data.replace("approve_admin_", ""), 10);
            newRole = "admin";
            actionLabel = "👑 DISETUJUI SEBAGAI ADMIN";
          } else if (data.startsWith("reject_")) {
            targetTelegramId = parseInt(data.replace("reject_", ""), 10);
            newRole = "guest";
            actionLabel = "❌ DITOLAK";
            isReject = true;
          }

          if (targetTelegramId) {
            // Update role di database
            const updatePayload: Record<string, any> = {
              role: newRole,
              notes: isReject
                ? `Permintaan ditolak oleh ${adminName} pada ${new Date().toISOString()}`
                : `Akses disetujui (${newRole}) oleh ${adminName} pada ${new Date().toISOString()}`,
            };

            const { error: updErr } = await supabase
              .from("telegram_users")
              .update(updatePayload)
              .eq("telegram_id", targetTelegramId);

            if (updErr) {
              console.error("[TelegramBot] Gagal update role user:", updErr);
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  callback_query_id: callbackQuery.id,
                  text: "❌ Gagal memperbarui database.",
                  show_alert: true,
                }),
              });
              return new Response("Database Error", { status: 500 });
            }

            // Beritahu admin penekan tombol bahwa aksi sukses
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                callback_query_id: callbackQuery.id,
                text: `${actionLabel} oleh ${adminName}!`,
              }),
            });

            // Update pesan di chat admin: hapus tombol & bubuhkan label status
            if (chatId && messageId) {
              const originalText = callbackQuery.message?.text || "";
              const lines = originalText.split("\n").filter((l: string) => !l.includes("Silakan pilih"));
              const updatedText =
                `${lines.join("\n")}\n\n` +
                `📌 <b>STATUS:</b> ${actionLabel} (oleh <b>${escapeHtml(adminName)}</b>)`;

              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: messageId,
                  text: updatedText,
                  parse_mode: "HTML",
                }),
              });
            }

            // Kirim notifikasi DM ke user yang bersangkutan
            const userDm = isReject
              ? `⚠️ <i>Permintaan akses Tim IT Anda belum dapat disetujui saat ini. Hubungi Admin IT untuk informasi lebih lanjut.</i>`
              : `🎉 <b>Selamat!</b> Akses Anda telah disetujui sebagai <b>${newRole.toUpperCase()}</b> oleh Admin IT.\nSilakan buka kembali aplikasi E1-TMA untuk mulai mengelola aset.`;

            await sendTelegramMessage(TELEGRAM_BOT_TOKEN, targetTelegramId, userDm);

            return new Response("OK", { status: 200 });
          }
        }

        // ─────────────────────────────────────────────────────────────────────
        // B. Handle Persetujuan Transaksi (APPROVE_TRX / REJECT_TRX)
        // ─────────────────────────────────────────────────────────────────────
        const isTrxApproval =
          data.startsWith("APPROVE_TRX:") ||
          data.startsWith("REJECT_TRX:") ||
          data.startsWith("approve_trx_") ||
          data.startsWith("reject_trx_");

        if (isTrxApproval) {
          let trxId: number | null = null;
          let newStatus = "";
          let actionLabel = "";

          if (data.startsWith("APPROVE_TRX:")) {
            trxId = parseInt(data.replace("APPROVE_TRX:", ""), 10);
            newStatus = "Approved";
            actionLabel = "✅ DISETUJUI";
          } else if (data.startsWith("REJECT_TRX:")) {
            trxId = parseInt(data.replace("REJECT_TRX:", ""), 10);
            newStatus = "Rejected";
            actionLabel = "❌ DITOLAK";
          } else if (data.startsWith("approve_trx_")) {
            trxId = parseInt(data.replace("approve_trx_", ""), 10);
            newStatus = "Approved";
            actionLabel = "✅ DISETUJUI";
          } else if (data.startsWith("reject_trx_")) {
            trxId = parseInt(data.replace("reject_trx_", ""), 10);
            newStatus = "Rejected";
            actionLabel = "❌ DITOLAK";
          }

          if (trxId && newStatus) {
            // Validasi hak akses Admin di database
            const { data: adminData } = await supabase
              .from("telegram_users")
              .select("role, assigned_region")
              .eq("telegram_id", adminId)
              .single();

            if (!adminData || adminData.role !== "admin") {
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  callback_query_id: callbackQuery.id,
                  text: "❌ Anda tidak memiliki wewenang Admin untuk transaksi ini.",
                  show_alert: true,
                }),
              });
              return new Response("Forbidden", { status: 403 });
            }

            // Anti-Double Click: pastikan transaksi masih berstatus Requested
            const { data: trxData } = await supabase
              .from("asset_transactions")
              .select("status, transaction_code, requested_by")
              .eq("id", trxId)
              .single();

            if (!trxData || trxData.status !== "Requested") {
              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  callback_query_id: callbackQuery.id,
                  text: `⚠️ Transaksi sudah berstatus: ${trxData?.status || "Diproses"}.`,
                  show_alert: true,
                }),
              });

              // Hapus inline keyboard
              if (chatId && messageId) {
                await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    chat_id: chatId,
                    message_id: messageId,
                    reply_markup: { inline_keyboard: [] },
                  }),
                });
              }
              return new Response("Already processed", { status: 200 });
            }

            // Update Database
            const updatePayload: Record<string, any> = {
              status: newStatus,
              notes: `Diproses via Telegram oleh ${adminName}`,
            };

            if (newStatus === "Approved") {
              updatePayload.approved_by = adminId;
              updatePayload.approved_at = new Date().toISOString();
            }

            const { error: updTrxErr } = await supabase
              .from("asset_transactions")
              .update(updatePayload)
              .eq("id", trxId);

            if (updTrxErr) {
              console.error("[TelegramBot] Error updating trx:", updTrxErr);
              return new Response("Database Error", { status: 500 });
            }

            // Beritahu Telegram bahwa aksi sukses
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                callback_query_id: callbackQuery.id,
                text: `${actionLabel} oleh ${adminName}!`,
              }),
            });

            // Edit pesan di chat admin
            if (chatId && messageId) {
              const originalText = callbackQuery.message?.text || "";
              const lines = originalText.split("\n").filter((l: string) => !l.includes("Mohon persetujuan"));
              const updatedText =
                `${lines.join("\n")}\n\n` +
                `📌 <b>STATUS:</b> ${actionLabel} (oleh <b>${escapeHtml(adminName)}</b>)`;

              await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chat_id: chatId,
                  message_id: messageId,
                  text: updatedText,
                  parse_mode: "HTML",
                }),
              });
            }

            // Kirim notifikasi DM ke pemohon transaksi
            if (trxData.requested_by) {
              const dmToRequester =
                `🔔 <b>UPDATE PENGAJUAN TRANSAKSI</b>\n\n` +
                `Pengajuan transaksi Anda (<code>${escapeHtml(trxData.transaction_code)}</code>) telah <b>${actionLabel}</b> oleh Admin IT (<b>${escapeHtml(adminName)}</b>).\n\n` +
                `<i>Silakan pantau status lengkap di aplikasi E1-TMA.</i>`;

              await sendTelegramMessage(TELEGRAM_BOT_TOKEN, trxData.requested_by, dmToRequester);
            }

            return new Response("OK", { status: 200 });
          }
        }
      }

      return new Response("OK", { status: 200 });
    }

    return new Response(JSON.stringify({ error: "Endpoint tidak ditemukan" }), {
      status: 404,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: unknown) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error("[TelegramBot] Unhandled error:", errorMsg);
    return new Response(JSON.stringify({ error: errorMsg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
