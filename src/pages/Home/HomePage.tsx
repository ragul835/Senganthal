import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { getAllDressesWithImages } from "../../services/appwrite";
import type { DressWithImages } from "../../services/appwrite";
import { getAllCustomerReviews, type CustomerReview } from "../../services/appwrite";
import { subscribeToUpdates } from "../../services/messages";
import "./Home.css";
import "./HomePage.css";

/* ─── Scroll Reveal Hook ─────────────────────────────── */
function useReveal() {
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { el.classList.add("visible"); obs.disconnect(); } },
      { threshold: 0.12 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, []);
  return ref;
}

/* ─── Category Data ──────────────────────────────────── */
const CATEGORIES = [
  {
    key: "sarees",
    emoji: "🌺",
    name: "Sarees",
    desc: "Take a closer look at our sarees for celebrations and everyday plans.",
    badge: "Explore",
    bgClass: "cat-bg-sarees",
    importance: "From an easy daytime drape to a dressier look, find the saree that feels right for your plans.",
    specialities: ["Everyday styles", "Occasion wear", "Color choices", "Product details"],
  },
  {
    key: "churidar",
    emoji: "👗",
    name: "Churidar Sets",
    desc: "Explore sets you can dress up or keep simple.",
    badge: "Explore",
    bgClass: "cat-bg-churidar",
    importance: "Look through the available colors, sizes and details before you choose your set.",
    specialities: ["Salwar styles", "Anarkali looks", "Size details", "Easy browsing"],
  },
  {
    key: "cotton",
    emoji: "🌿",
    name: "Cotton Wear",
    desc: "Easygoing styles for days when you want to keep things simple.",
    badge: "Explore",
    bgClass: "cat-bg-cotton",
    importance: "Browse the fabric and care information on each dress page to find what suits your day.",
    specialities: ["Everyday wear", "Fabric details", "Care notes", "Simple styling"],
  },
  {
    key: "kids",
    emoji: "🦋",
    name: "Kids Wear",
    desc: "Outfits for little moments worth remembering.",
    badge: "Explore",
    bgClass: "cat-bg-kids",
    importance: "See the photos and size information for each piece before choosing a look for your little one.",
    specialities: ["Occasion styles", "Everyday looks", "Size details", "Product photos"],
  },
];

/* ─── Why Features ───────────────────────────────────── */
const WHY_FEATURES = [
  { icon: "🧵", title: "Look Closely", desc: "Each listing brings the photos, price and available sizes together in one place." },
  { icon: "🌺", title: "Find Your Style", desc: "Browse by name or category when you know what you are looking for." },
  { icon: "🌿", title: "Care Details", desc: "Check the wash care notes on a dress page before you order." },
  { icon: "💛", title: "Questions Welcome", desc: "If you want to know more about a piece, send us a message." },
  { icon: "🚚", title: "Order Updates", desc: "Keep your order ID and follow the status of your order online." },
  { icon: "✨", title: "Shop Your Way", desc: "Choose a single dress or put several in your cart before checking out." },
];

/* ─── Product Card Component ─────────────────────────── */
function ProductCard({ dress }: { dress: DressWithImages }) {
  const imgUrl = dress.images?.[0]?.imageUrl || "";
  const productPath = `/dress/${encodeURIComponent(dress.id)}`;
  return (
    <div className="product-card">
      <div className="product-img-wrap">
        <Link to={productPath} aria-label={`View ${dress.name} details`} className="product-image-link">
        {imgUrl ? (
          <img src={imgUrl} alt={dress.name} loading="lazy" />
        ) : (
          <div style={{
            width: "100%", height: "100%",
            background: "linear-gradient(160deg, #fdf0e0 0%, #f5d88a 100%)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "3rem",
          }}>🌺</div>
        )}
        </Link>
        <span className="product-ribbon">Featured</span>
        <span className="product-wishlist" aria-hidden="true">🤍</span>
      </div>
      <div className="product-info">
        <div className="product-category-tag">{dress.category || "Collection"}</div>
        <Link to={productPath} className="product-name">{dress.name}</Link>
        <div className="product-price-row">
          <span className="product-price">₹{dress.price}</span>
          <Link to={productPath} className="product-add-btn" aria-label={`Choose size for ${dress.name}`} title="Choose size and add to cart">+</Link>
        </div>
      </div>
    </div>
  );
}

/* ─── Star Rating ────────────────────────────────────── */
function Stars({ count }: { count: number }) {
  return (
    <div className="testimonial-stars">
      {Array.from({ length: count }).map((_, i) => (
        <span key={i} className="star-icon">★</span>
      ))}
    </div>
  );
}

/* ─── Section Wrapper with Reveal ───────────────────── */
function RevealSection({ children, className = "", delay = 0 }: { children: React.ReactNode; className?: string; delay?: number }) {
  const ref = useReveal();
  return (
    <div ref={ref} className={`reveal reveal-delay-${delay} ${className}`}>
      {children}
    </div>
  );
}

/* ══════════════════════════════════════════════════════
   MAIN HOME PAGE
   ══════════════════════════════════════════════════════ */
function HomePage() {
  const [dresses, setDresses] = useState<DressWithImages[]>([]);
  const [reviews, setReviews] = useState<CustomerReview[]>([]);
  const [loading, setLoading] = useState(true);
  const [catalogError, setCatalogError] = useState("");
  const [reviewsError, setReviewsError] = useState("");
  const [email, setEmail] = useState("");
  const [subscribed, setSubscribed] = useState(false);
  const [subscribing, setSubscribing] = useState(false);
  const [subscribeError, setSubscribeError] = useState("");

  useEffect(() => {
    getAllDressesWithImages()
      .then(setDresses)
      .catch(() => setCatalogError("Dresses are unavailable right now. Please try again later."))
      .finally(() => setLoading(false));
    getAllCustomerReviews().then(setReviews).catch(() => setReviewsError("Customer reviews are unavailable right now."));
  }, []);

  const featuredDresses = dresses.slice(0, 4);
  const freshArrivals = dresses.slice().reverse().slice(0, 10);

  async function handleSubscribe(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSubscribing(true);
    setSubscribeError("");
    try { await subscribeToUpdates(email.trim()); setSubscribed(true); setEmail(""); }
    catch (error) { setSubscribeError(error instanceof Error ? error.message : "We couldn't save your email. Please try again."); }
    finally { setSubscribing(false); }
  }

  return (
    <>
      <Header />
      <div className="home-page page-content">

        {/* ═══ 1. HERO ════════════════════════════════════ */}
        <section className="hero-section" id="home-hero">
          <div className="hero-bg-orb orb-1" />
          <div className="hero-bg-orb orb-2" />
          <div className="hero-pattern" />

          <div className="hero-badge">
            <span className="hero-lotus">🌺</span>
            Senganthal — The Red Lotus Boutique
          </div>

          <h1 className="hero-title">Elegance Woven</h1>
          <p className="hero-title-sub">into Every Thread</p>

          <p className="hero-desc">
            A dress can make an ordinary day feel different. Browse the collection, take a closer
            look at the details, and choose what feels right for you.
          </p>

          <div className="hero-actions">
            <Link to="/search" className="hero-btn-primary" id="hero-shop-btn">
              Shop Now <span className="arrow-icon">→</span>
            </Link>
            <Link to="/our-story" className="hero-btn-outline" id="hero-story-btn">
              Our Story
            </Link>
          </div>

          <div className="hero-scroll-hint">
            <div className="scroll-mouse" />
            <span>Scroll</span>
          </div>
        </section>

        {/* ═══ 2. OUR STORY ═══════════════════════════════ */}
        <section className="story-section" id="home-story">
          <div className="story-inner">
            <RevealSection className="story-visual">
              <div className="story-accent-dot" />
              <div className="story-img-frame">
                <img src="/senganthal.jpg" alt="Senganthal" />
              </div>
              <div className="story-img-badge">
                <div className="story-img-badge-icon">🏆</div>
                <div className="story-img-badge-text">
                  <strong>Senganthal</strong>
                  <span>Find your next look</span>
                </div>
              </div>
            </RevealSection>

            <div className="story-content">
              <RevealSection delay={1}>
                <div className="section-label">Our Story</div>
                <h2 className="section-title">A Place to Find<br />Your Next Favorite</h2>
                <p className="section-subtitle">
                  At <em>Senganthal</em>, we like the little moment of finding a dress that feels
                  just right. Take your time with the photos and details, whether you're looking
                  for something easy to wear or dressing for an occasion.
                </p>
                <p className="section-subtitle" style={{ marginTop: "16px" }}>
                  If you'd like to know more about a piece, we're here to help you choose.
                </p>
                <Link to="/our-story" className="section-cta primary" id="story-read-more">
                  Read Our Full Story <span className="arrow-icon">→</span>
                </Link>
              </RevealSection>

              <RevealSection delay={2}>
                <div className="story-pillars">
                  {[
                    { icon: "🧵", title: "Browse Details", desc: "Photos, sizes and care notes" },
                    { icon: "🌿", title: "Find Your Fit", desc: "Choose from listed sizes" },
                    { icon: "💛", title: "Ask Us", desc: "Questions are always welcome" },
                    { icon: "🚚", title: "Track Orders", desc: "Check with your order ID" },
                  ].map((p) => (
                    <div key={p.title} className="story-pillar">
                      <span className="pillar-icon">{p.icon}</span>
                      <div className="pillar-title">{p.title}</div>
                      <div className="pillar-desc">{p.desc}</div>
                    </div>
                  ))}
                </div>
              </RevealSection>
            </div>
          </div>
        </section>

        {/* ═══ 3. CATEGORIES ══════════════════════════════ */}
        <section className="categories-section" id="home-categories">
          <div className="categories-inner">
            <RevealSection>
              <div className="categories-header">
                <div className="section-label">Collections</div>
                <h2 className="section-title">Shop by Category</h2>
                <p className="section-subtitle">
                  Start with the kind of outfit you're looking for, then explore the details
                  of the pieces that catch your eye.
                </p>
              </div>
            </RevealSection>

            <div className="categories-grid">
              {CATEGORIES.map((cat, i) => (
                <RevealSection key={cat.key} delay={(i % 4 + 1) as 1 | 2 | 3 | 4}>
                  <Link
                    to={`/search?q=${encodeURIComponent(cat.key)}`}
                    className="category-card"
                    id={`cat-${cat.key}`}
                    style={{ display: "block", height: "100%" }}
                  >
                    <div className={`category-card-bg ${cat.bgClass}`} />
                    <div className="category-card-overlay" />
                    <span className="category-speciality">{cat.badge}</span>
                    <div className="category-card-content">
                      <span className="category-card-emoji">{cat.emoji}</span>
                      <span className="category-card-name">{cat.name}</span>
                      <p className="category-card-desc">{cat.desc}</p>
                      <span className="category-card-tag">Explore →</span>
                    </div>
                  </Link>
                </RevealSection>
              ))}
            </div>

            {/* Category Specialities */}
            <div style={{ marginTop: "64px" }}>
              <RevealSection>
                <div className="section-label" style={{ justifyContent: "center", display: "flex" }}>Category Specialities</div>
                <h3 className="section-title" style={{ textAlign: "center", fontSize: "clamp(1.4rem, 3vw, 2rem)", marginBottom: "40px" }}>
                  What Makes Each Collection Special
                </h3>
              </RevealSection>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "24px" }}>
                {CATEGORIES.map((cat, i) => (
                  <RevealSection key={cat.key} delay={(i % 4 + 1) as 1 | 2 | 3 | 4}>
                    <div style={{
                      background: "#fff",
                      borderRadius: "20px",
                      padding: "28px 24px",
                      border: "1px solid rgba(200,146,42,0.15)",
                      boxShadow: "0 2px 12px rgba(38,0,1,0.06)",
                    }}>
                      <div style={{ fontSize: "2rem", marginBottom: "12px" }}>{cat.emoji}</div>
                      <div style={{ fontWeight: 700, fontSize: "1.05rem", color: "var(--brand-deep)", marginBottom: "8px" }}>
                        {cat.name}
                      </div>
                      <p style={{ fontSize: "0.83rem", color: "var(--text-mid)", lineHeight: 1.55, marginBottom: "16px" }}>
                        {cat.importance}
                      </p>
                      <ul style={{ listStyle: "none", padding: 0, display: "flex", flexWrap: "wrap", gap: "6px" }}>
                        {cat.specialities.map((s) => (
                          <li key={s} style={{
                            background: "var(--brand-cream)",
                            border: "1px solid rgba(200,146,42,0.2)",
                            borderRadius: "99px",
                            padding: "3px 12px",
                            fontSize: "0.73rem",
                            fontWeight: 600,
                            color: "var(--brand-mid)",
                          }}>{s}</li>
                        ))}
                      </ul>
                    </div>
                  </RevealSection>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ═══ 4. WHY CHOOSE SENGANTHAL ═══════════════════ */}
        <section className="why-section" id="home-why">
          <div className="why-inner">
            <RevealSection>
              <div className="why-header">
                <div className="section-label">Why Senganthal</div>
                <h2 className="section-title">Shopping Made Simple</h2>
                <p className="section-subtitle">
                  We want it to be easy to look around, compare a few pieces, and ask a question
                  when you need a little help.
                </p>
              </div>
            </RevealSection>

            <div className="why-features">
              {WHY_FEATURES.map((f, i) => (
                <RevealSection key={f.title} delay={(i % 4 + 1) as 1 | 2 | 3 | 4}>
                  <div className="why-feature" id={`why-${i + 1}`}>
                    <div className="why-feature-icon">{f.icon}</div>
                    <div className="why-feature-title">{f.title}</div>
                    <p className="why-feature-desc">{f.desc}</p>
                  </div>
                </RevealSection>
              ))}
            </div>
          </div>
        </section>

        {/* ═══ 5. FEATURED DRESSES ════════════════════════ */}
        <section className="bestsellers-section" id="home-bestsellers">
          <div className="bestsellers-inner">
            <RevealSection>
              <div className="section-top-row">
                <div>
                  <div className="section-label">Take a Look</div>
                  <h2 className="section-title">Featured Dresses</h2>
                </div>
                <Link to="/search" className="section-cta outline" id="bestsellers-view-all">
                  View All <span className="arrow-icon">→</span>
                </Link>
              </div>
            </RevealSection>

            <div className="products-grid">
              {loading ? (
                <div className="loading-spinner">
                  <div className="spinner-ring" />
                  <span className="loading-text">Loading dresses…</span>
                </div>
              ) : catalogError ? (
                <p className="products-empty" role="alert">{catalogError}</p>
              ) : featuredDresses.length > 0 ? (
                featuredDresses.map((d, i) => (
                  <RevealSection key={d.id} delay={(i % 4 + 1) as 1 | 2 | 3 | 4}>
                    <ProductCard dress={d} />
                  </RevealSection>
                ))
              ) : (
                <p className="products-empty">New dresses will appear here when they are added. <Link to="/search">Browse the catalog</Link></p>
              )}
            </div>
          </div>
        </section>

        {/* ═══ 6. FRESH ARRIVALS ══════════════════════════ */}
        <section className="arrivals-section" id="home-arrivals">
          <div className="arrivals-inner">
            <RevealSection>
              <div className="section-top-row">
                <div>
                  <div className="section-label">Just In</div>
                  <h2 className="section-title">Fresh Arrivals</h2>
                </div>
                <Link to="/new-arrivals" className="section-cta gold" id="arrivals-view-all">
                  See All New Arrivals <span className="arrow-icon">→</span>
                </Link>
              </div>
            </RevealSection>

            <div className="arrivals-strip" id="arrivals-scroll-strip">
              {loading ? (
                <div style={{ display: "flex", gap: "20px" }}>
                  {[1, 2, 3, 4].map((k) => (
                    <div key={k} style={{
                      flex: "0 0 260px", height: "380px",
                      background: "linear-gradient(90deg, #f0e8d8 25%, #f8f0e0 50%, #f0e8d8 75%)",
                      backgroundSize: "200% 100%",
                      animation: "shimmer 1.4s infinite",
                      borderRadius: "28px",
                    }} />
                  ))}
                </div>
              ) : catalogError ? (
                <p className="arrivals-empty" role="alert">{catalogError}</p>
              ) : freshArrivals.length > 0 ? (
                freshArrivals.map((d) => (
                  <Link to={`/dress/${encodeURIComponent(d.id)}`} key={d.id} className="arrival-card">
                    <div className="arrival-img-wrap">
                      {d.images?.[0]?.imageUrl ? (
                        <img src={d.images[0].imageUrl} alt={d.name} loading="lazy" />
                      ) : (
                        <div style={{
                          width: "100%", height: "100%",
                          background: "linear-gradient(160deg, #fdf0e0 0%, #f5d88a 100%)",
                          display: "flex", alignItems: "center", justifyContent: "center",
                          fontSize: "3rem",
                        }}>🌺</div>
                      )}
                      <span className="arrival-new-badge">New</span>
                    </div>
                    <div className="arrival-info">
                      <div className="arrival-name">{d.name}</div>
                      <div className="arrival-category">{d.category}</div>
                      <div className="arrival-price">₹{d.price}</div>
                    </div>
                  </Link>
                ))
              ) : (
                <p className="arrivals-empty">Fresh arrivals will appear here soon. <Link to="/search">Browse the catalog</Link></p>
              )}
            </div>
          </div>
        </section>

        {/* ═══ 7. TESTIMONIALS ════════════════════════════ */}
        <section className="testimonials-section" id="home-reviews">
          <div className="testimonials-inner">
            <RevealSection>
              <div className="testimonials-header">
                <div className="section-label">From Our Customers</div>
                <h2 className="section-title">What Our Customers Say</h2>
                <p className="section-subtitle" style={{ margin: "0 auto" }}>
                  A few notes shared with us by customers.
                </p>
              </div>
            </RevealSection>
            <div className="testimonials-grid">
              {reviews.slice(0, 3).map((review, i) => (
                <RevealSection key={review.id} delay={(i + 1) as 1 | 2 | 3 | 4}>
                  <div className="testimonial-card">
                    <span className="testimonial-quote">"</span>
                    <Stars count={review.stars} />
                    <p className="testimonial-text">"{review.description}"</p>
                    <div className="testimonial-author">
                      <div className="author-avatar">{review.name.slice(0, 2).toUpperCase()}</div>
                      <div>
                        <div className="author-name">{review.name}</div>
                        <div className="author-location">Customer review</div>
                      </div>
                    </div>
                  </div>
                </RevealSection>
              ))}
              {!reviews.length && <div className="testimonial-card testimonials-empty"><p className="testimonial-text">{reviewsError || "Customer reviews will appear here when they are shared."}</p></div>}
            </div>
            <RevealSection delay={4}>
              <div style={{ textAlign: "center", marginTop: "40px" }}>
                <Link to="/reviews" className="section-cta outline" id="reviews-view-all">
                  Read All Reviews <span className="arrow-icon">→</span>
                </Link>
              </div>
            </RevealSection>
          </div>
        </section>

        {/* ═══ 8. CTA BANNER ══════════════════════════════ */}
        <section className="cta-banner" id="home-newsletter">
          <div className="cta-banner-inner">
            <div className="cta-banner-label">🌺 Stay in the Loop</div>
            <h2 className="cta-banner-title">
              Hear About New Dresses &<br />Collection Updates
            </h2>
            <p className="cta-banner-sub">
              Leave your email if you'd like us to let you know when new pieces arrive.
            </p>
            {subscribed ? (
              <div style={{
                background: "rgba(40,167,69,0.2)", border: "1px solid rgba(40,167,69,0.4)",
                borderRadius: "99px", padding: "14px 32px",
                color: "#7fffa0", fontWeight: 700, fontSize: "1rem",
                display: "inline-block",
              }}>
                Thanks — your email has been added to our updates list.
              </div>
            ) : (
              <form className="cta-form" onSubmit={handleSubscribe} id="newsletter-form">
                <input
                  id="newsletter-email"
                  type="email"
                  maxLength={254}
                  className="cta-input"
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
                <button type="submit" className="cta-submit" id="newsletter-submit" disabled={subscribing}>
                  {subscribing ? "Saving…" : "Subscribe"}
                </button>
              </form>
            )}
            {subscribeError && <p role="alert" className="cta-banner-sub">{subscribeError}</p>}
          </div>
        </section>

      </div>
      <Footer />
    </>
  );
}

export default HomePage;
