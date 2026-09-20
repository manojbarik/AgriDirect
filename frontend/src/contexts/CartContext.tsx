import { useEffect, useReducer } from 'react'
import type { ReactNode } from 'react'
import { CartContext, cartReducer, type CartItem } from './useCart'

const STORAGE_KEY = 'agridirect:cart'

function loadCart(): CartItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed as CartItem[]
    return []
  } catch {
    return []
  }
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, dispatch] = useReducer(cartReducer, undefined, loadCart)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
    } catch {
      /* storage unavailable */
    }
  }, [items])

  const addItem = (item: Omit<CartItem, 'qty'>, qty = 1) => dispatch({ type: 'add', item, qty })
  const removeItem = (listingId: string) => dispatch({ type: 'remove', listing_id: listingId })
  const setQty = (listingId: string, qty: number) => dispatch({ type: 'setQty', listing_id: listingId, qty })
  const clearCart = () => dispatch({ type: 'clear' })

  const totalCount = items.reduce((sum, i) => sum + i.qty, 0)
  const totalValue = items.reduce((sum, i) => sum + i.price * i.qty, 0)

  return (
    <CartContext.Provider
      value={{ items, addItem, removeItem, setQty, clearCart, totalCount, totalValue }}
    >
      {children}
    </CartContext.Provider>
  )
}