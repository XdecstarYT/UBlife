# TradeCity — Build. Stock. Ship.

A browser-based 3D tycoon game: zone a city block, build a store, and keep
its shelves stocked with a truck route from your warehouse. If the supply
route can't keep up, shelves empty and customers leave unhappy — that
tension between retail and logistics is the whole game.

**Phase 1 (this build):** one store, one warehouse, one truck route, basic
road/zoning grid, simple customer AI, save/load, mobile-first touch controls.

## Stack

- [Vite](https://vite.dev) + React + TypeScript
- [Three.js](https://threejs.org) via [React Three Fiber](https://r3f.docs.pmnd.rs)
- [Zustand](https://zustand.docs.pmnd.rs) for game state
- LocalStorage persistence, no backend

## Playing

- **Road** — tap an empty tile to pave a road ($10). Connect the warehouse
  to the store with contiguous road tiles so the truck can drive between them.
- **Zone** — tap an empty tile to zone a residential lot ($25). More houses
  mean customers arrive more often.
- **Clear** — tap a tile to bulldoze it back to empty.
- **Look** — orbit/pan/zoom the scene without placing anything.

Drag to orbit, pinch (or scroll) to zoom, tap to place. Money, stock, and
happiness are shown along the top; the truck's status (delivering,
returning, or blocked with no route) is shown top right.

## Development

```bash
npm install
npm run dev      # start the dev server
npm run build    # typecheck + production build
npm run lint     # oxlint
```
