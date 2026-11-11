import { useEffect, useState } from "react";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { getAllCustomerReviews } from "../../services/appwrite";
import type { CustomerReview } from "../../services/appwrite";
import "../Admin/Admin.css";

const DEFAULT_AVATAR = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='%23260001'><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 3c1.66 0 3 1.34 3 3s-1.34 3-3 3-3-1.34-3-3 1.34-3 3-3zm0 14.2c-2.5 0-4.71-1.28-6-3.22.03-1.99 4-3.08 6-3.08 1.99 0 5.97 1.09 6 3.08-1.29 1.94-3.5 3.22-6 3.22z'/></svg>";

function CustomerReviews() {
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;
    const fetchReviews = async () => {
      setIsLoading(true);
      try {
        const records = await getAllCustomerReviews();
        if (isMounted) {
          setReviews(records);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load reviews.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchReviews();
    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <>
      <Header />
      <section className="customer-reviews-page">
        <div className="customer-reviews-header">
          <div>
            <h1>Customer reviews</h1>
            <p>Feedback from our happy clients.</p>
          </div>
        </div>

        {isLoading && <p className="empty-state">Loading reviews...</p>}
        {!isLoading && errorMessage && <p className="status-message">{errorMessage}</p>}

        {!isLoading && !errorMessage && (
          <div className="review-card-grid scattered">
            {reviews.map((card) => (
              <article className="review-card" key={card.id}>
                <div className="review-card-header">
                  <img className="review-avatar" src={DEFAULT_AVATAR} alt={card.name} />
                  <div>
                    <strong>{card.name}</strong>
                    <span>Customer review</span>
                  </div>
                </div>
                <p className="review-text">“{card.description}”</p>
                <div className="review-stars">
                  {Array.from({ length: 5 }).map((_, index) => (
                    <span key={index} className={index < card.stars ? "star-filled" : "star-empty"}>★</span>
                  ))}
                </div>
              </article>
            ))}
          </div>
        )}

        {!isLoading && !errorMessage && !reviews.length && (
          <p className="empty-state">No customer reviews yet. Be the first to add one!</p>
        )}
      </section>
      <Footer />
    </>
  );
}

export default CustomerReviews;
