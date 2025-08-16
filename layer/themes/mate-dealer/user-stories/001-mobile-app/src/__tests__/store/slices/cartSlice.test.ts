import cartReducer, {
  addToCart,
  removeFromCart,
  updateCartItemQuantity,
  clearCart,
  CartItem,
} from '../../store/slices/cartSlice';

describe('cartSlice', () => {
  const initialState = {
    items: [],
    totalItems: 0,
    totalAmount: 0,
    loading: false,
    error: null,
  };

  const mockCartItem: CartItem = {
    id: 'cart-1',
    productId: 'product-1',
    name: 'Taragui Yerba Mate',
    price: 12.99,
    quantity: 1,
    image: 'https://example.com/image.jpg',
    description: 'Traditional yerba mate',
  };

  it('should return the initial state', () => {
    expect(cartReducer(undefined, { type: 'unknown' })).toEqual(initialState);
  });

  it('should handle adding item to cart', () => {
    const actual = cartReducer(initialState, addToCart(mockCartItem));
    expect(actual.items).toHaveLength(1);
    expect(actual.items[0]).toEqual({ ...mockCartItem, quantity: 1 });
    expect(actual.totalItems).toBe(1);
    expect(actual.totalAmount).toBe(12.99);
  });

  it('should handle adding same item to cart (increase quantity)', () => {
    const stateWithItem = {
      ...initialState,
      items: [mockCartItem],
      totalItems: 1,
      totalAmount: 12.99,
    };

    const actual = cartReducer(stateWithItem, addToCart({ ...mockCartItem, quantity: 2 }));
    expect(actual.items).toHaveLength(1);
    expect(actual.items[0].quantity).toBe(3);
    expect(actual.totalItems).toBe(3);
    expect(actual.totalAmount).toBe(12.99 * 3);
  });

  it('should handle removing item from cart', () => {
    const stateWithItem = {
      ...initialState,
      items: [mockCartItem],
      totalItems: 1,
      totalAmount: 12.99,
    };

    const actual = cartReducer(stateWithItem, removeFromCart({ id: 'cart-1' }));
    expect(actual.items).toHaveLength(0);
    expect(actual.totalItems).toBe(0);
    expect(actual.totalAmount).toBe(0);
  });

  it('should handle updating item quantity', () => {
    const stateWithItem = {
      ...initialState,
      items: [mockCartItem],
      totalItems: 1,
      totalAmount: 12.99,
    };

    const actual = cartReducer(stateWithItem, updateCartItemQuantity({ id: 'cart-1', quantity: 3 }));
    expect(actual.items[0].quantity).toBe(3);
    expect(actual.totalItems).toBe(3);
    expect(actual.totalAmount).toBe(12.99 * 3);
  });

  it('should remove item when quantity is set to 0', () => {
    const stateWithItem = {
      ...initialState,
      items: [mockCartItem],
      totalItems: 1,
      totalAmount: 12.99,
    };

    const actual = cartReducer(stateWithItem, updateCartItemQuantity({ id: 'cart-1', quantity: 0 }));
    expect(actual.items).toHaveLength(0);
    expect(actual.totalItems).toBe(0);
    expect(actual.totalAmount).toBe(0);
  });

  it('should handle clearing cart', () => {
    const stateWithItems = {
      ...initialState,
      items: [mockCartItem, { ...mockCartItem, id: 'cart-2' }],
      totalItems: 2,
      totalAmount: 25.98,
    };

    const actual = cartReducer(stateWithItems, clearCart());
    expect(actual.items).toHaveLength(0);
    expect(actual.totalItems).toBe(0);
    expect(actual.totalAmount).toBe(0);
  });

  it('should calculate totals correctly with multiple items', () => {
    const item1 = { ...mockCartItem, id: 'cart-1', quantity: 2, price: 10.00 };
    const item2 = { ...mockCartItem, id: 'cart-2', quantity: 3, price: 15.00 };
    
    let state = cartReducer(initialState, addToCart(item1));
    state = cartReducer(state, addToCart(item2));

    expect(state.totalItems).toBe(5); // 2 + 3
    expect(state.totalAmount).toBe(65); // (10 * 2) + (15 * 3)
  });
});