import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import { listContactMessages, type ContactMessage } from "../../services/messages";
import "./Admin.css";

export default function MessagesPage() {
  const [messages, setMessages] = useState<ContactMessage[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listContactMessages()
      .then(setMessages)
      .catch(e => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <Header />
      <main className="admin-page">
        <div className="admin-card">
          <div className="admin-page-header">
            <div>
              <p className="eyebrow">Admin</p>
              <h1>Customer messages</h1>
            </div>
            <Link className="secondary-link" to="/admin">Back to admin</Link>
          </div>

          {loading && <p className="empty-state">Loading messages...</p>}
          {error && <p role="alert" className="error-text">{error}</p>}
          {!loading && !error && !messages.length && <p className="empty-state">No messages yet.</p>}

          <div className="orders-list">
            {messages.map(item => (
              <article className="data-card" key={item.id}>
                <h2>{item.subject || "Customer question"}</h2>
                <p>
                  {item.name} · <a className="data-email" href={`mailto:${item.email}`}>{item.email}</a>
                </p>
                <p className="data-meta">{new Date(item.createdAt).toLocaleString()}</p>
                <div className="data-body">{item.message}</div>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
