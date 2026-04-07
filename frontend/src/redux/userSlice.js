import { createSlice } from "@reduxjs/toolkit";

const userSlice = createSlice({
  name: "user",
  initialState: {
    userData: null,
    currentCity: null,
    currentState: null,
    currentAddress: null,
    shopInMyCity: null,
    itemsInMyCity: null,
    cartItems: [],
    totalAmount: 0,
    myOrders: [],
    searchItems: null,
    searchSuggestions: {
      items: [],
      shops: []
    },
    favorites: [],
    liveEtaByOrderId: {},
    addresses: [],
    walletBalance: 0,
    walletTransactions: [],
    recommendedItems: [],
    bestCoupon: null
  },
  reducers: {
    setUserData: (state, action) => {
      state.userData = action.payload
    },
    setCurrentCity: (state, action) => {
      state.currentCity = action.payload
    },
    setCurrentState: (state, action) => {
      state.currentState = action.payload
    },
    setCurrentAddress: (state, action) => {
      state.currentAddress = action.payload
    },
    setShopsInMyCity: (state, action) => {
      state.shopInMyCity = action.payload
    },
    setItemsInMyCity: (state, action) => {
      state.itemsInMyCity = action.payload
    },
    addToCart: (state, action) => {
      const cartItem = action.payload
      const existingItem = state.cartItems.find(i => i.id == cartItem.id)
      if (existingItem) {
        existingItem.quantity += cartItem.quantity
      } else {
        state.cartItems.push(cartItem)
      }

      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)

    },

    setTotalAmount: (state, action) => {
      state.totalAmount = action.payload
    }

    ,

    updateQuantity: (state, action) => {
      const { id, quantity } = action.payload
      const item = state.cartItems.find(i => i.id == id)
      if (item) {
        item.quantity = quantity
      }
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    },

    removeCartItem: (state, action) => {
      state.cartItems = state.cartItems.filter(i => i.id !== action.payload)
      state.totalAmount = state.cartItems.reduce((sum, i) => sum + i.price * i.quantity, 0)
    },

    setMyOrders: (state, action) => {
      state.myOrders = action.payload
    },
    addMyOrder: (state, action) => {
      const incomingOrder = action.payload
      const exists = state.myOrders.some(order => order?._id == incomingOrder?._id)
      if (!exists) {
        state.myOrders = [incomingOrder, ...state.myOrders]
      }
    },
    removeMyOrder: (state, action) => {
      state.myOrders = state.myOrders.filter((order) => String(order?._id) !== String(action.payload))
    },

    clearCart: (state) => {
      state.cartItems = []
      state.totalAmount = 0
    }

    ,
    updateOrderStatus: (state, action) => {
      const { orderId, shopId, status } = action.payload
      const order = state.myOrders.find(o => o._id == orderId)
      if (order) {
        if (Array.isArray(order.shopOrders)) {
          const targetShopOrder = order.shopOrders.find(so => so.shop?._id == shopId)
          if (targetShopOrder) {
            targetShopOrder.status = status
          }
        } else if (order.shopOrders?.shop?._id == shopId) {
          order.shopOrders.status = status
        }
      }
    },

    updateRealtimeOrderStatus: (state, action) => {
      const { orderId, shopId, status } = action.payload
      const order = state.myOrders.find(o => o._id == orderId)
      if (order) {
        if (Array.isArray(order.shopOrders)) {
          const shopOrder = order.shopOrders.find(so => so.shop?._id == shopId)
          if (shopOrder) {
            shopOrder.status = status
          }
        } else if (order.shopOrders?.shop?._id == shopId) {
          order.shopOrders.status = status
        }
      }
    },

    setSearchItems: (state, action) => {
      state.searchItems = action.payload
    },

    setSearchSuggestions: (state, action) => {
      state.searchSuggestions = action.payload || { items: [], shops: [] }
    },

    setFavorites: (state, action) => {
      state.favorites = action.payload
    },

    toggleFavoriteItem: (state, action) => {
      const itemId = action.payload;
      const index = state.favorites.findIndex(id => id === itemId);
      if (index > -1) {
        state.favorites.splice(index, 1);
      } else {
        state.favorites.push(itemId);
      }
    },

    setOrderEta: (state, action) => {
      const { orderId, etaSeconds } = action.payload || {}
      if (!orderId) return

      const safeEta = Number(etaSeconds)
      state.liveEtaByOrderId[orderId] = Number.isFinite(safeEta)
        ? Math.max(0, Math.round(safeEta))
        : null
    },

    clearOrderEta: (state, action) => {
      delete state.liveEtaByOrderId[action.payload]
    },

    setAddresses: (state, action) => {
      state.addresses = action.payload || []
    },

    setWalletBalance: (state, action) => {
      state.walletBalance = Number(action.payload || 0)
    },

    setWalletTransactions: (state, action) => {
      state.walletTransactions = action.payload || []
    },

    setRecommendedItems: (state, action) => {
      state.recommendedItems = action.payload || []
    },

    setBestCoupon: (state, action) => {
      state.bestCoupon = action.payload || null
    }
  }
})

export const { setUserData, setCurrentAddress, setCurrentCity, setCurrentState, setShopsInMyCity, setItemsInMyCity, addToCart, updateQuantity, removeCartItem, setMyOrders, addMyOrder, removeMyOrder, updateOrderStatus, setSearchItems, setSearchSuggestions, setTotalAmount, updateRealtimeOrderStatus, clearCart, setFavorites, toggleFavoriteItem, setOrderEta, clearOrderEta, setAddresses, setWalletBalance, setWalletTransactions, setRecommendedItems, setBestCoupon } = userSlice.actions
export default userSlice.reducer
