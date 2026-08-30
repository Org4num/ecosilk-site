# Ecosilk — Website R&D Prototype

This is a real, working static site — not a mockup. Every product, price, and
image is pulled from Ecosilk's actual live catalog (131 SKUs). It's built to
deploy on GitHub Pages, matching how idreamwithtristina.com.au runs.

## What's actually working right now
- Browse the full catalog (`shop.html`), filter by category
- Product pages with colour-family switching (`product.html?sku=...`)
- A real cart that persists across pages (localStorage) — add items, adjust
  quantities, see a running total (`cart.html`)
- Fully responsive, mobile-first

## What's NOT wired yet (on purpose — needs real decisions first)
1. **Checkout / payment.** `cart.html` has a placeholder where PayPal's Smart
   Buttons need to go. Once there's a real PayPal Business account (sandbox
   first — see the earlier conversation about testing safely):
   ```html
   <script src="https://www.paypal.com/sdk/js?client-id=YOUR_SANDBOX_CLIENT_ID&currency=AUD"></script>
   <script>
     paypal.Buttons({
       createOrder: (data, actions) => actions.order.create({
         purchase_units: [{ amount: { value: cartTotal().toFixed(2) } }]
       }),
       onApprove: (data, actions) => actions.order.capture()
     }).render('#paypal-button-container');
   </script>
   ```
   The PayPal webhook then needs to point at the Apps Script order-receiver
   we scaffolded earlier, so orders land in the Inventory/Orders sheet.

2. **Images.** Currently hot-linking Emily's existing product photos directly
   from the live WooCommerce site — fine for this prototype, not fine to ship.
   Before going live: either re-shoot, or properly export/host the existing
   images (and get Sam & Tris's own edited originals into the mix where they
   have them).

3. **Content gaps** — these are placeholders, not real copy:
   - Newsletter signup doesn't actually submit anywhere yet
   - `contact.html`'s form needs a real Formspree endpoint ID (same free,
     no-backend pattern as iDream)
   - No real blog/journal yet
   - Only 24 shopping-bag colours got the "family switcher" treatment for this
     pass; drawstring bags, mini drawstring, and shoulder beach bags share the
     same data structure and just need the same category wired into a page.

4. **Stock quantity.** WooCommerce's public API only exposes in-stock/out-of-
   stock, not real counts — the "Stock" field WooCommerce shows will need
   Emily's actual backend before this is trustworthy at real order volume.

## Deploying to GitHub Pages
Same pattern as idreamwithtristina:
1. Push this whole folder to the root of a GitHub repo
2. Repo Settings → Pages → deploy from the main branch, root folder
3. Once ecosilkbags.com.au's DNS is ready to point here (needs whoever holds
   the registrar login — see the access-request email), add a `CNAME` file
   containing just the domain, and set the custom domain in Pages settings

## File structure
```
index.html        Homepage
shop.html         Full catalog, filterable
product.html      Product detail (?sku=XXX), colour switching for families
cart.html         Cart + (placeholder) checkout
about.html        Impact/mission — brand-led, not founder-led
contact.html       Contact form
assets/
  style.css       Shared brand styles (playful v2 direction)
  app.js          Cart logic + all rendering
  catalog-data.js Real product data (131 SKUs) — regenerate from a fresh
                  export whenever the real catalog changes
```
