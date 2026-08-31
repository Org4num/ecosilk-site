// ECOSILK — shared cart + rendering logic. Depends on CATALOG from catalog-data.js
// Cart persists via localStorage — fine for a real deployed static site (this isn't
// an in-chat artifact preview), and is exactly how a no-backend PayPal-based cart
// needs to work.

const CART_KEY = 'ecosilk_cart_v1';

function getCart() {
  try { return JSON.parse(localStorage.getItem(CART_KEY)) || []; }
  catch (e) { return []; }
}

function saveCart(cart) {
  localStorage.setItem(CART_KEY, JSON.stringify(cart));
  updateCartPill();
}

function addToCart(sku, qty = 1) {
  const cart = getCart();
  const existing = cart.find(l => l.sku === sku);
  if (existing) existing.qty += qty;
  else cart.push({ sku, qty });
  saveCart(cart);
}

function updateQty(sku, qty) {
  let cart = getCart();
  if (qty <= 0) cart = cart.filter(l => l.sku !== sku);
  else cart.forEach(l => { if (l.sku === sku) l.qty = qty; });
  saveCart(cart);
  renderCartPage(); // no-op if not on cart page
}

function cartCount() {
  return getCart().reduce((n, l) => n + l.qty, 0);
}

function cartTotal() {
  const cart = getCart();
  return cart.reduce((sum, l) => {
    const p = CATALOG.find(p => p.sku === l.sku);
    return sum + (p ? p.price * l.qty : 0);
  }, 0);
}

function updateCartPill() {
  document.querySelectorAll('[data-cart-count]').forEach(el => {
    el.textContent = `Bag · ${cartCount()}`;
  });
}

// ---- SHOP GRID RENDERING ----
function renderProductGrid(containerEl, filterCategory) {
  // For colour-families, show one card per family (first colour as representative)
  // rather than 24 near-identical cards — packs/themed sets show individually.
  const seenFamilies = new Set();
  const cards = [];
  CATALOG.forEach(p => {
    if (filterCategory && filterCategory !== 'All' && p.category !== filterCategory) return;
    const isFamily = p.family !== p.sku;
    if (isFamily) {
      if (seenFamilies.has(p.family)) return;
      seenFamilies.add(p.family);
    }
    cards.push(p);
  });

  containerEl.innerHTML = cards.map(p => `
    <a class="product-card ${p.inStock ? '' : 'out-of-stock'}" href="product.html?sku=${encodeURIComponent(p.sku)}">
      <div class="thumb" style="background-image:url('${p.image}')">
        ${!p.inStock ? '<span class="badge-oos">Out of stock</span>' : ''}
        ${p.proposed ? '<span class="badge-oos" style="background:var(--purple);">Proposed concept</span>' : ''}
      </div>
      <div class="info">
        <h3>${p.family !== p.sku ? displayCategory(p.category) : p.name}</h3>
        <div class="price">$${p.price.toFixed(2)}</div>
      </div>
    </a>
  `).join('');
}

function renderCategoryFilters(containerEl, onSelect) {
  const cats = ['All', ...new Set(CATALOG.map(p => p.category))];
  containerEl.innerHTML = cats.map(c =>
    `<button class="filter-chip ${c === 'All' ? 'active' : ''}" data-cat="${c}">${c === 'All' ? 'All' : displayCategory(c)}</button>`
  ).join('');
  containerEl.querySelectorAll('.filter-chip').forEach(btn => {
    btn.addEventListener('click', () => {
      containerEl.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      onSelect(btn.dataset.cat);
    });
  });
}

function categoryCopy(cat) {
  const copy = {
    'Ecosilk Environmentally Friendly Fruit & Vegie Bag':
      "Same parachute-strong nylon pouch, repositioned: shoe bag, laundry pouch, packing cube \u2014 or, sure, still great for veg. Folds flat, wipes clean.",
    'Pocket Travel Pouches':
      "A proposed 3-pack bundle of the same real product above, solving the \u2018one $5.25 bag doesn't cover shipping\u2019 problem \u2014 not a new SKU to manufacture, just a repack.",
    'Mini Drawstring bags':
      "Palm-sized parachute silk pouch \u2014 reusable gift wrap, jewellery pouch, or a produce bag that fits anywhere. Same fabric, smaller footprint, lowest price point in the range.",
  };
  return copy[cat] || 'Parachute-strong nylon, folds down to pocket size, carries up to 14kg. 5-year guarantee.';
}

// ---- PRODUCT DETAIL RENDERING ----
function renderProductDetail(containerEl) {
  const params = new URLSearchParams(window.location.search);
  const sku = params.get('sku');
  const product = CATALOG.find(p => p.sku === sku) || CATALOG[0];
  const familyMembers = product.family !== product.sku
    ? CATALOG.filter(p => p.family === product.family)
    : [product];

  let current = product;

  function draw() {
    containerEl.innerHTML = `
      <div class="pd-image" id="pdImage" style="background-image:url('${current.image}')"></div>
      <div>
        <div class="eyebrow">${displayCategory(current.category)}${current.proposed ? ' \u2014 Proposed concept, not yet a real product' : ''}</div>
        <h1>${familyMembers.length > 1 ? displayCategory(current.category) : current.name}</h1>
        <div class="pd-price">$${current.price.toFixed(2)}</div>
        ${familyMembers.length > 1 ? `
          <div>Colour: <strong id="colorName">${current.color}</strong></div>
          <div class="color-options" id="colorOptions">
            ${familyMembers.map(m => `
              <div class="color-swatch-btn ${m.sku === current.sku ? 'selected' : ''}"
                   style="background-image:url('${m.image}')" data-sku="${m.sku}" title="${m.color}"></div>
            `).join('')}
          </div>
        ` : ''}
        <div class="qty-row">
          <button class="qty-btn" id="qtyMinus">-</button>
          <span id="qtyVal">1</span>
          <button class="qty-btn" id="qtyPlus">+</button>
        </div>
        ${current.inStock
          ? `<button class="btn btn-full" id="addBtn">Add to bag — $${current.price.toFixed(2)}</button>`
          : `<button class="btn btn-full" disabled style="opacity:0.5;">Out of stock</button>`}
        <p style="margin-top:24px;opacity:0.7;font-size:0.9rem;">${categoryCopy(current.category)}</p>
      </div>
    `;

    let qty = 1;
    const qtyVal = document.getElementById('qtyVal');
    document.getElementById('qtyMinus').onclick = () => { if (qty > 1) qty--; qtyVal.textContent = qty; };
    document.getElementById('qtyPlus').onclick = () => { qty++; qtyVal.textContent = qty; };
    const addBtn = document.getElementById('addBtn');
    if (addBtn) addBtn.onclick = () => { addToCart(current.sku, qty); addBtn.textContent = 'Added ✓'; setTimeout(() => draw(), 700); };

    const colorOptions = document.getElementById('colorOptions');
    if (colorOptions) {
      colorOptions.querySelectorAll('.color-swatch-btn').forEach(el => {
        el.addEventListener('click', () => {
          current = familyMembers.find(m => m.sku === el.dataset.sku);
          history.replaceState(null, '', `product.html?sku=${current.sku}`);
          draw();
        });
      });
    }
  }
  draw();
}

// ---- CART PAGE RENDERING ----
function renderCartPage() {
  const el = document.getElementById('cartLines');
  if (!el) return;
  const cart = getCart();
  if (!cart.length) {
    el.innerHTML = '';
    document.getElementById('emptyState').style.display = 'block';
    document.getElementById('cartSummary').style.display = 'none';
    return;
  }
  document.getElementById('emptyState').style.display = 'none';
  document.getElementById('cartSummary').style.display = 'block';

  el.innerHTML = cart.map(line => {
    const p = CATALOG.find(p => p.sku === line.sku);
    if (!p) return '';
    return `
      <div class="cart-line">
        <img src="${p.image}">
        <div class="grow">
          <div style="font-weight:600;">${p.name}</div>
          <div style="opacity:0.6;font-size:0.9rem;">$${p.price.toFixed(2)} each</div>
        </div>
        <button class="qty-btn" onclick="updateQty('${p.sku}', ${line.qty - 1})">-</button>
        <span style="min-width:20px;text-align:center;">${line.qty}</span>
        <button class="qty-btn" onclick="updateQty('${p.sku}', ${line.qty + 1})">+</button>
        <button class="qty-btn" title="Remove" onclick="updateQty('${p.sku}', 0)">×</button>
      </div>
    `;
  }).join('');

  document.getElementById('cartTotal').textContent = '$' + cartTotal().toFixed(2);
}

function injectLogo() {
  const badgeSvg = `
    <svg width="34" height="34" viewBox="0 0 100 100" style="flex-shrink:0;">
      <circle cx="50" cy="50" r="48" fill="#2E6E52"/>
      <path d="M50 12 C 38 22, 30 38, 34 52 C 40 46, 48 44, 54 50 C 50 36, 52 22, 50 12 Z" fill="#EAF3F0"/>
      <path d="M54 50 C 60 44, 70 42, 78 46 C 70 54, 60 58, 54 50 Z" fill="#EAF3F0"/>
      <circle cx="70" cy="47" r="2.6" fill="#2E6E52"/>
      <path d="M8 70 C 25 62, 40 62, 50 68 C 60 74, 75 74, 92 66" stroke="#3E7FB0" stroke-width="4" fill="none" stroke-linecap="round"/>
      <path d="M8 80 C 25 74, 40 74, 50 78 C 60 82, 75 82, 92 76" stroke="#6FA8CE" stroke-width="4" fill="none" stroke-linecap="round"/>
    </svg>
  `;
  document.querySelectorAll('.logo').forEach(el => {
    el.innerHTML = badgeSvg + '<span>ecosilk</span>';
    el.style.display = 'flex';
    el.style.alignItems = 'center';
    el.style.gap = '10px';
  });
}

document.addEventListener('DOMContentLoaded', () => {
  injectLogo();
  updateCartPill();
  renderCartPage();
});
