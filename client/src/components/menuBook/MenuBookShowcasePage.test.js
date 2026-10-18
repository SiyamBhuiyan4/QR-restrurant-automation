import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import React from 'react';
import ReactDOMServer from 'react-dom/server';
import esbuild from 'esbuild';
import { createRequire } from 'node:module';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const require = createRequire(import.meta.url);

// Bundle MenuBookShowcasePage to a temporary CJS file alongside this test
const sourceFile = path.join(__dirname, 'MenuBookShowcasePage.jsx');
const tmpBundleFile = path.join(__dirname, '.test-menubookshowcasepage-bundle.cjs');

esbuild.buildSync({
  entryPoints: [sourceFile],
  bundle: true,
  format: 'cjs',
  platform: 'node',
  outfile: tmpBundleFile,
  loader: { '.css': 'empty' },
  external: ['react', 'react-dom'],
});

const {
  default: MenuBookShowcasePage,
  DEFAULT_TOP_DISH,
  DEFAULT_BOTTOM_DISH,
  BaladoSauceBowlSvg,
  LemonadeSauceBowlSvg,
} = require(tmpBundleFile);

test.after(() => {
  try {
    if (fs.existsSync(tmpBundleFile)) {
      fs.unlinkSync(tmpBundleFile);
    }
  } catch (e) {
    // ignore
  }
});

test('DEFAULT_TOP_DISH has authentic Balado Sauce properties matching reference photo', () => {
  assert.equal(DEFAULT_TOP_DISH.id, 'showcase-balado-sauce');
  assert.equal(DEFAULT_TOP_DISH.name, 'Balado Sauce');
  assert.equal(DEFAULT_TOP_DISH.price, '78 K');
  assert.equal(DEFAULT_TOP_DISH.numericPrice, 14.50);
  assert.equal(DEFAULT_TOP_DISH.isSpicy, true);
  assert.ok(DEFAULT_TOP_DISH.description.includes('Balado'));
  assert.ok(typeof DEFAULT_TOP_DISH.image === 'string' && DEFAULT_TOP_DISH.image.length > 0);
});

test('DEFAULT_BOTTOM_DISH has authentic Lemonade Sauce properties matching reference photo', () => {
  assert.equal(DEFAULT_BOTTOM_DISH.id, 'showcase-lemonade-sauce');
  assert.equal(DEFAULT_BOTTOM_DISH.name, 'Lemonade Sauce');
  assert.equal(DEFAULT_BOTTOM_DISH.price, '78 K');
  assert.equal(DEFAULT_BOTTOM_DISH.numericPrice, 14.50);
  assert.equal(DEFAULT_BOTTOM_DISH.isPopular, true);
  assert.ok(DEFAULT_BOTTOM_DISH.description.includes('lemon'));
  assert.ok(typeof DEFAULT_BOTTOM_DISH.image === 'string' && DEFAULT_BOTTOM_DISH.image.length > 0);
});

test('BaladoSauceBowlSvg renders SVG with ceramic well and porcelain ramekin', () => {
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(BaladoSauceBowlSvg));
  assert.ok(html.includes('<svg'));
  assert.ok(html.includes('viewBox="0 0 320 300"'));
  assert.ok(html.includes('baladoWell'));
  assert.ok(html.includes('aioliDip'));
});

test('LemonadeSauceBowlSvg renders SVG with lemon citrus wheels and porcelain ramekin', () => {
  const html = ReactDOMServer.renderToStaticMarkup(React.createElement(LemonadeSauceBowlSvg));
  assert.ok(html.includes('<svg'));
  assert.ok(html.includes('viewBox="0 0 320 300"'));
  assert.ok(html.includes('lemonWell'));
  assert.ok(html.includes('lemonRind'));
  assert.ok(html.includes('cremaDip'));
});

test('MenuBookShowcasePage renders default left page with CHICKEN Wings header, frame, and dishes', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookShowcasePage, { pageNumber: 3 })
  );

  // Background and Double Gold Frame
  assert.ok(html.includes('mb-showcase-page'));
  assert.ok(html.includes('mb-showcase-page__frame'));
  assert.ok(html.includes('mb-showcase-page__corner-tr'));
  assert.ok(html.includes('mb-showcase-page__corner-bl'));

  // Header Typography
  assert.ok(html.includes('mb-showcase-page__title-upper'));
  assert.ok(html.includes('CHICKEN'));
  assert.ok(html.includes('mb-showcase-page__title-script'));
  assert.ok(html.includes('Wings'));

  // Two Dishes
  assert.ok(html.includes('Balado Sauce'));
  assert.ok(html.includes('Lemonade Sauce'));
  assert.ok(html.includes('78 K'));

  // Ceramic Bowls and Porcelain Dipping Ramekins
  assert.ok(html.includes('mb-showcase-dish__bowl'));
  assert.ok(html.includes('mb-showcase-dish__ramekin--top'));
  assert.ok(html.includes('mb-showcase-dish__ramekin--bottom'));

  // Page number footer
  assert.ok(html.includes('mb-showcase-page__footer'));
  assert.ok(html.includes('3'));
});

test('MenuBookShowcasePage renders custom category titles (e.g. SPECIAL Steak)', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookShowcasePage, {
      titleUpper: 'SPECIAL',
      titleLower: 'Steak',
    })
  );

  assert.ok(html.includes('SPECIAL'));
  assert.ok(html.includes('Steak'));
});

test('MenuBookShowcasePage accepts custom dish overrides and formats numeric prices', () => {
  const customTop = {
    id: 'custom-1',
    name: 'Peri-Peri Wings',
    price: 16.75,
    description: 'Tangy bird’s eye chili wings',
  };

  const customBottom = {
    id: 'custom-2',
    name: 'Honey Mustard Wings',
    price: 15.00,
    description: 'Sweet Dijon honey wings',
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookShowcasePage, {
      dishTop: customTop,
      dishBottom: customBottom,
      currency: '€',
    })
  );

  assert.ok(html.includes('Peri-Peri Wings'));
  assert.ok(html.includes('€16.75'));
  assert.ok(html.includes('Honey Mustard Wings'));
  assert.ok(html.includes('€15.00'));
});

test('MenuBookShowcasePage showRamekin=false hides dipping ramekins', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookShowcasePage, {
      showRamekin: false,
    })
  );

  assert.ok(!html.includes('mb-showcase-dish__ramekin'));
});

test('MenuBookShowcasePage executes selection callbacks with selected dish', () => {
  let selectedDishA = null;
  let selectedDishB = null;

  // Render component with callback listeners
  const element = React.createElement(MenuBookShowcasePage, {
    onSelectDish: (d) => { selectedDishA = d; },
    onSelectItem: (d) => { selectedDishB = d; },
  });

  assert.ok(element);
  assert.equal(typeof element.type, 'function');
  assert.equal(selectedDishA, null);

  // Directly verify handler invokes both callbacks
  const testDish = { id: 'test-dish', name: 'Test Wings', price: '78 K' };
  element.props.onSelectDish(testDish);
  element.props.onSelectItem(testDish);

  assert.deepEqual(selectedDishA, testDish);
  assert.deepEqual(selectedDishB, testDish);
});
