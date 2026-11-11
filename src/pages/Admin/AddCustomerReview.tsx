import { useState } from "react";
import type { FormEvent } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import { createCustomerReviewRow } from "../../services/appwrite";
import "./Admin.css";

function AddCustomerReview() {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [stars, setStars] = useState("5");
  const [statusMessage, setStatusMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!name.trim() || !description.trim()) {
      setStatusMessage("Please provide both name and description text.");
      return;
    }

    setIsSubmitting(true);
    setStatusMessage("Saving review...");

    try {
      await createCustomerReviewRow({
        name: name.trim(),
        description: description.trim(),
        stars,
      });

      setStatusMessage("Customer review uploaded successfully.");
      setName("");
      setDescription("");
      setStars("5");
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Unable to upload review.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <section className="admin-page">
        <div className="admin-card">
          <div className="admin-page-header">
            <div>
              <p className="eyebrow">Admin</p>
              <h1>Add customer review</h1>
              <p>Submit a new customer review to display on the site.</p>
            </div>
            <Link className="secondary-link" to="/admin">
              Back to admin
            </Link>
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="customer-name">Name</label>
              <input
                id="customer-name"
                type="text"
                placeholder="Enter customer name"
                value={name}
                onChange={(event) => setName(event.target.value)}
              />
            </div>

            <div className="form-group">
              <label htmlFor="customer-rating">Stars</label>
              <select
                id="customer-rating"
                value={stars}
                onChange={(event) => setStars(event.target.value)}
              >
                <option value="5">5 stars</option>
                <option value="4">4 stars</option>
                <option value="3">3 stars</option>
                <option value="2">2 stars</option>
                <option value="1">1 star</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="customer-review">Description</label>
              <textarea
                id="customer-review"
                rows={5}
                placeholder="Write the customer review description"
                value={description}
                onChange={(event) => setDescription(event.target.value)}
              />
            </div>

            <button className="upload-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Uploading..." : "Upload review"}
            </button>

            {statusMessage && <p className="status-message">{statusMessage}</p>}
          </form>
        </div>
      </section>
    </>
  );
}

export default AddCustomerReview;
