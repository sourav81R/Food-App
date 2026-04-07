import { createSlice } from "@reduxjs/toolkit";

const getShopId = (shop) => String(shop?._id || "")

const resolveSelectedShop = (shops, selectedShopId) => {
    const availableShops = Array.isArray(shops) ? shops.filter(Boolean) : []
    const nextSelectedShop = availableShops.find((shop) => getShopId(shop) === String(selectedShopId || ""))
        || availableShops[0]
        || null

    return {
        selectedShopId: nextSelectedShop?._id || null,
        myShopData: nextSelectedShop
    }
}

const ownerSlice=createSlice({
    name:"owner",
    initialState:{
        myShopData:null,
        myShops:[],
        selectedShopId:null
    },
    reducers:{
        setOwnerShops:(state,action)=>{
        const payload = action.payload || {}
        state.myShops=Array.isArray(payload.shops) ? payload.shops : []
        const { selectedShopId, myShopData } = resolveSelectedShop(state.myShops, payload.selectedShopId || state.selectedShopId)
        state.selectedShopId = selectedShopId
        state.myShopData = myShopData
        },
        setSelectedShopId:(state,action)=>{
        const { selectedShopId, myShopData } = resolveSelectedShop(state.myShops, action.payload)
        state.selectedShopId = selectedShopId
        state.myShopData = myShopData
        },
        setMyShopData:(state,action)=>{
        const nextShop = action.payload
        if(!nextShop?._id){
            state.myShopData=null
            return
        }

        const currentIndex = state.myShops.findIndex((shop)=>getShopId(shop)===getShopId(nextShop))
        if(currentIndex>=0){
            state.myShops[currentIndex]=nextShop
        }else{
            state.myShops.unshift(nextShop)
        }

        const { selectedShopId, myShopData } = resolveSelectedShop(state.myShops, nextShop._id)
        state.selectedShopId = selectedShopId
        state.myShopData = myShopData
        },
        clearOwnerState:(state)=>{
        state.myShopData=null
        state.myShops=[]
        state.selectedShopId=null
        }
    }
})

export const {setOwnerShops,setSelectedShopId,setMyShopData,clearOwnerState}=ownerSlice.actions
export default ownerSlice.reducer
