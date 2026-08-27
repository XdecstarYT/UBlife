import type { PriceLevel, ProductCategory, StoreType } from './types';

export interface CategoryConfig {
  label: string;
  basePrice: number;
  /** Relative likelihood a walk-in customer wants this category. */
  baseDemandWeight: number;
  color: string;
}

export const CATEGORIES: Record<ProductCategory, CategoryConfig> = {
  grocery: { label: 'Grocery', basePrice: 6, baseDemandWeight: 5, color: '#e0c34c' },
  clothing: { label: 'Clothing', basePrice: 14, baseDemandWeight: 2.5, color: '#4c9fe0' },
  electronics: { label: 'Electronics', basePrice: 25, baseDemandWeight: 1.5, color: '#a24ce0' },
};

export const ALL_CATEGORIES: ProductCategory[] = ['grocery', 'clothing', 'electronics'];

export const PRICE_TIER_LABEL: Record<PriceLevel, string> = {
  low: 'Low',
  normal: 'Normal',
  high: 'High',
};

export const PRICE_MULTIPLIER: Record<PriceLevel, number> = {
  low: 0.8,
  normal: 1.0,
  high: 1.3,
};

/** Lower price draws more shoppers for that category; higher price draws fewer. */
export const DEMAND_MULTIPLIER: Record<PriceLevel, number> = {
  low: 1.3,
  normal: 1.0,
  high: 0.65,
};

export const PRICE_TIER_ORDER: PriceLevel[] = ['low', 'normal', 'high'];

export interface StoreTypeConfig {
  label: string;
  allowedCategories: ProductCategory[];
  shelfCapacityBonus: number;
  wallColor: string;
}

export const STORE_TYPES: Record<StoreType, StoreTypeConfig> = {
  general: {
    label: 'General Store',
    allowedCategories: ['grocery', 'clothing', 'electronics'],
    shelfCapacityBonus: 0,
    wallColor: '#d94f4f',
  },
  boutique: {
    label: 'Boutique',
    allowedCategories: ['clothing', 'electronics'],
    shelfCapacityBonus: 10,
    wallColor: '#8a4fd9',
  },
};

export const SHELF_CAPACITY_BASE = 15;

export function shelfCapacityFor(storeType: StoreType): number {
  return SHELF_CAPACITY_BASE + STORE_TYPES[storeType].shelfCapacityBonus;
}
