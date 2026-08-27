import type { InteriorTile, ProductCategory, TileKey } from './types';

export function pickNeediestShelf(tiles: Record<TileKey, InteriorTile>): TileKey | null {
  let bestKey: TileKey | null = null;
  let bestRatio = Infinity;
  for (const [key, tile] of Object.entries(tiles)) {
    if (tile.type !== 'shelf' || !tile.shelf) continue;
    if (tile.shelf.stock >= tile.shelf.capacity) continue;
    const ratio = tile.shelf.stock / tile.shelf.capacity;
    if (ratio < bestRatio) {
      bestRatio = ratio;
      bestKey = key;
    }
  }
  return bestKey;
}

export function pickShelfForCategory(
  tiles: Record<TileKey, InteriorTile>,
  category: ProductCategory
): TileKey | null {
  for (const [key, tile] of Object.entries(tiles)) {
    if (tile.type === 'shelf' && tile.shelf && tile.shelf.category === category && tile.shelf.stock >= 1) {
      return key;
    }
  }
  return null;
}

export function categoryShelfStock(
  tiles: Record<TileKey, InteriorTile>,
  category: ProductCategory
): number {
  let total = 0;
  for (const tile of Object.values(tiles)) {
    if (tile.type === 'shelf' && tile.shelf && tile.shelf.category === category) total += tile.shelf.stock;
  }
  return total;
}

export function findCheckoutKeys(tiles: Record<TileKey, InteriorTile>): TileKey[] {
  const keys: TileKey[] = [];
  for (const [key, tile] of Object.entries(tiles)) {
    if (tile.type === 'checkout') keys.push(key);
  }
  return keys;
}

export function totalShelfStock(tiles: Record<TileKey, InteriorTile>): {
  stock: number;
  capacity: number;
} {
  let stock = 0;
  let capacity = 0;
  for (const tile of Object.values(tiles)) {
    if (tile.type === 'shelf' && tile.shelf) {
      stock += tile.shelf.stock;
      capacity += tile.shelf.capacity;
    }
  }
  return { stock, capacity };
}
