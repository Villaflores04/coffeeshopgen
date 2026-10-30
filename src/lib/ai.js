import { supabase } from './supabase.js';

/** Calls the /api/ai serverless function with the signed-in user's session. */
export async function callAi(body) {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  if (!token) throw new Error('Please log in to use the assistant.');
  let res;
  try {
    res = await fetch('/api/ai', {
      method: 'POST',
      headers: { 'content-type': 'application/json', authorization: `Bearer ${token}` },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Couldn’t reach the assistant. Check your connection.');
  }
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json.error || 'The assistant is unavailable right now.');
  return json;
}
