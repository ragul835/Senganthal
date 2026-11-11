import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { getAllDressesWithImages, type DressWithImages } from "../../services/appwrite";
import "./NewArrivals.css";
export default function NewArrivals() {
  const [dresses,setDresses] = useState<DressWithImages[]>([]); const [error,setError] = useState("");
  useEffect(() => { void getAllDressesWithImages().then(setDresses).catch(e => setError(e.message)); }, []);
  return <><Header /><main className="store-section"><h1>Fresh arrivals</h1><p>Our latest additions to the catalog.</p>{error && <p role="alert">{error}</p>}{!error && !dresses.length && <p>No dresses added yet.</p>}<div className="store-products">{[...dresses].reverse().slice(0,12).map(dress => <Link className="store-product" to={`/dress/${encodeURIComponent(dress.id)}`} key={dress.id}>{dress.images[0] ? <img src={dress.images[0].imageUrl} alt={dress.name} /> : <div className="store-placeholder">Photo coming soon</div>}<div><h2>{dress.name}</h2><p>{dress.category}</p><strong>₹{dress.price}</strong></div></Link>)}</div></main><Footer /></>;
}
