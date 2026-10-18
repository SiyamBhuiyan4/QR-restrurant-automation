import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildSpreads,
  pageCountOf,
  findPageForItem,
  getSectionPageNumber,
} from './buildSpreads.js';

const SAMPLE_SECTIONS = [
  {
    key: 'starters',
    title: 'APPETIZERS',
    items: [
      { id: 'starter-balado-wings', name: 'Balado Sauce Wings', price: 14.50 },
      { id: 'starter-lemonade-wings', name: 'Lemonade Sauce Wings', price: 14.50 },
      { id: 'starter-1', name: 'Truffle Parmesan Fries', price: 7.99 },
      { id: 'starter-2', name: 'Spicy Buffalo Wings', price: 10.99 },
    ],
  },
  {
    key: 'mains',
    title: 'SPECIAL STEAK',
    items: [
      { id: 'main-1', name: 'Grilled Ribeye Steak', price: 24.99 },
      { id: 'main-2', name: 'Peri-Peri Grilled Chicken', price: 17.50 },
    ],
  },
  {
    key: 'beverages',
    title: 'BEVERAGES',
    items: [
      { id: 'cocktail-mojito', name: 'Mojito', subType: 'cocktail', price: 12.00 },
      { id: 'mocktail-virgin-mojito', name: 'Virgin Mojito', subType: 'mocktail', price: 8.50 },
    ],
  },
  {
    key: 'desserts',
    title: 'DESSERTS',
    items: [
      { id: 'dessert-souffle', name: 'Chocolate Soufflé', price: 9.50 },
      { id: 'dessert-1', name: 'Molten Lava Cake', price: 8.50 },
    ],
  },
];

test('buildSpreads pairs overview pages into Spread 0', () => {
  const spreads = buildSpreads(SAMPLE_SECTIONS);
  assert.ok(spreads.length >= 2);
  assert.equal(spreads[0].left.type, 'overview');
  assert.equal(spreads[0].left.index, 1);
  assert.equal(spreads[0].right.type, 'overview');
  assert.equal(spreads[0].right.index, 2);
});

test('buildSpreads inserts signature showcase spread at Spread 1 matching reference photo', () => {
  const spreads = buildSpreads(SAMPLE_SECTIONS);
  const spread1 = spreads[1];
  assert.ok(spread1, 'Spread 1 must exist');

  // Left page: Chicken Wings showcase
  assert.equal(spread1.left.type, 'showcase');
  assert.equal(spread1.left.pageNumber, 3);
  assert.equal(spread1.left.titleUpper, 'CHICKEN');
  assert.equal(spread1.left.titleLower, 'Wings');
  assert.ok(spread1.left.dishTop, 'dishTop must be populated');
  assert.equal(spread1.left.dishTop.id, 'starter-balado-wings');
  assert.ok(spread1.left.dishBottom, 'dishBottom must be populated');
  assert.equal(spread1.left.dishBottom.id, 'starter-lemonade-wings');

  // Right page: Drinks & Dessert
  assert.equal(spread1.right.type, 'drinksDessert');
  assert.equal(spread1.right.pageNumber, 4);
  assert.equal(spread1.right.sectionTitle, 'DRINKS & DESSERT');
  assert.ok(Array.isArray(spread1.right.cocktails));
  assert.ok(Array.isArray(spread1.right.mocktails));
  assert.ok(Array.isArray(spread1.right.desserts));
});

test('findPageForItem locates dishes across showcase, drinksDessert, and items pages', () => {
  const spreads = buildSpreads(SAMPLE_SECTIONS);

  // Dishes on showcase page (Spread 1, left)
  assert.equal(findPageForItem(spreads, 'starter-balado-wings'), 1);
  assert.equal(findPageForItem(spreads, 'starter-lemonade-wings'), 1);

  // Drink on drinksDessert page (Spread 1, right)
  assert.equal(findPageForItem(spreads, 'cocktail-mojito'), 1);
  assert.equal(findPageForItem(spreads, 'mocktail-virgin-mojito'), 1);

  // Steak on items page (Spread 2)
  const steakSpread = findPageForItem(spreads, 'main-1');
  assert.ok(steakSpread >= 2);
});

test('getSectionPageNumber returns starting page number for categories', () => {
  const spreads = buildSpreads(SAMPLE_SECTIONS);

  const startersPage = getSectionPageNumber(SAMPLE_SECTIONS[0], spreads, SAMPLE_SECTIONS);
  assert.equal(startersPage, 3);

  const beveragesPage = getSectionPageNumber(SAMPLE_SECTIONS[2], spreads, SAMPLE_SECTIONS);
  assert.equal(beveragesPage, 4);
});

test('pageCountOf correctly counts pages excluding padding', () => {
  const spreads = buildSpreads(SAMPLE_SECTIONS);
  const count = pageCountOf(spreads);
  assert.ok(count >= 5);
});
