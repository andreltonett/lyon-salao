const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const databaseEnabled = Boolean(supabaseUrl && supabaseAnonKey);

const headers = {
  apikey: supabaseAnonKey || '',
  Authorization: `Bearer ${supabaseAnonKey || ''}`,
  'Content-Type': 'application/json'
};

async function fetchWithTimeout(url, options = {}) {
  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), 6000);

  try {
    return await fetch(url, {
      ...options,
      signal: controller.signal
    });
  } finally {
    window.clearTimeout(timeoutId);
  }
}

export async function loadFromDatabase(key, fallback) {
  if (!databaseEnabled) {
    return fallback;
  }

  const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/app_state?key=eq.${encodeURIComponent(key)}&select=value`, {
    headers
  });

  if (!response.ok) {
    throw new Error('Nao foi possivel carregar os dados do banco.');
  }

  const rows = await response.json();
  return rows[0]?.value ?? fallback;
}

export async function saveToDatabase(key, value) {
  if (!databaseEnabled) {
    return;
  }

  const response = await fetchWithTimeout(`${supabaseUrl}/rest/v1/app_state`, {
    method: 'POST',
    headers: {
      ...headers,
      Prefer: 'resolution=merge-duplicates'
    },
    body: JSON.stringify({ key, value })
  });

  if (!response.ok) {
    throw new Error('Nao foi possivel salvar os dados no banco.');
  }
}
