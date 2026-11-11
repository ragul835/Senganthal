import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import { getAllDressesWithImages } from "../../services/appwrite";
import type { DressWithImages } from "../../services/appwrite";
import "../Admin/Admin.css";
import "./SearchPage.css";

const CATEGORIES = ["all", "Sarees", "Churidar", "Cotton", "Kids", "Anarkali", "New Dress"];

function SearchPage() {
  const [params] = useSearchParams();
  const [dresses, setDresses] = useState<DressWithImages[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  const [searchTerm, setSearchTerm] = useState(params.get("q") || "");
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [maxPrice, setMaxPrice] = useState("");
  const [sortBy, setSortBy] = useState("name-asc");

  useEffect(() => {
    let isMounted = true;
    const fetchDresses = async () => {
      setIsLoading(true);
      try {
        const records = await getAllDressesWithImages();
        if (isMounted) {
          setDresses(records);
        }
      } catch (error) {
        if (isMounted) {
          setErrorMessage(error instanceof Error ? error.message : "Unable to load dresses.");
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void fetchDresses();
    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDresses = useMemo(() => {
    let result = [...dresses];

    // Filter by name
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      const terms = term === "churidar" ? ["churidar", "salwar", "anarkali"] : term === "kids" ? ["kids", "children", "child"] : term === "sarees" ? ["saree", "sarees"] : [term];
      result = result.filter((dress) => terms.some(value => `${dress.name} ${dress.category || ""}`.toLowerCase().includes(value)));
    }

    // Filter by category
    if (selectedCategory !== "all") {
      result = result.filter(
        (dress) => (dress.category || "New Dress").toLowerCase() === selectedCategory.toLowerCase()
      );
    }

    // Filter by max price
    if (maxPrice.trim()) {
      const priceNum = parseFloat(maxPrice);
      if (!isNaN(priceNum)) {
        result = result.filter((dress) => {
          const itemPrice = parseFloat(dress.price);
          return isNaN(itemPrice) || itemPrice <= priceNum;
        });
      }
    }

    // Sort
    if (sortBy === "price-asc") {
      result.sort((a, b) => parseFloat(a.price || "0") - parseFloat(b.price || "0"));
    } else if (sortBy === "price-desc") {
      result.sort((a, b) => parseFloat(b.price || "0") - parseFloat(a.price || "0"));
    } else if (sortBy === "name-desc") {
      result.sort((a, b) => b.name.localeCompare(a.name));
    } else {
      // Default name-asc
      result.sort((a, b) => a.name.localeCompare(b.name));
    }

    return result;
  }, [dresses, searchTerm, selectedCategory, maxPrice, sortBy]);

  return (
    <>
      <Header />
      <main className="page-content search-page">
        <section className="search-container">
          <div className="search-header">
            <h1>Search Dress Catalog</h1>
            <p>Find your perfect style.</p>
          </div>

          <div className="search-filter-card">
            {/* Search Input */}
            <div className="form-group search-bar-wrapper">
              <input
                type="text"
                placeholder="Search by dress name..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="search-input"
              />
            </div>

            {/* Filters Row */}
            <div className="filters-row">
              {/* Max Price Filter */}
              <div className="form-group price-filter">
                <label htmlFor="max-price">Max Price (₹)</label>
                <input
                  id="max-price"
                  type="number"
                  placeholder="Enter max price"
                  value={maxPrice}
                  onChange={(e) => setMaxPrice(e.target.value)}
                  min="0"
                />
              </div>

              {/* Sort By Option */}
              <div className="form-group sort-filter">
                <label htmlFor="sort-by">Sort By</label>
                <select
                  id="sort-by"
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                >
                  <option value="name-asc">Name: A to Z</option>
                  <option value="name-desc">Name: Z to A</option>
                  <option value="price-asc">Price: Low to High</option>
                  <option value="price-desc">Price: High to Low</option>
                </select>
              </div>
            </div>

            {/* Category Filter Pills */}
            <div className="category-pills-container">
              <span className="pills-label">Categories:</span>
              <div className="category-pills">
                {CATEGORIES.map((cat) => (
                  <button
                    key={cat}
                    type="button"
                    className={`pill-btn ${selectedCategory === cat ? "active" : ""}`}
                    onClick={() => setSelectedCategory(cat)}
                  >
                    {cat === "all" ? "All" : cat}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Results State */}
          {isLoading && <p className="empty-state">Loading catalog...</p>}
          {!isLoading && errorMessage && <p className="status-message">{errorMessage}</p>}

          {!isLoading && !errorMessage && (
            <>
              <div className="results-info">
                <p>Showing {filteredDresses.length} result{filteredDresses.length !== 1 ? "s" : ""}</p>
              </div>

              {filteredDresses.length > 0 ? (
                <div className="dress-grid search-grid">
                  {filteredDresses.map((dress) => {
                    const primaryImage = dress.images[0];
                    return (
                      <Link className="dress-card catalog-card" to={`/dress/${encodeURIComponent(dress.id)}`} key={dress.id}>
                        {primaryImage ? (
                          <div className="edit-image-card single-image-card">
                            <img src={primaryImage.imageUrl} alt={dress.name} />
                          </div>
                        ) : (
                          <div className="empty-image-placeholder">No Image Available</div>
                        )}
                        <div className="catalog-card-info">
                          <h3>{dress.name}</h3>
                          <p className="price-tag">₹{dress.price || "N/A"}</p>
                          <span className="category-tag">
                            {dress.category || "New Dress"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <p className="empty-state">No dresses match your search criteria.</p>
              )}
            </>
          )}
        </section>
      </main>
      <Footer />
    </>
  );
}

export default SearchPage;
