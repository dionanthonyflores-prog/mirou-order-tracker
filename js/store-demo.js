// Demo storage: made-up orders, saved only in this browser (localStorage).
// It is used for the public demo and for the automated tests. The real app will offer the same
// functions (list, get, create, update), backed by her private Supabase database instead.
import { unitPrice } from './calc.js';

const KEY = 'mirou-tracker-demo';

// Sample orders, timed relative to "now" so the demo always has something for today.
// The names, addresses and numbers are made up.
function sampleOrders(now) {
  const minutesAgo = m => new Date(now - m * 60_000).toISOString();
  const item = (drink, size, oat, qty) => ({ drink, size, oat, qty, unitPrice: unitPrice(drink, size, oat) });
  const base = { contact: '', address: '', deliveryFee: 0, notes: '', paid: false, paidBy: null };
  return [
    { ...base, id: 'demo-101', no: 101, createdAt: minutesAgo(26 * 60), customer: 'Bea S.', how: 'pickup', status: 'done', paid: true, paidBy: 'cash',
      items: [item('Hojicha latte', '12oz', false, 2)] },
    { ...base, id: 'demo-102', no: 102, createdAt: minutesAgo(25 * 60), customer: 'Josh T.', how: 'delivery', address: '7 Sample Rd., Calamba', deliveryFee: 60,
      status: 'done', paid: true, paidBy: 'gcash', items: [item('Vanilla Crunch', '16oz', false, 3)] },
    { ...base, id: 'demo-103', no: 103, createdAt: minutesAgo(150), customer: 'Ana R.', how: 'pickup', status: 'done', paid: true, paidBy: 'gcash',
      items: [item('Matcha latte', '12oz', true, 1), item('Seasalt Matcha', '16oz', false, 1)] },
    { ...base, id: 'demo-104', no: 104, createdAt: minutesAgo(70), customer: 'Paolo M.', contact: '0900 000 0001', how: 'delivery',
      address: '12 Sample St., Bay', deliveryFee: 50, notes: 'Gate is blue', status: 'out',
      items: [item('Matcha latte', '16oz', true, 2), item('Hor-jicha', '12oz', false, 1)] },
    { ...base, id: 'demo-105', no: 105, createdAt: minutesAgo(35), customer: 'Kim D.', how: 'pickup', status: 'preparing', paid: true, paidBy: 'bank',
      items: [item('Earl Grey latte', '12oz', false, 1)] },
    { ...base, id: 'demo-106', no: 106, createdAt: minutesAgo(12), customer: 'Mika L.', contact: '0900 000 0002', how: 'delivery',
      address: '3 Example Ave., Los Baños', deliveryFee: 80, status: 'new',
      items: [item('Toasted Milk Cereal', '16oz', false, 2), item('Seasalt Hojicha', '12oz', true, 2)] },
  ];
}

/**
 * @param {object} options
 * @param {boolean} options.withSamples start with the sample orders (false = an empty shop, used by some tests)
 */
export function demoStore({ withSamples = true } = {}) {
  const load = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(KEY));
      if (Array.isArray(saved)) return saved;
    } catch { /* damaged or missing data: start again below */ }
    const fresh = withSamples ? sampleOrders(Date.now()) : [];
    save(fresh);
    return fresh;
  };
  const save = orders => { try { localStorage.setItem(KEY, JSON.stringify(orders)); } catch { /* private mode: keep going */ } };

  return {
    isDemo: true,
    async list() { return load(); },
    async get(id) { return load().find(o => o.id === id) ?? null; },
    async create(fields) {
      const orders = load();
      const order = {
        ...fields,
        id: crypto.randomUUID(),
        no: Math.max(100, ...orders.map(o => o.no)) + 1,
        createdAt: new Date().toISOString(),
        status: 'new',
      };
      save([...orders, order]);
      return order;
    },
    async update(id, changes) {
      const orders = load();
      const i = orders.findIndex(o => o.id === id);
      if (i < 0) throw new Error('That order was not found.');
      orders[i] = { ...orders[i], ...changes, id, no: orders[i].no, createdAt: orders[i].createdAt };
      save(orders);
      return orders[i];
    },
    async reset() { localStorage.removeItem(KEY); return load(); },
  };
}
