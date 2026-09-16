#!/usr/bin/env node

/**
 * Supabase Keep-Alive Ping Script
 * Mencegah database Supabase Free Tier terhibernasi (pause) setelah 7 hari inaktivitas.
 * 
 * Penggunaan:
 *   node scripts/keep-alive.mjs           # Ping sekali (cocok untuk crontab / GitHub Actions)
 *   node scripts/keep-alive.mjs --daemon  # Berjalan sebagai background daemon setiap 6 jam
 */

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://rhuxafuxjdchdrscszuv.supabase.co';
const SUPABASE_ANON_KEY = process.env.SUPABASE_ANON_KEY || 'sb_publishable_dTq-m509MtVC3MygjppRFQ__VYVQ6XC';

// Interval default untuk mode daemon: 6 jam (dalam milidetik)
const DEFAULT_INTERVAL_HOURS = 6;
const isDaemon = process.argv.includes('--daemon');

// Argumen kustom interval jika ada, e.g. --interval=12
const intervalArg = process.argv.find(arg => arg.startsWith('--interval='));
const intervalHours = intervalArg ? parseFloat(intervalArg.split('=')[1]) || DEFAULT_INTERVAL_HOURS : DEFAULT_INTERVAL_HOURS;
const intervalMs = intervalHours * 60 * 60 * 1000;

function formatTimestamp() {
  const now = new Date();
  return now.toLocaleString('id-ID', {
    timeZone: 'Asia/Jakarta',
    dateStyle: 'medium',
    timeStyle: 'medium',
  });
}

async function pingSupabase() {
  const timestamp = formatTimestamp();
  const startTime = Date.now();

  try {
    // Ping tabel tipe_akrilik untuk memastikan query database postgres dieksekusi
    const url = `${SUPABASE_URL}/rest/v1/tipe_akrilik?select=id&limit=1`;
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
        'Cache-Control': 'no-cache',
      },
    });

    const latency = Date.now() - startTime;

    if (response.ok) {
      console.log(`[${timestamp}] ✅ Supabase KEEP-ALIVE SUKSES | Status: ${response.status} | Latensi: ${latency}ms`);
      return { success: true, status: response.status, latency };
    } else {
      const text = await response.text();
      console.warn(`[${timestamp}] ⚠️ Supabase respon non-200 | Status: ${response.status} | Body: ${text.slice(0, 120)}`);
      return { success: false, status: response.status, latency, error: text };
    }
  } catch (err) {
    const latency = Date.now() - startTime;
    console.error(`[${timestamp}] ❌ Supabase KEEP-ALIVE GAGAL | Error: ${err.message} (${latency}ms)`);
    return { success: false, error: err.message, latency };
  }
}

async function run() {
  console.log('='.repeat(56));
  console.log('  🧮 SUPABASE KEEP-ALIVE CRON WORKER');
  console.log('='.repeat(56));
  console.log(`Target URL: ${SUPABASE_URL}`);
  console.log(`Mode      : ${isDaemon ? `Daemon (Ulangi setiap ${intervalHours} jam)` : 'Sekali Eksekusi (One-shot)'}`);
  console.log('-'.repeat(56));

  await pingSupabase();

  if (isDaemon) {
    console.log(`\n⏳ Menunggu ${intervalHours} jam untuk ping berikutnya... Tekan Ctrl+C untuk berhenti.\n`);
    setInterval(async () => {
      await pingSupabase();
    }, intervalMs);
  }
}

run();
