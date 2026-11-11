import { useCallback, useEffect, useState } from "react";
import type { ChangeEvent } from "react";
import { Link, useParams } from "react-router-dom";
import Header from "../../components/Header/Header";
import { deleteDressImage, getAllDressesWithImages, uploadDressImage, updateDressRow } from "../../services/appwrite";
import "./Admin.css";
import { compressImage, formatSize, type CompressedImage } from "../../services/images";

type DressImage = {
  fileId: string;
  imageUrl: string;
  rowId?: string;
};

type DressItem = {
  id: string;
  name: string;
  price: string;
  category?: string;
  images: DressImage[];
};

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function DressDetailsPage() {
  const { dressId } = useParams();
  const [dress, setDress] = useState<DressItem | null>(null);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [category, setCategory] = useState("New Dress");
  const [sizes, setSizes] = useState("");
  const [description, setDescription] = useState("");
  const [washCare, setWashCare] = useState("");
  const [shipping, setShipping] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [uploadValidationMessage, setUploadValidationMessage] = useState("");
  const [rawFiles, setRawFiles] = useState<Array<{ id: string; file: File }>>([]);
  const [compressedImages, setCompressedImages] = useState<CompressedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);

  const loadDress = useCallback(async () => {
    setIsLoading(true);
    setErrorMessage("");
    try {
      const dresses = await getAllDressesWithImages();
      const selectedDress = dresses.find((item) => item.id === dressId) ?? null;
      setDress(selectedDress);
      setName(selectedDress?.name ?? "");
      setPrice(selectedDress?.price ?? "");
      setCategory(selectedDress?.category ?? "New Dress");
      setSizes(selectedDress?.sizes ?? "");
      setDescription(selectedDress?.description ?? "");
      setWashCare(selectedDress?.washCare ?? "");
      setShipping(selectedDress?.shipping ?? "");
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to load dress details.");
    } finally {
      setIsLoading(false);
    }
  }, [dressId]);

  useEffect(() => {
    let isMounted = true;
    const fetchDress = async () => { if (isMounted) await loadDress(); };
    void fetchDress();
    return () => { isMounted = false; };
  }, [loadDress]);

  const handleSelectImages = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!files.length) return;
    if (files.some(file => !ALLOWED_IMAGE_EXTENSIONS.some(ext => file.name.toLowerCase().endsWith(ext)))) {
      setUploadValidationMessage("Choose a JPG, PNG, or WebP image.");
      return;
    }
    setUploadValidationMessage("");
    setRawFiles(prev => [...prev, ...files.map(f => ({ id: crypto.randomUUID(), file: f }))]);
  };

  const removeRawFile = (id: string) => setRawFiles(prev => prev.filter(f => f.id !== id));

  const removeCompressed = (id: string) => {
    setCompressedImages(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleCompress = async () => {
    if (!rawFiles.length) return;
    setIsCompressing(true);
    setUploadValidationMessage("");
    try {
      const results = await Promise.all(rawFiles.map(r => compressImage(r.file)));
      setCompressedImages(prev => [...prev, ...results]);
      setRawFiles([]);
    } catch (err) {
      setUploadValidationMessage(err instanceof Error ? err.message : "Compression failed.");
    } finally {
      setIsCompressing(false);
    }
  };

  const handleUploadCompressed = async () => {
    if (!dressId || !compressedImages.length) return;
    setIsUploading(true);
    setErrorMessage("");
    try {
      for (const img of compressedImages) {
        await uploadDressImage(dressId, img.compressed);
      }
      compressedImages.forEach(img => URL.revokeObjectURL(img.previewUrl));
      setCompressedImages([]);
      await loadDress();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to upload images.");
    } finally {
      setIsUploading(false);
    }
  };

  const handleDeleteImage = async (image: DressImage) => {
    if (!image.fileId) return;
    setIsDeleting(true);
    setErrorMessage("");
    try {
      await deleteDressImage(image.fileId);
      setDress((currentDress) =>
        currentDress
          ? { ...currentDress, images: currentDress.images.filter((item) => item.fileId !== image.fileId) }
          : currentDress,
      );
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to delete image.");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSaveChanges = async () => {
    if (!dressId) return;
    if (!name.trim() || !price.trim()) { setErrorMessage("Please enter the dress name and price."); return; }
    setIsSaving(true);
    setErrorMessage("");
    try {
      await updateDressRow(dressId, name.trim(), price.trim(), category, { sizes: sizes.trim(), description: description.trim(), washCare: washCare.trim(), shipping: shipping.trim() });
      setErrorMessage("Changes saved successfully.");
      await loadDress();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to save changes.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <>
      <Header />
      <section className="admin-page">
        <div className="admin-card dress-details-card">
          <div className="admin-page-header">
            <div>
              <p className="eyebrow">Admin</p>
              <h1>Dress details</h1>
              <p>Review the current images and edit the dress name or price.</p>
            </div>
            <Link className="secondary-link" to="/admin/edit">Back to edit list</Link>
          </div>

          {isLoading && <p className="empty-state">Loading dress details...</p>}
          {!isLoading && errorMessage && <p className="status-message">{errorMessage}</p>}
          {!isLoading && !dress && !errorMessage && <p className="empty-state">No dress found.</p>}

          {!isLoading && dress && (
            <div className="dress-details-layout">
              <div className="dress-details-form">
                <div className="form-group">
                  <label htmlFor="dress-name">Name</label>
                  <input id="dress-name" value={name} onChange={(e) => setName(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="dress-price">Price</label>
                  <input id="dress-price" type="number" min="0" step="0.01" value={price} onChange={(e) => setPrice(e.target.value)} />
                </div>
                <div className="form-group">
                  <label htmlFor="dress-category">Category</label>
                  <select id="dress-category" value={category} onChange={(e) => setCategory(e.target.value)}>
                    <option value="Sarees">Sarees</option>
                    <option value="Churidar">Churidar</option>
                    <option value="Cotton">Cotton</option>
                    <option value="Kids">Kids</option>
                    <option value="Anarkali">Anarkali</option>
                    <option value="New Dress">New Dress</option>
                  </select>
                </div>
                <div className="form-group"><label htmlFor="edit-sizes">Sizes (comma separated)</label><input id="edit-sizes" value={sizes} onChange={e => setSizes(e.target.value)} /></div>
                <div className="form-group"><label htmlFor="edit-description">Description</label><textarea id="edit-description" value={description} onChange={e => setDescription(e.target.value)} /></div>
                <div className="form-group"><label htmlFor="edit-care">Wash care</label><textarea id="edit-care" value={washCare} onChange={e => setWashCare(e.target.value)} /></div>
                <div className="form-group"><label htmlFor="edit-shipping">Shipping</label><textarea id="edit-shipping" value={shipping} onChange={e => setShipping(e.target.value)} /></div>
                <button type="button" className="upload-button" onClick={handleSaveChanges} disabled={isSaving}>
                  {isSaving ? "Saving..." : "Save changes"}
                </button>
              </div>

              <div className="dress-details-images">
                <h2>Images</h2>

                <div className="image-upload-section">
                  <label className="upload-label" htmlFor="dress-detail-images">Select new images</label>
                  <input id="dress-detail-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleSelectImages} style={{ display: "none" }} />
                  <p className="helper-text">Formats: JPG, PNG, WebP. Images over 5 MB will be compressed.</p>
                  {uploadValidationMessage && <p className="error-text">{uploadValidationMessage}</p>}
                </div>

                {rawFiles.length > 0 && (
                  <div className="compress-section">
                    <h3>Selected images</h3>
                    <div className="compress-file-list">
                      {rawFiles.map(r => (
                        <div className="compress-file-row" key={r.id}>
                          <span className="compress-file-name">{r.file.name}</span>
                          <span className="compress-file-size">Original: {formatSize(r.file.size)}</span>
                          <button type="button" className="preview-remove-inline" onClick={() => removeRawFile(r.id)}>Remove</button>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="upload-button compress-button" onClick={handleCompress} disabled={isCompressing}>
                      {isCompressing ? "Compressing..." : "Compress images"}
                    </button>
                  </div>
                )}

                {compressedImages.length > 0 && (
                  <div className="compress-section">
                    <h3>Compressed preview</h3>
                    <div className="preview-grid">
                      {compressedImages.map(img => (
                        <div className="preview-card" key={img.id}>
                          <button type="button" className="preview-remove" onClick={() => removeCompressed(img.id)} aria-label={`Remove ${img.compressed.name}`}>x</button>
                          <img src={img.previewUrl} alt={img.compressed.name} />
                          <div className="compress-info">
                            <span className="compress-original">Original: {formatSize(img.originalSize)}</span>
                            <span className="compress-result">Compressed: {formatSize(img.compressedSize)}</span>
                            {img.originalSize > img.compressedSize && (
                              <span className="compress-saved">Saved {Math.round((1 - img.compressedSize / img.originalSize) * 100)}%</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                    <button type="button" className="upload-button" disabled={isUploading} onClick={() => void handleUploadCompressed()}>
                      {isUploading ? "Uploading..." : "Upload images"}
                    </button>
                  </div>
                )}

                {dress.images.length > 0 ? (
                  <div className="dress-image-grid detail-image-grid">
                    {dress.images.map((image, index) => (
                      <div className="edit-image-card image-delete-card" key={`${dress.id}-${image.fileId || index}`}>
                        <button type="button" className="image-delete-button" onClick={() => void handleDeleteImage(image)} disabled={isDeleting} aria-label={`Delete ${dress.name} image ${index + 1}`}>
                          &times;
                        </button>
                        <img src={image.imageUrl} alt={`${dress.name} ${index + 1}`} />
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="empty-state">No images attached yet.</p>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </>
  );
}

export default DressDetailsPage;
