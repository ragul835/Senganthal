import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "../Policies/PolicyPage.css";
export default function OurStoryPage() { return <><Header /><main className="page-content policy-page"><div className="policy-container"><h1>About Senganthal</h1><div className="policy-body"><section className="policy-section"><p>Senganthal is a place to browse dresses at your own pace. Each product page shows photos and details added by our team, so you can check the style before ordering.</p><p>If you have a question about a dress, <Link to="/contact">get in touch</Link>. We’re happy to help you choose.</p></section></div></div></main><Footer /></>; }
