/**
 * TELEGRAM BOT WEBHOOK HANDLER (Pendekatan 1: Interactive Telegram Bot Access Approval)
 * 
 * Script ini dirancang untuk berjalan sebagai Supabase Edge Function atau Node.js Webhook.
 * Script ini menerima callback_query dari Telegram saat Admin menekan tombol Inline Keyboard:
 * - [ ✅ Setujui (User) ]   -> Ubah role user di database telegram_users menjadi 'user'
 * - [ 👑 Setujui (Admin) ]  -> Ubah role user di database telegram_users menjadi 'admin'
 * - [ ❌ Tolak ]            -> Tetapkan role user sebagai 'guest'
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

async function handleTelegramWebhook(req, res) {
  try {
    const update = req.body;

    // Handle Inline Keyboard Callback Query
    if (update && update.callback_query) {
      const callbackQuery = update.callback_query;
      const data = callbackQuery.data; // contoh: approve_user_123456789
      const adminName = callbackQuery.from.first_name || 'Admin';
      const messageId = callbackQuery.message.message_id;
      const chatId = callbackQuery.message.chat.id;

      let targetId = null;
      let newRole = null;
      let actionLabel = '';

      if (data.startsWith('approve_user_')) {
        targetId = parseInt(data.replace('approve_user_', ''), 10);
        newRole = 'user';
        actionLabel = '✅ DISETUJUI sebagai User IT';
      } else if (data.startsWith('approve_admin_')) {
        targetId = parseInt(data.replace('approve_admin_', ''), 10);
        newRole = 'admin';
        actionLabel = '👑 DISETUJUI sebagai Admin IT';
      } else if (data.startsWith('reject_')) {
        targetId = parseInt(data.replace('reject_', ''), 10);
        newRole = 'guest';
        actionLabel = '❌ DITOLAK';
      }

      if (targetId && newRole) {
        // 1. Update role user di database Supabase
        const { error } = await supabase
          .from('telegram_users')
          .update({
            role: newRole,
            notes: `Disetujui/Diproses oleh ${adminName} pada ${new Date().toISOString()}`,
            is_active: true
          })
          .eq('telegram_id', targetId);

        if (error) {
          console.error('Error updating user role:', error);
          await answerCallbackQuery(activeBotToken, callbackQuery.id, '❌ Gagal update database.');
          return res.status(500).json({ error: error.message });
        }

        // 2. Answer Callback Query to stop loading spinner on Telegram button
        await answerCallbackQuery(TELEGRAM_BOT_TOKEN, callbackQuery.id, `${actionLabel} oleh ${adminName}`);

        // 3. Edit pesan notifikasi asli di chat Telegram Admin
        const updatedMessageText = `${callbackQuery.message.text}\n\n📌 *STATUS*: ${actionLabel} (oleh ${adminName})`;
        await editMessageText(TELEGRAM_BOT_TOKEN, chatId, messageId, updatedMessageText);

        // 4. Kirim notifikasi DM langsung ke Telegram User yang mengajukan
        await sendTelegramMessage(
          TELEGRAM_BOT_TOKEN, 
          targetId, 
          newRole !== 'guest' 
            ? `🎉 *SELAMAT!* Pengajuan akses Tim IT TransitTMA Anda telah *${actionLabel}* oleh ${adminName}.\nSilakan buka kembali aplikasi Telegram Mini App.`
            : `ℹ️ Mohon maaf, pengajuan akses Tim IT Anda belum dapat disetujui saat ini.`
        );
      }
    }

    return res.status(200).json({ status: 'ok' });
  } catch (err) {
    console.error('Webhook error:', err);
    return res.status(500).json({ error: err.message });
  }
}

async function answerCallbackQuery(token, callbackQueryId, text) {
  await fetch(`https://api.telegram.org/bot${token}/answerCallbackQuery`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ callback_query_id: callbackQueryId, text: text })
  });
}

async function editMessageText(token, chatId, messageId, text) {
  await fetch(`https://api.telegram.org/bot${token}/editMessageText`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, message_id: messageId, text: text, parse_mode: 'Markdown' })
  });
}

async function sendTelegramMessage(token, chatId, text) {
  await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ chat_id: chatId, text: text, parse_mode: 'Markdown' })
  });
}

module.exports = { handleTelegramWebhook };
