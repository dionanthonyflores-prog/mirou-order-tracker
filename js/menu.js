// The menu, in one place: the same drinks and prices as the mirou matcha website.
// type = which powder the drink uses (used by the stock reminder in phase 2).
export const DRINKS = [
  { name: 'Matcha latte', price: 160, type: 'matcha' },
  { name: 'Seasalt Matcha', price: 170, type: 'matcha' },
  { name: 'Earl Grey latte', price: 200, type: 'matcha' },
  { name: 'Toasted Milk Cereal', price: 210, type: 'matcha' },
  { name: 'Vanilla Crunch', price: 195, type: 'matcha' },
  { name: 'Caramiso latte', price: 200, type: 'matcha' },
  { name: 'Hojicha latte', price: 150, type: 'hojicha' },
  { name: 'Seasalt Hojicha', price: 160, type: 'hojicha' },
  { name: 'Hor-jicha', price: 200, type: 'hojicha' },
  { name: 'Vanilla Crunch Hojicha', price: 195, type: 'hojicha' },
];

// Cup sizes. The menu prices are for 12 oz; the 16 oz upsize costs more.
// grams = powder per cup (matcha or hojicha), for the stock reminder in phase 2.
export const SIZES = [
  { id: '12oz', label: '12 oz', extra: 0, grams: 4 },
  { id: '16oz', label: '16 oz', extra: 35, grams: 5.5 },
];

export const OAT_EXTRA = 10;   // oatmilk instead of regular milk

export const PAYMENT = { cash: 'Cash', gcash: 'GCash', bank: 'Bank transfer' };
