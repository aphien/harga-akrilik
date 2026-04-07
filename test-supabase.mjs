// Quick Supabase connection test
const SUPABASE_URL = 'https://rhuxafuxjdchdrscszuv.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_dTq-m509MtVC3MygjppRFQ__VYVQ6XC';

async function testConnection() {
  console.log('=== Supabase Connection Test ===\n');
  console.log(`URL: ${SUPABASE_URL}`);
  console.log(`Key: ${SUPABASE_ANON_KEY.substring(0, 20)}...`);
  console.log('');

  // Test 1: Health check
  try {
    const healthRes = await fetch(`${SUPABASE_URL}/rest/v1/`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    console.log(`[1] REST API Health: ${healthRes.status} ${healthRes.statusText}`);
  } catch (err) {
    console.log(`[1] REST API Health: GAGAL - ${err.message}`);
  }

  // Test 2: Fetch pemasok table
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/pemasok?select=nama&limit=5`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const data = await res.json();
    console.log(`[2] Tabel "pemasok": ${res.status} ${res.statusText}`);
    if (res.ok) {
      console.log(`    Data: ${JSON.stringify(data)}`);
    } else {
      console.log(`    Error: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    console.log(`[2] Tabel "pemasok": GAGAL - ${err.message}`);
  }

  // Test 3: Fetch harga_akrilik table
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/harga_akrilik?select=*&limit=3`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const data = await res.json();
    console.log(`[3] Tabel "harga_akrilik": ${res.status} ${res.statusText}`);
    if (res.ok) {
      console.log(`    Jumlah rows: ${data.length}`);
      if (data.length > 0) console.log(`    Sample: ${JSON.stringify(data[0])}`);
    } else {
      console.log(`    Error: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    console.log(`[3] Tabel "harga_akrilik": GAGAL - ${err.message}`);
  }

  // Test 4: Fetch tipe_akrilik table
  try {
    const res = await fetch(`${SUPABASE_URL}/rest/v1/tipe_akrilik?select=*&limit=5`, {
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
      }
    });
    const data = await res.json();
    console.log(`[4] Tabel "tipe_akrilik": ${res.status} ${res.statusText}`);
    if (res.ok) {
      console.log(`    Data: ${JSON.stringify(data)}`);
    } else {
      console.log(`    Error: ${JSON.stringify(data)}`);
    }
  } catch (err) {
    console.log(`[4] Tabel "tipe_akrilik": GAGAL - ${err.message}`);
  }

  console.log('\n=== Tes Selesai ===');
}

testConnection();
