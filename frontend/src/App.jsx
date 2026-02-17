import React from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';

import SignUp from './pages/SignUp';
import SignIn from './pages/SignIn';
import ForgotPassword from './pages/ForgotPassword';
import Home from './pages/Home';
import CreateEditShop from './pages/CreateEditShop';
import AddItem from './pages/AddItem';
import EditItem from './pages/EditItem';
import CartPage from './pages/CartPage';
import CheckOut from './pages/CheckOut';
import OrderPlaced from './pages/OrderPlaced';
import MyOrders from './pages/MyOrders';
import TrackOrderPage from './pages/TrackOrderPage';
import Shop from './pages/Shop';
import Favorites from './pages/Favorites';
import Profile from './pages/Profile';
import AdminDashboard from './components/AdminDashboard';
import Footer from './components/Footer';

import useGetCurrentUser from './hooks/useGetCurrentUser';
import useGetCity from './hooks/useGetCity';
import useGetMyshop from './hooks/useGetMyShop';
import useGetShopByCity from './hooks/useGetShopByCity';
import useGetItemsByCity from './hooks/useGetItemsByCity';
import useUpdateLocation from './hooks/useUpdateLocation';

export const serverUrl = import.meta.env.VITE_SERVER_URL || 'http://localhost:5000';

function App() {
  const { userData } = useSelector((state) => state.user);
  const location = useLocation();
  const hideFooterRoutes = ['/signup', '/signin', '/forgot-password'];
  const showFooter = !hideFooterRoutes.includes(location.pathname);

  useGetCurrentUser();
  useUpdateLocation();
  useGetCity();
  useGetMyshop();
  useGetShopByCity();
  useGetItemsByCity();

  return (
    <div className="min-h-screen flex flex-col">
      <div className="flex-1">
        <Routes>
          <Route path="/signup" element={!userData ? <SignUp /> : <Navigate to="/" />} />
          <Route path="/signin" element={!userData ? <SignIn /> : <Navigate to="/" />} />
          <Route path="/forgot-password" element={!userData ? <ForgotPassword /> : <Navigate to="/" />} />
          <Route path="/" element={userData ? <Home /> : <Navigate to="/signin" />} />
          <Route path="/create-edit-shop" element={userData ? <CreateEditShop /> : <Navigate to="/signin" />} />
          <Route path="/add-item" element={userData ? <AddItem /> : <Navigate to="/signin" />} />
          <Route path="/edit-item/:itemId" element={userData ? <EditItem /> : <Navigate to="/signin" />} />
          <Route path="/cart" element={userData ? <CartPage /> : <Navigate to="/signin" />} />
          <Route path="/checkout" element={userData ? <CheckOut /> : <Navigate to="/signin" />} />
          <Route path="/order-placed" element={userData ? <OrderPlaced /> : <Navigate to="/signin" />} />
          <Route path="/my-orders" element={userData ? <MyOrders /> : <Navigate to="/signin" />} />
          <Route path="/track-order/:orderId" element={userData ? <TrackOrderPage /> : <Navigate to="/signin" />} />
          <Route path="/shop/:shopId" element={userData ? <Shop /> : <Navigate to="/signin" />} />
          <Route path="/favorites" element={userData ? <Favorites /> : <Navigate to="/signin" />} />
          <Route path="/profile" element={userData ? <Profile /> : <Navigate to="/signin" />} />
          <Route path="/admin" element={userData?.role === "admin" ? <AdminDashboard /> : (userData ? <Navigate to="/" /> : <Navigate to="/signin" />)} />
        </Routes>
      </div>
      {showFooter && <Footer />}
    </div>
  );
}

export default App;
