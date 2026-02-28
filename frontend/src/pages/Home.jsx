import React from 'react'
import { useSelector } from 'react-redux'
import UserDashboard from '../components/UserDashboard'
import OwnerDashboard from '../components/OwnerDashboard'
import DeliveryBoy from '../components/DeliveryBoy'
import AdminDashboard from '../components/AdminDashboard'
import { isAdminRole, isDeliveryRole, isOwnerRole, isUserRole } from '../utils/roles'

function Home() {
    const {userData}=useSelector(state=>state.user)

    if(isAdminRole(userData?.role)){
      return <AdminDashboard/>
    }
  return (
    <div className='w-full min-h-screen flex flex-col items-center bg-[#fff9f6]'>
      {isUserRole(userData?.role) && <UserDashboard/>}
      {isOwnerRole(userData?.role) && <OwnerDashboard/>}
      {isDeliveryRole(userData?.role) && <DeliveryBoy/>}
    </div>
  )
}

export default Home
