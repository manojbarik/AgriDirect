import { createContext, useContext } from 'react'

export interface CartItem {
  listing_id: string
  name: string
  price: number
  qty: number
  unit: string
}

export type CartAction =
  | { type: 'add'; item: Omit<CartItem, 'qty'>; qty: number }
  | { type: 'remove'; listing_id: string }
  | { type: 'setQty'; listing_id: string; qty: number }
  | { type: 'clear' }

export function cartReducer(state: CartItem[], action: CartAction): CartItem[] {
  switch (action.type) {
    case 'add': {
      const existing = state.find((i) => i.listing_id === action.item.listing_id)
      if (existing) {
        return state.map((i) =>
          i.listing_id === action.item.listing_id ? { ...i, qty: i.qty + action.qty } : i,
        )
      }
      return [...state, { ...action.item, qty: action.qty }]
    }
    case 'remove':
      return state.filter((i) => i.listing_id !== action.listing_id)
    case 'setQty':
      return action.qty <= 0
        ? state.filter((i) => i.listing_id !== action.listing_id)
        : state.map((i) => (i.listing_id === action.listing_id ? { ...i, qty: action.qty } : i))
    case 'clear':
      return []
    default:
      return state
  }
}

export interface CartContextValue {
  items: CartItem[]
  addItem: (item: Omit<CartItem, 'qty'>, qty?: number) => void
  removeItem: (listingId: string) => void
  setQty: (listingId: string, qty: number) => void
  clearCart: () => void
  totalCount: number
  totalValue: number
}

export const CartContext = createContext<CartContextValue | null>(null)

export function useCart(): CartContextValue {
  const context = useContext(CartContext)
  if (!context) throw new Error('useCart must be used within a CartProvider')
  return context
}