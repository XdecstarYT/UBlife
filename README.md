# TradeCity — Build. Stock. Ship.

A browser-based 3D tycoon game: zone a city block, build a store, and keep
its shelves stocked with a truck route from your warehouse. If the supply
route can't keep up, shelves empty and customers leave unhappy — that
tension between retail and logistics is the whole game.

**Phase 1:** one store, one warehouse, one truck route, basic road/zoning
grid, simple customer AI, save/load, mobile-first touch controls.

**Phase 2:** a store interior editor (shelves, checkout, decor), three
product categories with independent demand/pricing, staff (stockers
restock shelves from the backroom, cashiers speed up checkout) who
physically walk the interior, and two store archetypes (General Store,
Boutique) with different category mixes and shelf capacity.

**Phase 3 (this build):** full zoning — commercial and industrial lots
instantly build an auto-operated satellite store or warehouse, each of
which finds its own nearest supplying warehouse over the road/rail
network. Multiple concurrent truck routes sharing the same road tiles
congest each other (color-coded green/yellow/red, and it visibly slows
them down); building rail alongside a route upgrades it from truck to
train — faster, bigger capacity, and immune to congestion.

Also a full graphics pass: image-based lighting, physically-tuned
materials (glass storefronts, metal vehicles), procedural ground/road/
floor textures, soft contact shadows, cinematic tone mapping, and light
bloom/vignette — all gated behind an adaptive quality tier that backs
off automatically if the frame rate drops, targeting 50-60fps on phones.

## Stack

- [Vite](https://vite.dev) + React + TypeScript
- [Three.js](https://threejs.org) via [React Three Fiber](https://r3f.docs.pmnd.rs) + [drei](https://github.com/pmndrs/drei) + [postprocessing](https://github.com/pmndrs/react-postprocessing)
- [Zustand](https://zustand.docs.pmnd.rs) for game state
- LocalStorage persistence, no backend

## Playing

### City view

- **Road** — tap an empty tile to pave a road ($10). Connect a warehouse
  to a store with contiguous road tiles so a truck can drive between them.
- **Rail** — tap to lay rail ($30/tile). A warehouse/store pair connected
  by rail gets a train instead of a truck: faster, bigger loads, and immune
  to road congestion.
- **Houses** — zone a residential lot ($25). More houses mean customers
  arrive more often.
- **Shop** — zone a commercial lot ($120) to instantly build a satellite
  store. It auto-operates (no interior to manage) and finds its own
  nearest warehouse over the road/rail network.
- **Factory** — zone an industrial lot ($100) to instantly build a
  satellite warehouse, a new supply source any store can connect to.
- **Clear** — tap a tile to bulldoze it back to empty (also removes any
  shop/factory built there).
- **Look** — orbit/pan/zoom the scene without placing anything.
- **Manage Store** (or tap the flagship store building) — enter its
  interior. Satellite shops don't have one; they're simpler, auto-priced,
  and always open once stocked.

The bottom **Routes** panel lists every active route once you have more
than one — mode (truck/train) and status (delivering, returning, congested,
blocked). Road tiles tint yellow/red under concurrent traffic.

Drag to orbit, pinch (or scroll) to zoom, tap to place. Money, stock, and
happiness are shown along the top; the truck's status (delivering,
returning, or blocked with no route) is shown top right.

### Store interior

The truck now delivers to a backroom buffer, not straight to the shelves —
goods only go on display once shelved, either by a slow automatic trickle
or faster by a hired **stocker**. A **checkout** is required to sell
anything at all; hiring a **cashier** shortens how long checkout is busy
after each sale, so fewer shoppers give up waiting.

- Place **shelves** for a specific product category (Grocery, Clothing,
  Electronics — only the categories your current store type carries),
  a **checkout**, or **decor**.
- Switch **store type** between General Store (all three categories) and
  Boutique (Clothing + Electronics only, bigger shelves).
- Cycle each category's **price tier** (Low/Normal/High) — lower prices
  draw more shoppers wanting that category but earn less per sale, and
  vice versa.
- **Hire/fire staff** from the same panel; wages drain continuously.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run lint     # oxlint
```
