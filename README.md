# TradeCity — Build. Stock. Ship.

A browser-based 3D tycoon game: zone a city block, build a store, and keep
its shelves stocked with a truck route from your warehouse. If the supply
route can't keep up, shelves empty and customers leave unhappy — that
tension between retail and logistics is the whole game.

**Phase 1:** one store, one warehouse, one truck route, basic road/zoning
grid, simple customer AI, save/load, mobile-first touch controls.

**Phase 2 (this build):** a store interior editor (shelves, checkout,
decor), three product categories with independent demand/pricing, staff
(stockers restock shelves from the backroom, cashiers speed up checkout)
who physically walk the interior, and two store archetypes (General Store,
Boutique) with different category mixes and shelf capacity.

## Stack

- [Vite](https://vite.dev) + React + TypeScript
- [Three.js](https://threejs.org) via [React Three Fiber](https://r3f.docs.pmnd.rs)
- [Zustand](https://zustand.docs.pmnd.rs) for game state
- LocalStorage persistence, no backend

## Playing

### City view

- **Road** — tap an empty tile to pave a road ($10). Connect the warehouse
  to the store with contiguous road tiles so the truck can drive between them.
- **Zone** — tap an empty tile to zone a residential lot ($25). More houses
  mean customers arrive more often.
- **Clear** — tap a tile to bulldoze it back to empty.
- **Look** — orbit/pan/zoom the scene without placing anything.
- **Manage Store** (or tap the store building) — enter the store interior.

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
