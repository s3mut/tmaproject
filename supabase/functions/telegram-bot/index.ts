import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";
const WEBHOOK_SECRET = Deno.env.get("WEBHOOK_SECRET") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);

    // ==========================================
    // 1. ENDPOINT: /notify
    // ==========================================
    // Dipanggil oleh Aplikasi React / Trigger untuk mengirim pesan DM ke IT Region
    if (url.pathname.endsWith("/notify")) {
      // Hanya izinkan POST
      if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

      const body = await req.json();
      const { transaction_id, asset_brand, asset_model, type, from_site, to_site, target_region, requested_by_name } = body;

      // Cari Admin IT di region tujuan ATAU Super Admin (ALL)
      const { data: admins, error: adminError } = await supabase
        .from("telegram_users")
        .select("telegram_id")
        .eq("role", "admin")
        .eq("is_active", true)
        .or(`assigned_region.eq.${target_region},assigned_region.eq.ALL`);

      if (adminError || !admins || admins.length === 0) {
        console.error("Tidak ada Admin IT di region:", target_region);
        return new Response(JSON.stringify({ error: "Admin not found for region" }), { status: 404 });
      }

      // Siapkan pesan dan tombol inline keyboard
      const messageText = `*🔔 PENGAJUAN ${type.toUpperCase()} ASET*\n\n` +
                          `*Barang*: ${asset_brand} ${asset_model}\n` +
                          `*Dari*: ${from_site} ➡️ *Tujuan*: ${to_site}\n` +
                          `*Pemohon*: ${requested_by_name}\n\n` +
                          `Mohon persetujuan Anda:`;

      const inlineKeyboard = {
        inline_keyboard: [
          [
            { text: "✅ Setujui", callback_data: `approve_trx_${transaction_id}` },
            { text: "❌ Tolak", callback_data: `reject_trx_${transaction_id}` }
          ]
        ]
      };

      // Kirim DM ke semua admin di region tersebut (biasanya hanya 1-2 orang)
      for (const admin of admins) {
        await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: admin.telegram_id,
            text: messageText,
            parse_mode: "Markdown",
            reply_markup: inlineKeyboard
          })
        });
      }

      return new Response(JSON.stringify({ success: true, notified_admins: admins.length }), { status: 200 });
    }

    // ==========================================
    // 2. ENDPOINT: /webhook
    // ==========================================
    // Dipanggil oleh Telegram API saat admin menekan tombol Inline Keyboard
    if (url.pathname.endsWith("/webhook")) {
      if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });

      // Lapis 1: Verifikasi Secret Token
      // Di Telegram, token rahasia dikirim via header "X-Telegram-Bot-Api-Secret-Token"
      const secretToken = req.headers.get("x-telegram-bot-api-secret-token");
      if (WEBHOOK_SECRET && secretToken !== WEBHOOK_SECRET) {
        return new Response("Unauthorized", { status: 401 });
      }

      const update = await req.json();

      if (update.callback_query) {
        const callbackQuery = update.callback_query;
        const data = callbackQuery.data; // e.g., approve_trx_123
        const adminId = callbackQuery.from.id;
        const adminName = callbackQuery.from.first_name || "Admin";
        const messageId = callbackQuery.message.message_id;
        const chatId = callbackQuery.message.chat.id;

        let trxId = null;
        let newStatus = null;
        let actionLabel = "";

        if (data.startsWith("approve_trx_")) {
          trxId = parseInt(data.replace("approve_trx_", ""), 10);
          newStatus = "Approved";
          actionLabel = "✅ DISETUJUI";
        } else if (data.startsWith("reject_trx_")) {
          trxId = parseInt(data.replace("reject_trx_", ""), 10);
          newStatus = "Rejected";
          actionLabel = "❌ DITOLAK";
        }

        if (trxId && newStatus) {
          // Lapis 2: Validasi hak akses Admin di database
          const { data: adminData, error: adminErr } = await supabase
            .from("telegram_users")
            .select("role, assigned_region")
            .eq("telegram_id", adminId)
            .single();

          if (adminErr || !adminData || adminData.role !== "admin") {
            // Tolak akses (tampilkan Toast merah muda di layar user)
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ callback_query_id: callbackQuery.id, text: "❌ Anda tidak berhak menyetujui request ini.", show_alert: true })
            });
            return new Response("Forbidden", { status: 403 });
          }

          // Pastikan transaksi masih Requested (Lapis 3: Anti-Double Click / Replay Attack)
          const { data: trxData, error: trxErr } = await supabase
            .from("asset_transactions")
            .select("status, from_site_code")
            .eq("id", trxId)
            .single();
            
          if (trxErr || !trxData || trxData.status !== "Requested") {
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ callback_query_id: callbackQuery.id, text: "⚠️ Transaksi sudah diproses sebelumnya.", show_alert: true })
            });
            // Hapus tombol
            await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageReplyMarkup`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ chat_id: chatId, message_id: messageId, reply_markup: { inline_keyboard: [] } })
            });
            return new Response("Already processed", { status: 200 });
          }

          // Cek region (opsional: pastikan adminData.region cocok dengan region asal aset)
          // ... (bisa ditambahkan logika lanjutan jika mau strict region matching)

          // Lakukan Update Database
          const updatePayload: any = {
            status: newStatus,
            notes: `Diproses via Telegram oleh ${adminName}`,
          };
          
          if (newStatus === "Approved") {
            updatePayload.approved_by = adminId;
            updatePayload.approved_at = new Date().toISOString();
          }

          const { error: updateErr } = await supabase
            .from("asset_transactions")
            .update(updatePayload)
            .eq("id", trxId);

          if (updateErr) {
            console.error("Error updating trx:", updateErr);
            return new Response("Database Error", { status: 500 });
          }

          // Beritahu Telegram bahwa aksi sukses
          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/answerCallbackQuery`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ callback_query_id: callbackQuery.id, text: `${actionLabel}!` })
          });

          // Hapus tombol dan tambahkan label status di pesan
          const originalText = callbackQuery.message.text;
          // Buang kalimat "Mohon persetujuan Anda:" (asumsi di baris terakhir)
          const newTextLines = originalText.split('\n');
          const cleanText = newTextLines.filter((l: string) => !l.includes("Mohon persetujuan")).join('\n');
          const updatedMessageText = `${cleanText}\n📌 *STATUS*: ${actionLabel} (oleh ${adminName})`;

          await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/editMessageText`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: updatedMessageText, parse_mode: "Markdown" })
          });
        }
      }

      return new Response("OK", { status: 200 });
    }

    // ==========================================
    // 3. ENDPOINT: /dispatch
    // ==========================================
    // Dipanggil saat Admin mengklik tombol "Kirim & Serahkan Unit" (In Transit)
    if (url.pathname.endsWith("/dispatch")) {
      if (req.method !== "POST") return new Response("Method Not Allowed", { status: 405 });
      const body = await req.json();
      const { transaction_code, type, requested_by, asset_brand, asset_model, serial_number } = body;

      const messageText = `*📦 PENGIRIMAN ASET (${type.toUpperCase()})*\n\n` +
                          `Barang pesanan Anda telah *Dialokasikan dan Dikirim* oleh Admin.\n\n` +
                          `*Kode Trx*: ${transaction_code}\n` +
                          `*Barang*: ${asset_brand} ${asset_model}\n` +
                          `*S/N*: ${serial_number}\n\n` +
                          `Silakan konfirmasi penerimaan di aplikasi TMA jika barang sudah tiba di lokasi Anda.`;

      await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          chat_id: requested_by,
          text: messageText,
          parse_mode: "Markdown",
        })
      });

      return new Response(JSON.stringify({ success: true }), { status: 200 });
    }

    return new Response("Not Found", { status: 404 });
  } catch (error) {
    console.error("Function error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
});
