import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import { listSubscribers } from "../../services/messages";
import "./Admin.css";

export default function SubscribersPage() {
  const [subscribers, setSubscribers] = useState<Array<{ email: string; createdAt: string }>>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void listSubscribers()
      .then(setSubscribers)
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
              <h1>Updates list</h1>
              <p>People who asked to hear about new dresses.</p>
            </div>
            <Link className="secondary-link" to="/admin">Back to admin</Link>
          </div>

          {loading && <p className="empty-state">Loading...</p>}
          {error && <p role="alert" className="error-text">{error}</p>}
          {!loading && !error && !subscribers.length && <p className="empty-state">No subscribers yet.</p>}

          <div className="orders-list">
            {subscribers.map(item => (
              <article className="data-card subscriber-card" key={item.email}>
                <strong>{item.email}</strong>
                <span className="data-meta">{new Date(item.createdAt).toLocaleDateString()}</span>
              </article>
            ))}
          </div>
        </div>
      </main>
    </>
  );
}
