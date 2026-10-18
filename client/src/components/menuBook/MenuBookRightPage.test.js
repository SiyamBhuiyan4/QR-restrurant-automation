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

// Bundle MenuBookRightPage to a temporary CJS file alongside this test
const sourceFile = path.join(__dirname, 'MenuBookRightPage.jsx');
const tmpBundleFile = path.join(__dirname, '.test-menubookrightpage-bundle.cjs');

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
  default: MenuBookRightPage,
  DEFAULT_COCKTAILS,
  DEFAULT_MOCKTAILS,
  DEFAULT_DESSERTS,
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

test('MenuBookRightPage exports required component and default datasets', () => {
  assert.equal(typeof MenuBookRightPage, 'function', 'Default export must be a React component function');
  assert.ok(Array.isArray(DEFAULT_COCKTAILS), 'DEFAULT_COCKTAILS must be an array');
  assert.ok(Array.isArray(DEFAULT_MOCKTAILS), 'DEFAULT_MOCKTAILS must be an array');
  assert.ok(Array.isArray(DEFAULT_DESSERTS), 'DEFAULT_DESSERTS must be an array');
  assert.ok(DEFAULT_COCKTAILS.length >= 5, 'Must contain at least 5 classic cocktails');
  assert.ok(DEFAULT_MOCKTAILS.length >= 3, 'Must contain at least 3 mocktails');
  assert.ok(DEFAULT_DESSERTS.length >= 5, 'Must contain at least 5 desserts');
});

test('Top bracketed header renders [ DRINKS & DESSERT ] with gold bracket styling', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookRightPage)
  );

  assert.ok(html.includes('mb-drinks-bracket-header'), 'Must contain bracket header container');
  assert.ok(html.includes('mb-drinks-bracket--left'), 'Must contain left bracket element');
  assert.ok(html.includes('mb-drinks-bracket--right'), 'Must contain right bracket element');
  assert.ok(html.includes('DRINKS &amp;') || html.includes('DRINKS &'), 'Must display "DRINKS &"');
  assert.ok(html.includes('DESSERT'), 'Must display "DESSERT"');
  assert.ok(html.includes('✦'), 'Must display ornamental star/diamond rule accent');
});

test('Section 1 renders CLASSIC COCKTAIL with proper items and prices', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookRightPage, { currencyMode: 'both' })
  );

  assert.ok(html.includes('CLASSIC COCKTAIL'), 'Must render CLASSIC COCKTAIL subheader');
  assert.ok(html.includes('Mojito'), 'Must include Mojito');
  assert.ok(html.includes('105 K / $14'), 'Must format Mojito price as 105 K / $14');
  assert.ok(html.includes('Old Fashioned'), 'Must include Old Fashioned');
  assert.ok(html.includes('115 K / $15'), 'Must format Old Fashioned price as 115 K / $15');
  assert.ok(html.includes('Espresso Martini'), 'Must include Espresso Martini');
  assert.ok(html.includes('Gin Tonic'), 'Must include Gin Tonic');
  assert.ok(html.includes('Negroni'), 'Must include Negroni');
  assert.ok(html.includes('mb-drinks-item-leader'), 'Must include dotted leader linking name to price');
});

test('Section 2 renders MOCKTAIL with delicate chalk SVG illustration of cocktail glass', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookRightPage)
  );

  assert.ok(html.includes('MOCKTAIL'), 'Must render MOCKTAIL subheader');
  assert.ok(html.includes('Virgin Mojito'), 'Must include Virgin Mojito');
  assert.ok(html.includes('55 K'), 'Must include Virgin Mojito 55 K price');
  assert.ok(html.includes('Citrus Cooler'), 'Must include Citrus Cooler');
  assert.ok(html.includes('52 K'), 'Must include Citrus Cooler 52 K price');
  assert.ok(html.includes('Berry Fizz'), 'Must include Berry Fizz');
  assert.ok(html.includes('58 K'), 'Must include Berry Fizz 58 K price');

  // Verify chalk line art SVG illustration
  assert.ok(html.includes('mb-drinks-chalk-illustration'), 'Must include chalk illustration container');
  assert.ok(html.includes('mb-drinks-chalk-svg'), 'Must include chalk SVG');
  assert.ok(html.includes('mbChalkGlow'), 'Must include chalk glow filter definition');
  // Check lime wheel spokes and straw in SVG
  assert.ok(html.includes('ellipse'), 'Must include glass rim ellipse');
  assert.ok(html.includes('circle'), 'Must include lime wheel circles and bubbles');
});

test('Section 3 renders DESSERTS in a clean 2-column layout', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookRightPage)
  );

  assert.ok(html.includes('DESSERTS'), 'Must render DESSERTS subheader');
  assert.ok(html.includes('mb-drinks-desserts-grid'), 'Must include 2-column desserts grid container');
  assert.ok(html.includes('mb-drinks-desserts-col'), 'Must include dessert column elements');

  // Column 1 western desserts
  assert.ok(html.includes('Chocolate Soufflé'), 'Must include Chocolate Soufflé');
  assert.ok(html.includes('35 K'), 'Must include Souffle 35 K price');
  assert.ok(html.includes('Molten Lava Cake'), 'Must include Molten Lava Cake');
  assert.ok(html.includes('House Tiramisu'), 'Must include House Tiramisu');
  assert.ok(html.includes('Churros'), 'Must include Churros');
  assert.ok(html.includes('Panna Cotta'), 'Must include Panna Cotta');

  // Column 2 authentic Indonesian banana desserts from photo
  assert.ok(html.includes('Pisang Goreng'), 'Must include Pisang Goreng');
  assert.ok(html.includes('Pisang Keju'), 'Must include Pisang Keju');
  assert.ok(html.includes('Pisang Caramel'), 'Must include Pisang Caramel');
  assert.ok(html.includes('Pisang Coklat'), 'Must include Pisang Coklat');
});

test('Double gold keyline border and corner flourishes render properly', () => {
  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookRightPage)
  );

  assert.ok(html.includes('mb-drinks-frame'), 'Must contain frame with double gold keyline border');
  assert.ok(html.includes('mb-drinks-corner--tl'), 'Must contain top-left corner flourish');
  assert.ok(html.includes('mb-drinks-corner--tr'), 'Must contain top-right corner flourish');
  assert.ok(html.includes('mb-drinks-corner--bl'), 'Must contain bottom-left corner flourish');
  assert.ok(html.includes('mb-drinks-corner--br'), 'Must contain bottom-right corner flourish');
});

test('Currency modes format prices correctly', () => {
  const htmlK = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookRightPage, { currencyMode: 'K' })
  );
  assert.ok(htmlK.includes('105 K'), 'K mode must display 105 K');
  assert.ok(!htmlK.includes('105 K / $14'), 'K mode should not include / $14');

  const htmlUSD = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookRightPage, { currencyMode: 'USD' })
  );
  assert.ok(htmlUSD.includes('$14.00'), 'USD mode must display $14.00');

  const htmlBoth = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookRightPage, { currencyMode: 'both' })
  );
  assert.ok(htmlBoth.includes('105 K / $14'), 'both mode must display 105 K / $14');
});

test('Cart badges render when items are in cart', () => {
  const cartState = {
    'cocktail-mojito': { quantity: 2 },
    'dessert-lava-cake': { quantity: 1 },
  };

  const html = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookRightPage, { cart: cartState })
  );

  assert.ok(html.includes('mb-drinks-cart-badge'), 'Must render cart badge');
  assert.ok(html.includes('2 in order'), 'Must reflect 2 in order for Mojito');
  assert.ok(html.includes('1 in order'), 'Must reflect 1 in order for Lava Cake');
});

test('Optional page number renders when provided', () => {
  const htmlWithPage = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookRightPage, { pageNumber: 'IV' })
  );
  assert.ok(htmlWithPage.includes('mb-drinks-page-number'), 'Must render page number footer');
  assert.ok(htmlWithPage.includes('IV'), 'Must show page IV');

  const htmlWithoutPage = ReactDOMServer.renderToStaticMarkup(
    React.createElement(MenuBookRightPage)
  );
  assert.ok(!htmlWithoutPage.includes('mb-drinks-page-number'), 'Should not render page number when null');
});

test('CSS stylesheet file exists and contains essential classes', () => {
  const cssPath = path.join(__dirname, '../../styles/menu-book-drinks.css');
  assert.ok(fs.existsSync(cssPath), 'menu-book-drinks.css must exist');
  const css = fs.readFileSync(cssPath, 'utf8');
  assert.ok(css.includes('.mb-drinks-page'), 'CSS must define .mb-drinks-page');
  assert.ok(css.includes('.mb-drinks-frame'), 'CSS must define .mb-drinks-frame');
  assert.ok(css.includes('.mb-drinks-bracket'), 'CSS must define .mb-drinks-bracket');
  assert.ok(css.includes('.mb-drinks-chalk-illustration'), 'CSS must define .mb-drinks-chalk-illustration');
  assert.ok(css.includes('.mb-drinks-desserts-grid'), 'CSS must define .mb-drinks-desserts-grid');
});
