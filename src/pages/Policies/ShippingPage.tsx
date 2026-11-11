import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./PolicyPage.css";
export default function ShippingPage() { return <><Header /><main className="page-content policy-page"><div className="policy-container"><h1>Shipping and payment</h1><div className="policy-body"><section className="policy-section"><p>We confirm delivery and manual payment details directly after you place an order. The checkout shows the total for your selected items; delivery charges and timing will be confirmed separately before fulfillment.</p><p>Keep your order ID when contacting us about your delivery.</p><Link to="/contact">Contact us</Link></section></div></div></main><Footer /></>; }
