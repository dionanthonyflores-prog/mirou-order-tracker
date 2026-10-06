// Calls the database's harmless "ping" function once, so the free Supabase project doesn't pause in a quiet week.
// It reads no data. GitHub runs it every day (see .github/workflows/keep-awake.yml); run it by hand with:  node scripts/keep-awake.mjs
import { SUPABASE_URL, SUPABASE_KEY } from '../js/config.js';

const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/ping`, {
  method: 'POST',
  headers: { apikey: SUPABASE_KEY, 'Content-Type': 'application/json' },
  body: '{}',
});
const answer = await response.json().catch(() => null);
console.log(`The database answered: HTTP ${response.status} ${JSON.stringify(answer)}`);
if (answer !== 'ok') process.exit(1);   // a failed run shows up in red on GitHub's Actions tab, and GitHub emails the owner
