// The real storage: her orders in her private Supabase database.
// It offers the same functions as the demo storage (list, get, create, update), plus logging in and out.
import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm';

// The database names its columns with underscores; the app uses camelCase
const COLUMNS = { id: 'id', no: 'no', createdAt: 'created_at', customer: 'customer', contact: 'contact', how: 'how', address: 'address',
  deliveryFee: 'delivery_fee', notes: 'notes', status: 'status', paid: 'paid', paidBy: 'paid_by', items: 'items' };
const fromRow = row => Object.fromEntries(Object.entries(COLUMNS).map(([field, column]) => [field, row[column]]));
const toRow = fields => Object.fromEntries(Object.entries(fields)
  .filter(([field]) => COLUMNS[field] && !['id', 'no', 'createdAt'].includes(field))   // these three are set by the database
  .map(([field, value]) => [COLUMNS[field], value]));

const OPEN = '(new,preparing,out,ready)';
const RECENT_DAYS = 45;   // the app loads open orders plus the last 45 days; the backup file has everything

/** Turns a database error into a sentence she can act on */
function friendly(error) {
  if (!navigator.onLine || /fetch|network/i.test(error.message)) return new Error('No internet connection. Nothing was changed; try again when you are back online.');
  if (/JWT|auth|permission|row-level/i.test(error.message)) return new Error('You were logged out. Please log in again.');
  return new Error(`The database said: ${error.message}`);
}

export function supabaseStore(url, key) {
  const db = createClient(url, key);
  const check = ({ data, error }) => { if (error) throw friendly(error); return data; };

  return {
    isDemo: false,
    async user() { return (await db.auth.getSession()).data.session?.user ?? null; },
    async logIn(email, password) {
      const { error } = await db.auth.signInWithPassword({ email, password });
      if (error) throw new Error(/invalid/i.test(error.message) ? 'That email and password don\'t match.' : friendly(error).message);
    },
    async logOut() { await db.auth.signOut(); },

    async list() {
      const since = new Date(Date.now() - RECENT_DAYS * 86_400_000).toISOString();
      return check(await db.from('orders').select('*').or(`created_at.gte.${since},status.in.${OPEN}`).order('created_at')).map(fromRow);
    },
    async listAll() { return check(await db.from('orders').select('*').order('created_at')).map(fromRow); },
    async get(id) {
      const row = check(await db.from('orders').select('*').eq('id', id).maybeSingle());
      return row ? fromRow(row) : null;
    },
    async create(fields) { return fromRow(check(await db.from('orders').insert(toRow({ ...fields, status: 'new' })).select().single())); },
    async update(id, changes) { return fromRow(check(await db.from('orders').update(toRow(changes)).eq('id', id).select().single())); },
  };
}
