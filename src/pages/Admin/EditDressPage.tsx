import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import { deleteDress, getAllDressesWithImages } from "../../services/appwrite";
import "./Admin.css";

type DressImage = {
  fileId: string;
  imageUrl: string;
};

type DressItem = {
  id: string;
  name: string;
  price: string;
  images: DressImage[];
};

function EditDressPage() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");
  const [dresses, setDresses] = useState<DressItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    let isMounted = true;

    const loadDresses = async () => {
      setIsLoading(true);
      setErrorMessage("");

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

    void loadDresses();

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredDresses = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();

    if (!normalizedSearch) {
      return dresses;
    }

    return dresses.filter((dress) => dress.name.toLowerCase().includes(normalizedSearch));
  }, [dresses, search]);

  return (
    <>
      <Header />
      <section className="admin-page">
        <div className="admin-card">
          <div className="admin-page-header">
            <div>
              <p className="eyebrow">Admin</p>
              <h1>Edit dress</h1>
              <p>Browse saved dresses and manage their images from the catalog.</p>
            </div>
            <Link className="secondary-link" to="/admin">
              Back to admin
            </Link>
          </div>

          <div className="filter-bar">
            <input
              type="text"
              placeholder="Search dresses"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
            />
          </div>

          {isLoading && <p className="empty-state">Loading dresses...</p>}

          {!isLoading && errorMessage && <p className="status-message">{errorMessage}</p>}

          {!isLoading && !errorMessage && (
            <div className="dress-grid">
              {filteredDresses.map((dress) => {
                const primaryImage = dress.images[0];

                return (
                  <article className="dress-card" key={dress.id}>
                    <div className="dress-card-header">
                      <div>
                        <strong>{dress.name}</strong>
                        <p>Price: {dress.price || "Not set"}</p>
                      </div>
                    </div>

                    {primaryImage ? (
                      <div className="edit-image-card single-image-card">
                        <img src={primaryImage.imageUrl} alt={dress.name} />
                      </div>
                    ) : (
                      <p className="empty-state">No images attached yet.</p>
                    )}

                    <div className="edit-image-actions">
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => navigate(`/admin/edit/${dress.id}`)}
                      >
                        Update
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={async () => {
                          if (!confirm(`Delete "${dress.name}"? This cannot be undone.`)) return;
                          try {
                            await deleteDress(dress.id);
                            setDresses(prev => prev.filter(d => d.id !== dress.id));
                          } catch (err) {
                            setErrorMessage(err instanceof Error ? err.message : "Delete failed.");
                          }
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </article>
                );
              })}
            </div>
          )}

          {!isLoading && !errorMessage && !filteredDresses.length && (
            <p className="empty-state">No dresses match your search.</p>
          )}
        </div>
      </section>
    </>
  );
}

export default EditDressPage;
