import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./PolicyPage.css";
export default function ReturnsPage() { return <><Header /><main className="page-content policy-page"><div className="policy-container"><h1>Returns and exchanges</h1><div className="policy-body"><section className="policy-section"><h2>Request a return</h2><p>Contact us with your order ID and describe the item and reason for your request. We’ll review the details with you directly. There is currently no published return window.</p><Link to="/contact">Contact us about an order</Link></section><section className="policy-section"><h2>Keep your order ID</h2><p>Your order confirmation includes an ID you can copy or print. Please include it whenever you contact us about a return or exchange.</p></section></div></div></main><Footer /></>; }
