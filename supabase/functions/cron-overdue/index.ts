import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const TELEGRAM_BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  try {
    // 1. Ambil data peminjaman overdue dari view
    const { data: overdues, error: errOverdues } = await supabase
      .from("view_overdue_loans")
      .select("*")
      .order("overdue_days", { ascending: false });

    if (errOverdues) console.error("Gagal ambil data overdue:", errOverdues.message);

    // 2. Kelompokkan Overdue berdasarkan region
    const overdueByRegion: Record<string, any[]> = {};
    for (const item of (overdues || [])) {
      const region = item.region || "ALL";
      if (!overdueByRegion[region]) overdueByRegion[region] = [];
      overdueByRegion[region].push(item);
    }

    // 3. Ambil data unit In Transit > 3 Hari
    const threeDaysAgo = new Date();
    threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);

    const { data: stuckTransit, error: errStuck } = await supabase
      .from("asset_transactions")
      .select("id, transaction_code, to_site_code, dispatched_at, requested_by, asset_id")
      .eq("status", "In Transit")
      .lt("dispatched_at", threeDaysAgo.toISOString());
      
    if (errStuck) console.error("Gagal ambil data in transit:", errStuck.message);

    // 4. Kelompokkan In Transit berdasarkan region
    const transitByRegion: Record<string, any[]> = {};
    if (stuckTransit && stuckTransit.length > 0) {
      const siteCodes = Array.from(new Set(stuckTransit.map(s => s.to_site_code).filter(Boolean)));
      const assetIds = Array.from(new Set(stuckTransit.map(s => s.asset_id).filter(Boolean)));
      const userIds = Array.from(new Set(stuckTransit.map(s => s.requested_by).filter(Boolean)));

      const [siteRes, assetRes, userRes] = await Promise.all([
        supabase.from("sites").select("site_code, site_name, region").in("site_code", siteCodes),
        supabase.from("master_assets").select("id, serial_number, brand").in("id", assetIds),
        supabase.from("telegram_users").select("telegram_id, name").in("telegram_id", userIds)
      ]);

      const siteMap = new Map((siteRes.data || []).map(s => [s.site_code, s]));
      const assetMap = new Map((assetRes.data || []).map(a => [a.id, a]));
      const userMap = new Map((userRes.data || []).map(u => [u.telegram_id, u.name]));

      for (const item of stuckTransit) {
        const site = item.to_site_code ? siteMap.get(item.to_site_code) : null;
        const region = site?.region || "ALL";
        const asset = item.asset_id ? assetMap.get(item.asset_id) : null;
        const reqName = item.requested_by ? userMap.get(item.requested_by) : "Unknown";

        const enrichedItem = {
          ...item,
          site_name: site?.site_name || item.to_site_code,
          asset_sn: asset?.serial_number || "Unknown S/N",
          asset_brand: asset?.brand || "",
          req_name: reqName
        };

        if (!transitByRegion[region]) transitByRegion[region] = [];
        transitByRegion[region].push(enrichedItem);
      }
    }

    if ((!overdues || overdues.length === 0) && (!stuckTransit || stuckTransit.length === 0)) {
      return new Response("Tidak ada overdue & tidak ada transit nyangkut hari ini.", { status: 200 });
    }

    // 5. Ambil daftar Admin IT
    const { data: admins, error: errAdmins } = await supabase
      .from("telegram_users")
      .select("telegram_id, assigned_region")
      .in("role", ["admin"]);

    if (errAdmins) throw new Error("Gagal ambil data admin: " + errAdmins.message);

    // 6. Kirim notifikasi Telegram
    let sentCount = 0;
    for (const admin of admins || []) {
      const adminRegion = admin.assigned_region || "ALL";
      
      let itemsToSend: any[] = [];
      let transitToSend: any[] = [];
      
      if (adminRegion === "ALL") {
        itemsToSend = overdues || [];
        transitToSend = Object.values(transitByRegion).flat();
      } else {
        itemsToSend = overdueByRegion[adminRegion] || [];
        transitToSend = transitByRegion[adminRegion] || [];
      }

      if (itemsToSend.length === 0 && transitToSend.length === 0) continue;

      let message = "";

      if (itemsToSend.length > 0) {
        message += `⚠️ *Laporan Keterlambatan Peminjaman (Overdue)* ⚠️\n`;
        message += `Terdapat *${itemsToSend.length}* unit backup yang belum dikembalikan.\n\n`;

        for (let i = 0; i < Math.min(itemsToSend.length, 10); i++) {
          const item = itemsToSend[i];
          message += `🔹 *${item.asset_serial_number}* (${item.category_name})\n`;
          message += `📍 Lokasi: ${item.site_name || item.site_alias}\n`;
          message += `👤 Peminjam: ${item.requested_by_name}\n`;
          message += `⏳ Overdue: *${item.overdue_days} Hari*\n\n`;
        }

        if (itemsToSend.length > 10) {
          message += `_...dan ${itemsToSend.length - 10} unit lainnya._\n\n`;
        }
      }

      if (transitToSend.length > 0) {
        if (message !== "") message += `➖➖➖➖➖➖➖➖➖➖\n\n`;
        message += `🚚 *Peringatan Unit Belum Diterima (In Transit)* 🚚\n`;
        message += `Terdapat *${transitToSend.length}* unit dikirim > 3 hari lalu namun belum diklik terima oleh Toko.\n\n`;
        
        for (let i = 0; i < Math.min(transitToSend.length, 10); i++) {
          const t = transitToSend[i];
          const daysTransit = Math.floor((new Date().getTime() - new Date(t.dispatched_at).getTime()) / (1000 * 3600 * 24));
          message += `🔹 *${t.asset_sn}* ${t.asset_brand ? '('+t.asset_brand+')' : ''}\n`;
          message += `📍 Tujuan: ${t.site_name}\n`;
          message += `👤 Pemohon: ${t.req_name}\n`;
          message += `⏳ Lama Pengiriman: *${daysTransit} Hari*\n\n`;
        }

        if (transitToSend.length > 10) {
          message += `_...dan ${transitToSend.length - 10} unit lainnya._\n\n`;
        }
      }

      message += `Silakan buka Aplikasi TMA untuk detail lebih lanjut dan lakukan crosscheck ke toko terkait.`;

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
