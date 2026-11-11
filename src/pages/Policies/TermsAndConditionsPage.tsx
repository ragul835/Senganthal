import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./PolicyPage.css";
export default function TermsAndConditionsPage() { return <><Header /><main className="page-content policy-page"><div className="policy-container"><h1>Ordering information</h1><div className="policy-body"><section className="policy-section"><p>Product photos and details are provided to help you choose. Place an order with your delivery details and keep the order ID shown on the confirmation page. We will contact you to arrange manual payment and delivery. No online payment is taken during checkout.</p><p>For questions about an order, use your order ID when contacting us.</p><Link to="/contact">Contact us</Link></section></div></div></main><Footer /></>; }
