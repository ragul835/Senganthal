import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { listUpcoming, type UpcomingDress } from "../../services/upcoming";
import "./UpcomingListPage.css";

export default function UpcomingListPage() {
  const [items, setItems] = useState<UpcomingDress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    void listUpcoming()
      .then(setItems)
      .catch(cause => setError(cause instanceof Error ? cause.message : "Could not load upcoming dresses."))
      .finally(() => setLoading(false));
  }, []);

  return <>
    <Header />
    <main className="upcoming-list-page">
      <div className="upcoming-list-container">
        <header className="upcoming-list-header">
          <p className="upcoming-list-eyebrow">Coming soon</p>
          <h1>Upcoming dresses</h1>
          <p>Discover the styles we are currently bringing to life.</p>
        </header>

        {loading && <p className="upcoming-list-message" role="status">Loading upcoming dresses…</p>}
        {error && <p className="upcoming-list-message upcoming-list-error" role="alert">{error}</p>}
        {!loading && !items.length && !error && <p className="upcoming-list-message">No upcoming dresses have been announced yet.</p>}

        <div className="upcoming-dress-grid">
          {items.map(item => {
            const [hero, ...rest] = item.mainImages;
            const mainSet = new Set(item.mainImages);
            const uniqueWorkImages = item.workingImages.filter(url => !mainSet.has(url));
            return (
              <article className="upcoming-dress-card" key={item.id}>
                {hero && (
                  <div className="upcoming-dress-hero">
                    <span className="upcoming-status">{item.status}</span>
                    <img src={hero} alt={`${item.title} finished look`} loading="lazy" />
                  </div>
                )}

                <div className="upcoming-dress-content">
                  {!hero && <span className="upcoming-status">{item.status}</span>}
                  <h2>{item.title}</h2>
                  {item.description && <p>{item.description}</p>}
                </div>

                {rest.length > 0 && (
                  <div className="upcoming-more-images">
                    {rest.map((url, index) => (
                      <img key={`${url}-${index}`} src={url} alt={`${item.title} look ${index + 2}`} loading="lazy" />
                    ))}
                  </div>
                )}

                {uniqueWorkImages.length > 0 && (
                  <details className="upcoming-progress">
                    <summary>See work in progress</summary>
                    <div className="upcoming-progress-grid">
                      {uniqueWorkImages.map((url, index) => (
                        <img key={`${url}-${index}`} src={url} alt={`${item.title} in progress ${index + 1}`} loading="lazy" />
                      ))}
                    </div>
                  </details>
                )}
              </article>
            );
          })}
        </div>
      </div>
    </main>
    <Footer />
  </>;
}
