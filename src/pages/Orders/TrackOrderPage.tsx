import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { lookUpOrder, type LookupResult } from "../../services/orders";
import "../Admin/Admin.css";

export default function TrackOrderPage() {
  const [orderId, setOrderId] = useState("");
  const [phone, setPhone] = useState("");
  const [results, setResults] = useState<LookupResult[]>([]);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const whatsapp = import.meta.env.VITE_WHATSAPP_NUMBER;
  const email = import.meta.env.VITE_CONTACT_EMAIL;

  function returnHref(oid: string) {
    const msg = `I would like to request a return for order ${oid}.`;
    if (whatsapp) return `https://wa.me/${whatsapp}?text=${encodeURIComponent(msg)}`;
    if (email) return `mailto:${email}?subject=${encodeURIComponent(`Return request ${oid}`)}&body=${encodeURIComponent(msg)}`;
    return "";
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    const trimId = orderId.trim().toUpperCase();
    const trimPhone = phone.trim();
    if (!trimId && !trimPhone) { setError("Enter an order ID or phone number."); return; }
    setBusy(true); setError(""); setResults([]);
    try {
      const query: { orderId?: string; phone?: string } = {};
      if (trimId) query.orderId = trimId;
      if (trimPhone) query.phone = trimPhone;
      const data = await lookUpOrder(query);
      setResults(data.orders);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not find order.");
    } finally { setBusy(false); }
  }

  const statusColor: Record<string, string> = {
    "New order": "#c8922a",
    "In progress": "#2563eb",
    "Dispatched": "#7c3aed",
    "Received": "#16a34a",
    "Return requested": "#dc2626",
    "Returned": "#6b7280",
  };

  return (
    <>
      <Header />
      <main className="admin-page">
        <div className="admin-card">
          <h1>Track your order</h1>
          <p>Enter your order ID (e.g. SEN-20261111-0001) or the phone number you used at checkout.</p>
          <form className="admin-form" onSubmit={submit}>
            <div className="form-group">
              <label htmlFor="track-id">Order ID</label>
              <input id="track-id" placeholder="SEN-YYYYMMDD-NNNN" value={orderId} onChange={e => setOrderId(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="track-phone">Phone number</label>
              <input id="track-phone" inputMode="numeric" placeholder="Enter phone number" value={phone} onChange={e => setPhone(e.target.value)} />
            </div>
            <button className="upload-button" disabled={busy}>{busy ? "Checking..." : "Track order"}</button>
          </form>
          {error && <p role="alert" className="error-text">{error}</p>}
          {results.length > 0 && (
            <div className="orders-list" style={{ marginTop: "1.5rem" }}>
              {results.map(order => (
                <article className="data-card" key={order.orderId}>
                  <span className="status-badge" style={{ background: statusColor[order.status] || "#6b7280", color: "#fff" }}>{order.status}</span>
                  <h2>{order.orderId}</h2>
                  <p className="data-meta">{new Date(order.createdAt).toLocaleString()}</p>
                  <p>{order.name} · Total ₹{order.total.toFixed(2)}</p>
                  {order.status === "Received" && (returnHref(order.orderId)
                    ? <a className="upload-button" href={returnHref(order.orderId)} target="_blank" rel="noopener noreferrer" style={{ marginTop: "0.5rem", display: "inline-block" }}>Request a return</a>
                    : <Link className="upload-button" to="/contact" style={{ marginTop: "0.5rem", display: "inline-block" }}>Contact us about a return</Link>
                  )}
                </article>
              ))}
            </div>
          )}
        </div>
      </main>
      <Footer />
    </>
  );
}
