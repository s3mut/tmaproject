import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  // Hanya jalankan jika request datang dari internal / cron schedule
  // Untuk uji coba manual, izinkan GET/POST
  
  try {
    // 1. Ambil semua data peminjaman yang overdue dari view
    const { data: overdues, error: errOverdues } = await supabase
      .from("view_overdue_loans")
      .select("*")
      .order("overdue_days", { ascending: false });

    if (errOverdues) throw new Error("Gagal mengambil data overdue: " + errOverdues.message);
    
    if (!overdues || overdues.length === 0) {
      return new Response("Tidak ada aset yang overdue hari ini.", { status: 200 });
    }

    // 2. Kelompokkan berdasarkan region
    const overdueByRegion: Record<string, typeof overdues> = {};
    for (const item of overdues) {
      const region = item.region || "ALL";
      if (!overdueByRegion[region]) overdueByRegion[region] = [];
      overdueByRegion[region].push(item);
    }

    // 3. Ambil daftar Admin IT (termasuk Super Admin "ALL")
    const { data: admins, error: errAdmins } = await supabase
      .from("telegram_users")
      .select("telegram_id, assigned_region")
      .in("role", ["admin"]); // Hanya kirim ke admin

    if (errAdmins) throw new Error("Gagal mengambil data admin: " + errAdmins.message);

    // 4. Kirim notifikasi Telegram ke masing-masing admin sesuai region-nya
    let sentCount = 0;
    for (const admin of admins || []) {
      const adminRegion = admin.assigned_region || "ALL";
      
      let itemsToSend: typeof overdues = [];
      
      if (adminRegion === "ALL") {
        // Super Admin menerima semua overdue
        itemsToSend = overdues;
      } else if (overdueByRegion[adminRegion]) {
        // Admin region tertentu hanya menerima overdue dari region-nya
        itemsToSend = overdueByRegion[adminRegion];
      }

      if (itemsToSend.length === 0) continue;

      // Susun pesan
      let message = `⚠️ *Laporan Keterlambatan Peminjaman (Overdue)* ⚠️\n`;
      message += `Terdapat *${itemsToSend.length}* unit backup yang belum dikembalikan.\n\n`;

      for (let i = 0; i < Math.min(itemsToSend.length, 10); i++) {
        const item = itemsToSend[i];
        message += `🔹 *${item.asset_serial_number}* (${item.category_name})\n`;
        message += `📍 Lokasi: ${item.site_name || item.site_alias}\n`;
        message += `👤 Peminjam: ${item.requested_by_name}\n`;
        message += `⏳ Overdue: *${item.overdue_days} Hari*\n\n`;
      }

      if (itemsToSend.length > 10) {
        message += `_...dan ${itemsToSend.length - 10} unit lainnya._\n`;
      }

      message += `Silakan buka Aplikasi TMA untuk detail lebih lanjut dan hubungi toko terkait.`;

      // Kirim via Telegram API
      try {
        const tgResponse = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            chat_id: admin.telegram_id,
            text: message,
            parse_mode: "Markdown",
          }),
        });
        
        if (tgResponse.ok) sentCount++;
      } catch (tgErr) {
        console.error(`Gagal mengirim pesan ke ${admin.telegram_id}:`, tgErr);
      }
    }

    return new Response(`Cron selesai. Mengirim ${sentCount} pesan ke Admin.`, { status: 200 });

  } catch (err: any) {
    console.error("Cron Error:", err);
    return new Response("Terjadi kesalahan: " + err.message, { status: 500 });
  }
});
