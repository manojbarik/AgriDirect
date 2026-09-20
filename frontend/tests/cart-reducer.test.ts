import { describe, expect, it } from 'vitest'
import { cartReducer, type CartItem } from '../src/contexts/useCart'

const tomato: CartItem = {
  listing_id: 'l1',
  name: 'Fresh Tomato',
  price: 30,
  qty: 2,
  unit: 'kg',
}

const onion: CartItem = {
  listing_id: 'l2',
  name: 'Fresh Onion',
  price: 24,
  qty: 1,
  unit: 'kg',
}

describe('cartReducer', () => {
  it('adds an item to an empty cart', () => {
    const next = cartReducer([], { type: 'add', item: tomato, qty: tomato.qty })
    expect(next).toEqual([tomato])
  })

  it('merges quantities when adding an existing listing', () => {
    const next = cartReducer([tomato], { type: 'add', item: tomato, qty: 3 })
    expect(next).toHaveLength(1)
    expect(next[0].qty).toBe(5)
  })

  it('keeps distinct listings as separate rows', () => {
    const next = cartReducer([tomato], { type: 'add', item: onion, qty: onion.qty })
    expect(next).toHaveLength(2)
  })

  it('removes a listing by id', () => {
    const next = cartReducer([tomato, onion], { type: 'remove', listing_id: tomato.listing_id })
    expect(next).toEqual([onion])
  })

  it('updates quantity with setQty', () => {
    const next = cartReducer([tomato], { type: 'setQty', listing_id: 'l1', qty: 4 })
    expect(next[0].qty).toBe(4)
  })

  it('drops the row when setQty reaches zero or below', () => {
    const next = cartReducer([tomato, onion], { type: 'setQty', listing_id: 'l1', qty: 0 })
    expect(next).toEqual([onion])
  })

  it('clears the whole cart', () => {
    const next = cartReducer([tomato, onion], { type: 'clear' })
    expect(next).toEqual([])
  })
})