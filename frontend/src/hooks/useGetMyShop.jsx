import axios from 'axios'
import { useEffect } from 'react'
import { serverUrl } from '../App'
import { useDispatch, useSelector } from 'react-redux'
import { setMyShopData } from '../redux/ownerSlice'

function useGetMyshop() {
    const dispatch = useDispatch()
    const { userData } = useSelector(state => state.user)

    useEffect(() => {
        if (!userData?._id || userData?.role !== 'owner') return

        const fetchShop = async () => {
            try {
                const result = await axios.get(`${serverUrl}/api/shop/get-my`, { withCredentials: true })
                dispatch(setMyShopData(result.data))
            } catch (error) {
                console.log(error)
            }
        }

        void fetchShop()
    }, [userData?._id, userData?.role, dispatch])
}

export default useGetMyshop
