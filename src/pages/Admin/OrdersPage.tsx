import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import { listOrders, setOrderStatus, type Order, type OrderStatus } from "../../services/orders";
import "./Admin.css";

const statuses: OrderStatus[] = ["New order", "In progress", "Dispatched", "Received", "Return requested", "Returned"];

function statusClass(status: string) {
  if (status === "New order") return "status-new";
  if (status === "In progress") return "status-progress";
  if (status === "Dispatched") return "status-dispatched";
  if (status === "Received") return "status-received";
  if (status.startsWith("Return")) return "status-return";
  return "status-returned";
}

export default function OrdersPage() {
  const [orders, setOrders] = useState<Order[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState("All");

  useEffect(() => {
    void listOrders()
      .then(setOrders)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  async function change(order: Order, status: OrderStatus) {
    try {
      await setOrderStatus(order.id, status);
      setOrders(current => current.map(item => item.id === order.id ? { ...item, status } : item));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Update failed.");
    }
  }

  return (
    <>
      <Header />
      <main className="admin-page">
        <div className="admin-card">
          <div className="admin-page-header">
            <div>
              <p className="eyebrow">Admin</p>
              <h1>Customer orders</h1>
            </div>
            <Link className="secondary-link" to="/admin">Back to admin</Link>
          </div>

          <div className="filter-bar">
            <select value={filter} onChange={e => setFilter(e.target.value)}>
              <option>All</option>
              {statuses.map(s => <option key={s}>{s}</option>)}
            </select>
          </div>

          {loading && <p className="empty-state">Loading orders...</p>}
          {error && <p role="alert" className="error-text">{error}</p>}
          {!loading && !orders.length && <p className="empty-state">No orders yet.</p>}

          <div className="orders-list">
            {orders
              .filter(order => filter === "All" || order.status === filter)
              .map(order => (
                <article className="data-card" key={order.id}>
                  <span className={`status-badge ${statusClass(order.status)}`}>{order.status}</span>
                  <h2>{order.orderId}</h2>
                  <p className="data-meta">{new Date(order.createdAt).toLocaleString()}</p>
                  <p>{order.firstName} {order.lastName} · {order.phone}</p>
                  <div className="order-address">
                    {order.address}{order.apartment ? `, ${order.apartment}` : ""}, {order.city}, {order.state} {order.pinCode}
                  </div>

                  <ul className="order-items">
                    {order.items.map((item, index) => (
                      <li key={index}>{item.name} · {item.size} x {item.quantity} — ₹{(item.price * item.quantity).toFixed(2)}</li>
                    ))}
                  </ul>

                  <span className="order-total">Total ₹{order.total.toFixed(2)}</span>

                  <div className="form-group">
                    <label htmlFor={`status-${order.id}`}>Update status</label>
                    <select
                      id={`status-${order.id}`}
                      value={order.status}
                      onChange={e => void change(order, e.target.value as OrderStatus)}
                    >
                      {statuses.map(s => <option key={s}>{s}</option>)}
                    </select>
                  </div>
                </article>
              ))}
          </div>
        </div>
      </main>
    </>
  );
}
