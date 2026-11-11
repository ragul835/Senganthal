import { BrowserRouter, Routes, Route } from "react-router-dom";
import HomePage from "./pages/Home/HomePage";
import NewArrivals from "./pages/NewArrivals/NewArrivals";
import Admin from "./pages/Admin/Admin";
import AddDressPage from "./pages/Admin/AddDressPage";
import EditDressPage from "./pages/Admin/EditDressPage";
import DressDetailsPage from "./pages/Admin/DressDetailsPage";
import UpcomingPage from "./pages/Admin/UpcomingPage";
import AddCustomerReview from "./pages/Admin/AddCustomerReview";
import CustomerReviews from "./pages/CustomerReviews/CustomerReviews";
import SearchPage from "./pages/Search/SearchPage";
import CartPage from "./pages/Cart/CartPage";
import ProductPage from "./pages/Product/ProductPage";
import CheckoutPage from "./pages/Checkout/CheckoutPage";
import AdminLogin from "./pages/Admin/AdminLogin";
import ResetPassword from "./pages/Admin/ResetPassword";
import RequireAdmin from "./pages/Admin/RequireAdmin";
import OrdersPage from "./pages/Admin/OrdersPage";
import MessagesPage from "./pages/Admin/MessagesPage";
import SubscribersPage from "./pages/Admin/SubscribersPage";
import TrackOrderPage from "./pages/Orders/TrackOrderPage";
import { CartProvider } from "./state/cart";
import UpcomingListPage from "./pages/Upcoming/UpcomingListPage";
import ContactPage from "./pages/Contact/ContactPage";
// Policy pages
import PrivacyPolicyPage from "./pages/Policies/PrivacyPolicyPage";
import TermsAndConditionsPage from "./pages/Policies/TermsAndConditionsPage";
import ShippingPage from "./pages/Policies/ShippingPage";
import ReturnsPage from "./pages/Policies/ReturnsPage";
// Info pages
import OurStoryPage from "./pages/Info/OurStoryPage";

function App() {
  return (
    <CartProvider><BrowserRouter>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/new-arrivals" element={<NewArrivals />} />
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/reset-password" element={<ResetPassword />} />
        <Route path="/admin" element={<RequireAdmin><Admin /></RequireAdmin>} />
        <Route path="/admin/add" element={<RequireAdmin><AddDressPage /></RequireAdmin>} />
        <Route path="/admin/edit" element={<RequireAdmin><EditDressPage /></RequireAdmin>} />
        <Route path="/admin/edit/:dressId" element={<RequireAdmin><DressDetailsPage /></RequireAdmin>} />
        <Route path="/admin/upcoming" element={<RequireAdmin><UpcomingPage /></RequireAdmin>} />
        <Route path="/upcoming" element={<UpcomingListPage />} />
        <Route path="/admin/add-review" element={<RequireAdmin><AddCustomerReview /></RequireAdmin>} />
        <Route path="/admin/orders" element={<RequireAdmin><OrdersPage /></RequireAdmin>} />
        <Route path="/admin/messages" element={<RequireAdmin><MessagesPage /></RequireAdmin>} />
        <Route path="/admin/subscribers" element={<RequireAdmin><SubscribersPage /></RequireAdmin>} />
        <Route path="/reviews" element={<CustomerReviews />} />
        <Route path="/search" element={<SearchPage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/checkout" element={<CheckoutPage />} />
        <Route path="/track-order" element={<TrackOrderPage />} />
        <Route path="/dress/:dressId" element={<ProductPage />} />
        <Route path="/contact" element={<ContactPage />} />
        {/* Policy pages */}
        <Route path="/privacy-policy" element={<PrivacyPolicyPage />} />
        <Route path="/terms-and-conditions" element={<TermsAndConditionsPage />} />
        <Route path="/shipping" element={<ShippingPage />} />
        <Route path="/returns" element={<ReturnsPage />} />
        {/* Info pages */}
        <Route path="/our-story" element={<OurStoryPage />} />
      </Routes>
    </BrowserRouter></CartProvider>
  );
}

export default App;
