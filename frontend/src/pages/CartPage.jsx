import React from 'react'
import { IoIosArrowRoundBack } from "react-icons/io";
import { useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import CartItemCard from '../components/CartItemCard';
function CartPage() {
    const navigate = useNavigate()
    const { cartItems, totalAmount } = useSelector(state => state.user)
    return (
        <div className='min-h-screen bg-[#fff9f6] flex justify-center p-3 sm:p-6'>
            <div className='w-full max-w-[800px]'>
                <div className='flex items-center gap-3 sm:gap-5 mb-5 sm:mb-6'>
                    <div className=' z-[10] ' onClick={() => navigate("/")}>
                        <IoIosArrowRoundBack size={35} className='text-[#ff4d2d]' />
                    </div>
                    <h1 className='text-2xl font-bold text-start'>Your Cart</h1>
                </div>
                {cartItems?.length == 0 ? (
                    <p className='text-gray-500 text-lg text-center'>Your Cart is Empty</p>
                ) : (<>
                    <div className='space-y-4'>
                        {cartItems?.map((item, index) => (
                            <CartItemCard data={item} key={index} />
                        ))}
                    </div>
                    <div className='mt-6 bg-white p-4 rounded-xl shadow flex flex-col sm:flex-row justify-between sm:items-center border gap-2'>

                        <h1 className='text-lg font-semibold'>Total Amount</h1>
                        <span className='text-xl font-bold text-[#ff4d2d]'>Rs {totalAmount}</span>
                    </div>
                    <div className='mt-4 flex justify-end' > 
                        <button className='w-full sm:w-auto bg-[#ff4d2d] text-white px-6 py-3 rounded-lg text-base sm:text-lg font-medium hover:bg-[#e64526] transition cursor-pointer' onClick={()=>navigate("/checkout")}>Proceed to CheckOut</button>
                    </div>
                </>
                )}
            </div>
        </div>
    )
}

export default CartPage
