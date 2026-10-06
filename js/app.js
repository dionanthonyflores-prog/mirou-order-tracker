// The order tracker's screens. Which screen shows depends on the part of the address after "#":
//   #/today             open orders and today's numbers (the home screen)
//   #/new               add an order
//   #/order/<id>        one order: status, payment, copy for driver, cancel
//   #/order/<id>/edit   change an order
import { DRINKS, SIZES, PAYMENT } from './menu.js';
import * as calc from './calc.js';
import { demoStore } from './store-demo.js';

// Phase 1 runs on demo data. "?empty" starts the demo with no orders (used by some tests).
const store = demoStore({ withSamples: !new URLSearchParams(location.search).has('empty') });

const $ = id => document.getElementById(id);
const main = $('main');
// Names, addresses and notes are typed by people, so they are always shown as text, never as code
const esc = text => String(text ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(message) {
  const t = $('toast');
  t.textContent = message;
  t.classList.add('show');
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => t.classList.remove('show'), 4000);
}

const timeFormat = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', hour: 'numeric', minute: '2-digit' });
const dayFormat = new Intl.DateTimeFormat('en-PH', { timeZone: 'Asia/Manila', month: 'short', day: 'numeric' });
const when = iso => (calc.manilaDay(iso) === calc.manilaDay(new Date()) ? '' : dayFormat.format(new Date(iso)) + ', ') + timeFormat.format(new Date(iso));

// ===== Moving between screens =====
let firstScreen = true;
async function route() {
  const hash = location.hash || '#/today';
  let match;
  if (hash === '#/new') renderForm(null);
  else if ((match = hash.match(/^#\/order\/([\w-]+)\/edit$/))) renderForm(await store.get(match[1]), match[1]);
  else if ((match = hash.match(/^#\/order\/([\w-]+)$/))) renderOrder(await store.get(match[1]), match[1]);
  else renderToday(await store.list());
  $('new-order').hidden = hash === '#/new';
  // On every new screen (not the first one), start at the top and move keyboard and screen-reader focus to its heading
  if (!firstScreen) { scrollTo(0, 0); main.querySelector('h1')?.focus(); }
  firstScreen = false;
}
addEventListener('hashchange', route);

// ===== Today =====
function orderCard(o) {
  const next = calc.nextStatus(o);
  return `<li class="card order" data-order="${o.no}">
    <a class="order-link" href="#/order/${esc(o.id)}">
      <span class="no">#${o.no}</span>
      <strong class="customer">${esc(o.customer)}</strong>
      <span class="status s-${o.status}">${calc.STATUS[o.status]}</span>
      <span class="items">${o.items.map(item => esc(calc.itemLabel(item))).join('<br>')}</span>
      <span class="meta">${o.how === 'delivery' ? '🛵 Delivery' : '🏠 Pick up'} · ${when(o.createdAt)} · <span class="money">${calc.peso(calc.orderTotal(o))}</span> ·
        ${o.paid ? `<span class="paid">Paid</span>` : `<span class="unpaid">Unpaid</span>`}</span>
    </a>
    ${next ? `<div class="next"><button type="button" class="btn small" data-next="${esc(o.id)}">${calc.ACTION[next]}</button></div>` : ''}
  </li>`;
}

function renderToday(orders) {
  const stats = calc.todayStats(orders);
  const today = calc.manilaDay(new Date());
  const open = orders.filter(calc.isOpen).sort((a, b) => a.createdAt.localeCompare(b.createdAt));   // oldest first: first in, first out
  const finished = orders.filter(o => !calc.isOpen(o) && calc.manilaDay(o.createdAt) === today).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  main.innerHTML = `
    <h1 tabindex="-1">Today</h1>
    <dl class="stats">
      <div><dt>Sales (drinks)</dt><dd id="stat-sales">${calc.peso(stats.sales)}</dd></div>
      <div><dt>To collect</dt><dd id="stat-unpaid">${calc.peso(stats.unpaid)}</dd></div>
      <div><dt>Cups</dt><dd id="stat-cups">${stats.cups}</dd></div>
      <div><dt>Open orders</dt><dd id="stat-open">${stats.open}</dd></div>
    </dl>
    <h2>To do (${open.length})</h2>
    ${open.length ? `<ul class="orders" id="open-orders">${open.map(orderCard).join('')}</ul>` : '<p class="empty">No open orders. Enjoy the quiet ✿</p>'}
    ${finished.length ? `<details class="finished"><summary>Finished or cancelled today (${finished.length})</summary>
      <ul class="orders" id="finished-orders">${finished.map(orderCard).join('')}</ul></details>` : ''}`;
}

// ===== One order =====
function renderOrder(o, id) {
  if (!o) {
    main.innerHTML = `<h1 tabindex="-1">Order not found</h1><p>It may have been made in another browser. <a href="#/today">Back to Today</a></p>`;
    return;
  }
  const next = calc.nextStatus(o);
  const steps = o.status === 'cancelled' ? ['cancelled'] : ['new', 'preparing', o.how === 'delivery' ? 'out' : 'ready', 'done'];
  const nowAt = steps.indexOf(o.status);
  main.innerHTML = `
    <p class="back"><a href="#/today">← Today</a></p>
    <h1 tabindex="-1">Order #${o.no} <span class="status s-${o.status}" id="order-status">${calc.STATUS[o.status]}</span></h1>
    <section class="card">
      <p style="margin:0"><strong id="order-customer">${esc(o.customer)}</strong>${o.contact ? ` · <a href="tel:${esc(o.contact.replace(/[^\d+]/g, ''))}">${esc(o.contact)}</a>` : ''}</p>
      <p style="margin:4px 0">${o.how === 'delivery' ? `🛵 Delivery to <span id="order-address">${esc(o.address)}</span>` : '🏠 Pick up'}</p>
      <p class="muted" style="margin:0">Ordered ${when(o.createdAt)}</p>
      <ul class="lines" id="order-lines">${o.items.map(item =>
        `<li><span>${esc(calc.itemLabel(item))}</span><span class="money">${calc.peso(calc.lineTotal(item))}</span></li>`).join('')}</ul>
      <dl class="sum">
        <div><dt>Drinks</dt><dd>${calc.peso(calc.drinksTotal(o))}</dd></div>
        ${o.how === 'delivery' ? `<div><dt>Delivery fee</dt><dd>${calc.peso(calc.deliveryFee(o))}</dd></div>` : ''}
        <div class="grand"><dt>Total</dt><dd id="order-total">${calc.peso(calc.orderTotal(o))}</dd></div>
      </dl>
      ${o.notes ? `<p style="margin:10px 0 0"><strong>Notes:</strong> ${esc(o.notes)}</p>` : ''}
    </section>

    <section class="card" aria-labelledby="status-h">
      <h2 id="status-h">Status</h2>
      <ol class="steps">${steps.map((s, i) => `<li class="${i < nowAt ? 'past' : i === nowAt ? 'now' : ''}"${i === nowAt ? ' aria-current="step"' : ''}>${calc.STATUS[s]}</li>`).join('')}</ol>
      ${next ? `<button type="button" class="btn wide" data-next="${esc(o.id)}">${calc.ACTION[next]}</button>` : ''}
    </section>

    <section class="card" aria-labelledby="pay-h">
      <h2 id="pay-h">Payment</h2>
      ${o.paid
        ? `<p class="paid" id="payment-state">Paid by ${PAYMENT[o.paidBy]}</p><button type="button" class="link-btn" data-unpay="${esc(o.id)}">Mark as not paid</button>`
        : `<p id="payment-state"><span class="unpaid">Not paid yet</span> · <span class="money">${calc.peso(calc.amountToCollect(o))}</span> to collect</p>
           <p class="muted" style="margin:0 0 8px">Mark it paid by:</p>
           <div class="pay-buttons">${Object.entries(PAYMENT).map(([key, label]) =>
             `<button type="button" class="btn ghost small" data-pay="${key}" data-id="${esc(o.id)}">${label}</button>`).join('')}</div>`}
    </section>

    ${o.how === 'delivery' ? `<section class="card" aria-labelledby="driver-h">
      <h2 id="driver-h">For the driver</h2>
      <button type="button" class="btn wide" id="copy-driver" data-id="${esc(o.id)}">Copy for driver</button>
      <pre class="driver-preview" id="driver-message">${esc(calc.driverMessage(o))}</pre>
    </section>` : ''}

    <div class="actions">
      <a class="btn ghost" href="#/order/${esc(id)}/edit">Edit order</a>
      ${calc.isOpen(o) ? `<button type="button" class="link-btn danger" id="cancel-order">Cancel order</button>
      <div class="confirm" id="confirm-cancel" hidden>
        <p>Cancel order #${o.no} for ${esc(o.customer)}? It stays in the list as cancelled and is left out of the sales.</p>
        <button type="button" class="btn small danger-btn" data-cancel="${esc(o.id)}">Yes, cancel it</button>
        <button type="button" class="link-btn" id="keep-order">Keep the order</button>
      </div>` : ''}
    </div>`;
}

// ===== Buttons on Today and on an order =====
// A quick double tap must not move an order two steps, so status buttons ignore taps for a moment after one is used
let quietUntil = 0;
main.addEventListener('click', async e => {
  const b = e.target.closest('button');
  if (!b) return;
  if (b.dataset.next) {
    if (performance.now() < quietUntil) return;
    quietUntil = performance.now() + 700;
    const o = await store.get(b.dataset.next);
    const status = calc.nextStatus(o);
    if (!status) return;
    await store.update(o.id, { status });
    toast(`Order #${o.no}: ${calc.STATUS[status]}`);
    route();
  } else if (b.dataset.pay) {
    const o = await store.update(b.dataset.id, { paid: true, paidBy: b.dataset.pay });
    toast(`Order #${o.no} paid by ${PAYMENT[o.paidBy]}`);
    route();
  } else if (b.dataset.unpay) {
    const o = await store.update(b.dataset.unpay, { paid: false, paidBy: null });
    toast(`Order #${o.no} marked as not paid`);
    route();
  } else if (b.id === 'copy-driver') {
    const text = calc.driverMessage(await store.get(b.dataset.id));
    try {
      await navigator.clipboard.writeText(text);
      toast("Copied. Paste it in the driver's chat.");
    } catch {
      // No clipboard permission: select the message so she can copy it herself
      getSelection().selectAllChildren($('driver-message'));
      toast('Press and hold the selected text to copy it.');
    }
  } else if (b.id === 'cancel-order') {
    $('confirm-cancel').hidden = false;
    b.hidden = true;
  } else if (b.id === 'keep-order') {
    $('confirm-cancel').hidden = true;
    $('cancel-order').hidden = false;
  } else if (b.dataset.cancel) {
    const o = await store.update(b.dataset.cancel, { status: 'cancelled' });
    toast(`Order #${o.no} cancelled`);
    location.hash = '#/today';
  }
});

// ===== New order and Edit order =====
function renderForm(existing, id) {
  if (id && !existing) { renderOrder(null); return; }
  const draft = existing
    ? structuredClone(existing)
    : { customer: '', contact: '', how: 'pickup', address: '', deliveryFee: 0, notes: '', paid: false, paidBy: null, items: [] };
  const pick = { size: '12oz', oat: false, qty: 1 };
  const drinkOptions = type => DRINKS.filter(d => d.type === type)
    .map(d => `<option value="${esc(d.name)}">${esc(d.name)} · ${calc.peso(d.price)}</option>`).join('');
  const radio = (name, value, label, checked) =>
    `<label><input type="radio" name="${name}" value="${value}"${checked ? ' checked' : ''}><span>${label}</span></label>`;

  main.innerHTML = `
    <p class="back"><a href="${existing ? `#/order/${esc(id)}` : '#/today'}">← Back without saving</a></p>
    <h1 tabindex="-1">${existing ? `Edit order #${existing.no}` : 'New order'}</h1>
    <form id="order-form" novalidate>
      <section class="card" aria-labelledby="drinks-h">
        <h2 id="drinks-h">Drinks</h2>
        <label class="field">Drink
          <select id="pick-drink"><optgroup label="Matcha">${drinkOptions('matcha')}</optgroup><optgroup label="Hojicha">${drinkOptions('hojicha')}</optgroup></select>
        </label>
        <fieldset class="seg"><legend>Size</legend>
          ${SIZES.map((s, i) => radio('pick-size', s.id, `${s.label}${s.extra ? ` <em>+${calc.peso(s.extra)}</em>` : ''}`, i === 0)).join('')}
        </fieldset>
        <fieldset class="seg"><legend>Milk</legend>
          ${radio('pick-milk', 'regular', 'Regular', true)}${radio('pick-milk', 'oat', 'Oatmilk <em>+₱10</em>', false)}
        </fieldset>
        <div class="add-row">
          <div class="qty">
            <button type="button" data-step="-1" aria-label="One less">−</button>
            <input id="pick-qty" type="text" inputmode="numeric" maxlength="2" value="1" aria-label="How many cups" autocomplete="off">
            <button type="button" data-step="1" aria-label="One more">+</button>
          </div>
          <button type="button" class="btn" id="add-line"></button>
        </div>
        <ul class="lines" id="form-lines" aria-live="polite"></ul>
      </section>

      <section class="card" aria-labelledby="customer-h">
        <h2 id="customer-h">Customer</h2>
        <label class="field">Name <input name="customer" autocomplete="off" value="${esc(draft.customer)}"></label>
        <label class="field">Contact number <small>(optional, for the driver)</small>
          <input name="contact" type="tel" autocomplete="off" value="${esc(draft.contact)}"></label>
      </section>

      <section class="card">
        <fieldset class="seg"><legend>Pick up or delivery</legend>
          ${radio('how', 'pickup', '🏠 Pick up', draft.how === 'pickup')}${radio('how', 'delivery', '🛵 Delivery', draft.how === 'delivery')}
        </fieldset>
        <div id="delivery-fields">
          <label class="field">Address <textarea name="address" rows="2">${esc(draft.address)}</textarea></label>
          <label class="field">Delivery fee (₱) <input name="deliveryFee" type="text" inputmode="numeric" maxlength="4" autocomplete="off" value="${draft.deliveryFee || 0}"></label>
        </div>
        <label class="field">Notes <small>(optional)</small> <textarea name="notes" rows="2">${esc(draft.notes)}</textarea></label>
      </section>

      <section class="card">
        <fieldset class="seg"><legend>Paid?</legend>
          ${radio('paidBy', '', 'Not yet', !draft.paid)}${Object.entries(PAYMENT).map(([key, label]) => radio('paidBy', key, label, draft.paid && draft.paidBy === key)).join('')}
        </fieldset>
      </section>

      <div class="save-bar">
        <p class="total">Total <strong id="form-total"></strong></p>
        <ul class="problems" id="problems" role="alert"></ul>
        <button class="btn wide" type="submit">${existing ? 'Save changes' : 'Save order'}</button>
      </div>
    </form>`;

  const form = $('order-form');
  const qtyBox = $('pick-qty');

  // Read the customer, delivery and payment boxes into the draft
  function readFields() {
    const f = new FormData(form);
    draft.customer = f.get('customer');
    draft.contact = f.get('contact').trim();
    draft.how = f.get('how');
    draft.address = f.get('address');
    draft.deliveryFee = parseInt(f.get('deliveryFee')) || 0;
    draft.notes = f.get('notes').trim();
    draft.paidBy = f.get('paidBy') || null;
    draft.paid = !!draft.paidBy;
  }

  function show() {
    readFields();
    const price = calc.unitPrice($('pick-drink').value, pick.size, pick.oat);
    $('add-line').textContent = `Add · ${calc.peso(price * pick.qty)}`;
    qtyBox.value = pick.qty;
    $('form-lines').innerHTML = draft.items.length
      ? draft.items.map((item, i) => `<li><span>${esc(calc.itemLabel(item))}</span><span class="money">${calc.peso(calc.lineTotal(item))}</span>
          <button type="button" class="remove" data-remove="${i}" aria-label="Remove ${esc(calc.itemLabel(item))}">×</button></li>`).join('')
      : '<li class="muted">No drinks yet</li>';
    $('delivery-fields').hidden = draft.how !== 'delivery';
    $('form-total').textContent = calc.peso(calc.orderTotal(draft));
  }

  form.addEventListener('change', e => {
    if (e.target.name === 'pick-size') pick.size = e.target.value;
    if (e.target.name === 'pick-milk') pick.oat = e.target.value === 'oat';
    if (e.target === qtyBox) pick.qty = calc.toQty(qtyBox.value);
    show();
  });
  form.addEventListener('input', e => {
    if (e.target === qtyBox) {
      qtyBox.value = qtyBox.value.replace(/\D/g, '').slice(0, 2);
      if (qtyBox.value) { pick.qty = calc.toQty(qtyBox.value); $('add-line').textContent = `Add · ${calc.peso(calc.unitPrice($('pick-drink').value, pick.size, pick.oat) * pick.qty)}`; }
      return;
    }
    if (e.target.name === 'deliveryFee') e.target.value = e.target.value.replace(/\D/g, '');
    readFields();
    $('form-total').textContent = calc.peso(calc.orderTotal(draft));
  });
  qtyBox.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); qtyBox.blur(); } });

  form.addEventListener('click', e => {
    const b = e.target.closest('button');
    if (!b) return;
    if (b.dataset.step) { pick.qty = calc.toQty(pick.qty + Number(b.dataset.step)); show(); }
    else if (b.id === 'add-line') {
      const drink = $('pick-drink').value;
      const same = draft.items.find(item => item.drink === drink && item.size === pick.size && item.oat === pick.oat);
      if (same) same.qty = Math.min(99, same.qty + pick.qty);   // the same drink, size and milk join one line
      else draft.items.push({ drink, size: pick.size, oat: pick.oat, qty: pick.qty, unitPrice: calc.unitPrice(drink, pick.size, pick.oat) });
      pick.qty = 1;
      show();
    } else if (b.dataset.remove) {
      draft.items.splice(Number(b.dataset.remove), 1);
      show();
    }
  });

  form.addEventListener('submit', async e => {
    e.preventDefault();
    readFields();
    const problems = calc.problemsWith(draft);
    $('problems').innerHTML = problems.map(p => `<li>${esc(p)}</li>`).join('');
    if (problems.length) return;
    const fields = {
      customer: draft.customer.trim(), contact: draft.contact, how: draft.how,
      address: draft.how === 'delivery' ? draft.address.trim() : '',
      deliveryFee: draft.how === 'delivery' ? draft.deliveryFee : 0,
      notes: draft.notes, paid: draft.paid, paidBy: draft.paidBy, items: draft.items,
    };
    if (existing) {
      await store.update(id, { ...fields, status: calc.statusForHow(existing.status, fields.how) });
      toast(`Changes to order #${existing.no} saved`);
      location.hash = `#/order/${id}`;
    } else {
      const o = await store.create(fields);
      toast(`Order #${o.no} saved`);
      location.hash = '#/today';
    }
  });

  show();
}

// ===== Start =====
if (store.isDemo) {
  $('demo-banner').hidden = false;
  $('reset-demo').addEventListener('click', async () => { await store.reset(); toast('The demo started over'); location.hash = '#/today'; route(); });
}
route();
