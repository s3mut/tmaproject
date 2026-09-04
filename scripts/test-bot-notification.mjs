/**
 * Diagnostic Tool — Pengujian Notifikasi Telegram Bot API & Edge Function
 * E1-TMA (TransitTMA)
 *
 * Cara Menjalankan:
 * 1. Menggunakan parameter langsung:
 *    node scripts/test-bot-notification.mjs <BOT_TOKEN> <ADMIN_CHAT_ID>
 * 
 * 2. Atau menggunakan file .env jika sudah ada TELEGRAM_BOT_TOKEN & TELEGRAM_ADMIN_CHAT_ID:
 *    node scripts/test-bot-notification.mjs
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.resolve(__dirname, '../.env');

// Baca .env sederhana
const envVars = {};
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const idx = trimmed.indexOf('=');
      const key = trimmed.slice(0, idx).trim();
      const val = trimmed.slice(idx + 1).trim();
      envVars[key] = val;
    }
  }
}

// Ambil dari argument CLI atau .env
const args = process.argv.slice(2);
const BOT_TOKEN = args[0] || envVars.TELEGRAM_BOT_TOKEN || envVars.BOT_TOKEN || envVars.VITE_TELEGRAM_BOT_TOKEN;
const ADMIN_CHAT_ID = args[1] || envVars.TELEGRAM_ADMIN_CHAT_ID || envVars.ADMIN_CHAT_ID || envVars.VITE_TELEGRAM_ADMIN_CHAT_ID;
const SUPABASE_URL = envVars.VITE_SUPABASE_URL || envVars.SUPABASE_URL;
const SUPABASE_ANON_KEY = envVars.VITE_SUPABASE_ANON_KEY || envVars.SUPABASE_ANON_KEY;

console.log('\n' + '='.repeat(70));
console.log('       🛠️  E1-TMA — TELEGRAM BOT API DIAGNOSTIC TOOL');
console.log('='.repeat(70));
console.log(`📌 Bot Token      : ${BOT_TOKEN ? BOT_TOKEN.slice(0, 10) + '...' + BOT_TOKEN.slice(-5) : '❌ [KOSONG / BELUM DISET]'}`);
console.log(`📌 Admin Chat ID  : ${ADMIN_CHAT_ID || '❌ [KOSONG / BELUM DISET]'}`);
console.log(`📌 Supabase URL   : ${SUPABASE_URL || '❌ [KOSONG]'}`);
console.log('='.repeat(70) + '\n');

if (!BOT_TOKEN) {
  console.error('❌ ERROR: BOT_TOKEN belum diberikan!');
  console.log('\n💡 Cara Penggunaan:');
  console.log('   node scripts/test-bot-notification.mjs <BOT_TOKEN> <ADMIN_CHAT_ID>');
  console.log('   Contoh: node scripts/test-bot-notification.mjs 123456789:ABCdefGHI 987654321\n');
  process.exit(1);
}

async function runDiagnostics() {
  let botInfo = null;

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 1: Verifikasi Validitas Token Bot via Telegram getMe
  // ───────────────────────────────────────────────────────────────────────────
  console.log('👉 [1/3] Menguji validitas Bot Token via Telegram API (getMe)...');
  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/getMe`);
    const data = await res.json();

    if (data.ok) {
      botInfo = data.result;
      console.log(`   ✅ PASS! Bot aktif: @${botInfo.username} (${botInfo.first_name}) [ID: ${botInfo.id}]`);
    } else {
      console.error(`   ❌ FAIL! Telegram API Error: ${data.description}`);
      console.error('   💡 Saran: Pastikan token bot dari @BotFather disalin dengan benar tanpa spasi.');
      return;
    }
  } catch (err) {
    console.error(`   ❌ FAIL! Koneksi ke Telegram gagal: ${err.message}`);
    return;
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 2: Kirim Pesan Uji Coba Langsung ke ADMIN_CHAT_ID
  // ───────────────────────────────────────────────────────────────────────────
  if (ADMIN_CHAT_ID) {
    console.log(`\n👉 [2/3] Mengirim pesan uji coba ke Admin Chat ID: ${ADMIN_CHAT_ID}...`);
    const timestamp = new Date().toLocaleString('id-ID', { timeZone: 'Asia/Jakarta' });
    const testHtml = 
      `🚀 <b>TES NOTIFIKASI E1-TMA (DIAGNOSTIC TOOL)</b>\n\n` +
      `✅ <b>Status:</b> Bot Telegram Berfungsi Normal!\n` +
      `⏰ <b>Waktu:</b> ${timestamp}\n` +
      `🤖 <b>Bot:</b> @${botInfo.username}\n` +
      `🎯 <b>Target:</b> <code>${ADMIN_CHAT_ID}</code>\n\n` +
      `<i>Pesan ini dikonfirmasi terkirim menggunakan parse_mode: HTML.</i>`;

    const inlineMarkup = {
      inline_keyboard: [
        [
          { text: '✅ Tombol Uji Coba Aktif', callback_data: 'TEST_BUTTON_OK' }
        ]
      ]
    };

    try {
      const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID,
          text: testHtml,
          parse_mode: 'HTML',
          reply_markup: inlineMarkup
        })
      });

      const data = await res.json();
      if (data.ok) {
        console.log(`   ✅ PASS! Pesan tes berhasil diterima oleh Telegram! (Message ID: ${data.result.message_id})`);
        console.log('   📱 Silakan periksa aplikasi Telegram Anda untuk memastikan pesan muncul.');
      } else {
        console.error(`   ❌ FAIL! Gagal mengirim pesan: HTTP ${res.status} — ${data.description}`);
        if (data.description.includes('chat not found')) {
          console.log('   💡 Penyebab: Admin Chat ID belum pernah mengirim perintah /start ke bot ini.');
          console.log(`   👉 Solusi: Buka t.me/${botInfo.username} lalu klik START di Telegram!`);
        } else if (data.description.includes('bot was blocked')) {
          console.log('   💡 Penyebab: Bot diblokir oleh user.');
          console.log(`   👉 Solusi: Unblock @${botInfo.username} di Telegram.`);
        }
      }
    } catch (err) {
      console.error(`   ❌ FAIL! Network Error: ${err.message}`);
    }
  } else {
    console.log('\n⚠️  [2/3] Dilewati: ADMIN_CHAT_ID tidak diberikan.');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // TEST 3: Menguji Supabase Edge Function (/test) jika Supabase URL ada
  // ───────────────────────────────────────────────────────────────────────────
  if (SUPABASE_URL && SUPABASE_ANON_KEY) {
    console.log(`\n👉 [3/3] Menguji Supabase Edge Function 'telegram-bot/test'...`);
    const edgeFunctionUrl = `${SUPABASE_URL.replace(/\/$/, '')}/functions/v1/telegram-bot/test`;

    try {
      const res = await fetch(edgeFunctionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'apikey': SUPABASE_ANON_KEY
        },
        body: JSON.stringify({
          chat_id: ADMIN_CHAT_ID
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        console.log(`   ✅ PASS! Edge Function merespon 200 OK dan berhasil mengirim notifikasi!`);
      } else {
        console.warn(`   ⚠️  Edge Function merespon: HTTP ${res.status}`);
        console.log('   Detail Response:', JSON.stringify(data, null, 2));
        if (res.status === 404) {
          console.log('   💡 Edge function telegram-bot belum di-deploy ke Supabase.');
          console.log('   👉 Jalankan: npx supabase functions deploy telegram-bot --no-verify-jwt');
        } else if (data.error && data.error.includes('Secrets')) {
          console.log('   💡 Secrets belum dipasang di Supabase.');
          console.log(`   👉 Jalankan: npx supabase secrets set TELEGRAM_BOT_TOKEN="${BOT_TOKEN}" TELEGRAM_ADMIN_CHAT_ID="${ADMIN_CHAT_ID}"`);
        }
      }
    } catch (err) {
      console.warn(`   ⚠️  Edge Function tidak dapat dihubungi: ${err.message}`);
    }
  } else {
    console.log('\nℹ️  [3/3] Dilewati: VITE_SUPABASE_URL belum terkonfigurasi di .env');
  }

  console.log('\n' + '='.repeat(70));
  console.log('                    DIAGNOSTIK SELESAI');
  console.log('='.repeat(70) + '\n');
}

runDiagnostics();
