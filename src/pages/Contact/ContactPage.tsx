import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "../Admin/Admin.css";
import "./ContactPage.css";
import { sendContactMessage } from "../../services/messages";

function ContactPage() {
  const [params] = useSearchParams();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState(params.get("orderId") ? `Order ${params.get("orderId")}` : "");
  const [message, setMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [messageSaved, setMessageSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      setSuccessMessage("Please fill out all required fields.");
      return;
    }

    setIsSubmitting(true);
    setSuccessMessage("");
    setMessageSaved(false);

    try {
      await sendContactMessage({ name: name.trim(), email: email.trim(), subject: subject.trim(), message: message.trim() });
      setSuccessMessage("Your message has been saved. We’ll be in touch using the email you provided.");
      setMessageSaved(true);
      setIsSubmitting(false);
      setName("");
      setEmail("");
      setSubject("");
      setMessage("");
    } catch (error) {
      setSuccessMessage(error instanceof Error ? error.message : "We couldn't save your message. Please try again.");
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <Header />
      <main className="page-content contact-page">
        <section className="contact-container">
          <div className="contact-header">
            <h1>Contact Us</h1>
            <p>Have a question about a dress or an order? Send us a note and include your order ID if you have one.</p>
          </div>

          <div className="contact-layout">
            {/* Contact Form */}
            <div className="contact-form-section">
              <form className="admin-form contact-form" onSubmit={handleSubmit}>
                <h2>Send Us a Message</h2>

                <div className="form-group">
                  <label htmlFor="contact-name">Name *</label>
                  <input
                    id="contact-name"
                    type="text"
                    maxLength={120}
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact-email">Email *</label>
                  <input
                    id="contact-email"
                    type="email"
                    maxLength={254}
                    placeholder="Enter your email address"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact-subject">Subject</label>
                  <input
                    id="contact-subject"
                    type="text"
                    maxLength={160}
                    placeholder="What is this regarding?"
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="contact-message">Message *</label>
                  <textarea
                    id="contact-message"
                    rows={5}
                    maxLength={5000}
                    placeholder="Write your message here..."
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    required
                  />
                </div>

                <button type="submit" className="upload-button contact-submit-btn" disabled={isSubmitting}>
                  {isSubmitting ? "Sending..." : "Send Message"}
                </button>

                {successMessage && (
                  <p role={messageSaved ? "status" : "alert"} className={`status-message ${messageSaved ? "success-text-color" : ""}`}>
                    {successMessage}
                  </p>
                )}
              </form>
            </div>

            <aside className="contact-info-section">
              <div className="info-card">
                <h2>Our Boutique</h2>

                <div className="info-item">
                  <strong>📍 Address</strong>
                  <p>Ask us for visiting details.</p>
                </div>

                <div className="info-item">
                  <strong>📞 Phone Number</strong>
                  <p>Phone details will be added soon.</p>
                </div>

                <div className="info-item">
                  <strong>✉️ Email Address</strong>
                  <p>Use the message form to reach us.</p>
                </div>

                <div className="info-item">
                  <strong>⏰ Working Hours</strong>
                  <p>Ask us about current opening hours.</p>
                </div>
              </div>
            </aside>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}

export default ContactPage;
