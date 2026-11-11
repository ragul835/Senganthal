import { useMemo, useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import { uploadDressWithImages, type UploadProgressStatus, type UploadProgressStepId } from "../../services/appwrite";
import "./Admin.css";
import { compressImage, formatSize, type CompressedImage } from "../../services/images";

type UploadStep = {
  id: UploadProgressStepId;
  label: string;
  status: UploadProgressStatus;
  detail: string;
};

const ALLOWED_IMAGE_EXTENSIONS = [".jpg", ".jpeg", ".png", ".webp"];

function AddDressPage() {
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [category, setCategory] = useState("New Dress");
  const [sizes, setSizes] = useState("");
  const [description, setDescription] = useState("");
  const [washCare, setWashCare] = useState("");
  const [shipping, setShipping] = useState("");
  const [rawFiles, setRawFiles] = useState<Array<{ id: string; file: File }>>([]);
  const [compressedImages, setCompressedImages] = useState<CompressedImage[]>([]);
  const [isCompressing, setIsCompressing] = useState(false);
  const [statusMessage, setStatusMessage] = useState("");
  const [validationMessage, setValidationMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [uploadSteps, setUploadSteps] = useState<UploadStep[]>([
    { id: "image", label: "Uploaded image", status: "pending", detail: "Waiting" },
    { id: "price", label: "Price uploaded", status: "pending", detail: "Waiting" },
    { id: "path", label: "Image path added", status: "pending", detail: "Waiting" },
  ]);

  const canSelectMore = useMemo(() => (rawFiles.length + compressedImages.length) < 5, [rawFiles.length, compressedImages.length]);

  const handleImageSelection = (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const invalid = files.filter(f => !ALLOWED_IMAGE_EXTENSIONS.some(ext => f.name.toLowerCase().endsWith(ext)));
    if (invalid.length) {
      setValidationMessage("Choose a JPG, PNG, or WebP image.");
      event.target.value = "";
      return;
    }

    setValidationMessage("");
    const remaining = 5 - rawFiles.length - compressedImages.length;
    const toAdd = files.slice(0, remaining);
    if (!toAdd.length) { setStatusMessage("You can upload up to 5 images."); return; }

    setRawFiles(prev => [...prev, ...toAdd.map(f => ({ id: crypto.randomUUID(), file: f }))]);
    setStatusMessage("Images selected. Click 'Compress' to optimize them.");
    event.target.value = "";
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
    setStatusMessage("Compressing images...");
    try {
      const results = await Promise.all(rawFiles.map(r => compressImage(r.file)));
      setCompressedImages(prev => [...prev, ...results]);
      setRawFiles([]);
      setStatusMessage("Compression complete. Review the images, then upload.");
    } catch (err) {
      setValidationMessage(err instanceof Error ? err.message : "Compression failed.");
    } finally {
      setIsCompressing(false);
    }
  };

  const updateUploadStep = (stepId: UploadProgressStepId, status: UploadProgressStatus, detail: string) => {
    setUploadSteps(prev => prev.map(step => step.id === stepId ? { ...step, status, detail } : step));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!name.trim() || !price.trim()) { setStatusMessage("Please enter the dress name and price."); return; }
    if (!compressedImages.length) { setStatusMessage("Please select and compress at least one image."); return; }

    setIsSubmitting(true);
    setUploadSteps([
      { id: "image", label: "Uploaded image", status: "loading", detail: "Starting upload..." },
      { id: "price", label: "Price uploaded", status: "pending", detail: "Waiting" },
      { id: "path", label: "Image path added", status: "pending", detail: "Waiting" },
    ]);
    setStatusMessage("Uploading dress and images...");

    try {
      await uploadDressWithImages({
        name: name.trim(),
        price,
        category,
        details: { sizes: sizes.trim(), description: description.trim(), washCare: washCare.trim(), shipping: shipping.trim() },
        images: compressedImages.map(img => img.compressed),
        onStepUpdate: updateUploadStep,
      });
      setStatusMessage(`Dress "${name}" uploaded successfully.`);
      setName(""); setPrice(""); setCategory("New Dress"); setSizes(""); setDescription(""); setWashCare(""); setShipping("");
      setCompressedImages([]);
    } catch (error) {
      setStatusMessage(error instanceof Error ? error.message : "Upload failed.");
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
              <h1>Add dress</h1>
              <p>Create a new dress listing with a name, price, and images.</p>
            </div>
            <Link className="secondary-link" to="/admin">Back to admin</Link>
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="dress-name">Name</label>
              <input id="dress-name" type="text" placeholder="Enter dress name" value={name} onChange={e => setName(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="dress-price">Price</label>
              <input id="dress-price" type="number" min="0" step="0.01" placeholder="Enter price" value={price} onChange={e => setPrice(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="dress-category">Category</label>
              <select id="dress-category" value={category} onChange={e => setCategory(e.target.value)}>
                <option value="Sarees">Sarees</option>
                <option value="Churidar">Churidar</option>
                <option value="Cotton">Cotton</option>
                <option value="Kids">Kids</option>
                <option value="Anarkali">Anarkali</option>
                <option value="New Dress">New Dress</option>
              </select>
            </div>
            <div className="form-group"><label htmlFor="dress-sizes">Available sizes (comma separated)</label><input id="dress-sizes" value={sizes} onChange={e => setSizes(e.target.value)} placeholder="S, M, L" /></div>
            <div className="form-group"><label htmlFor="dress-description">Description</label><textarea id="dress-description" value={description} onChange={e => setDescription(e.target.value)} /></div>
            <div className="form-group"><label htmlFor="dress-care">Wash care</label><textarea id="dress-care" value={washCare} onChange={e => setWashCare(e.target.value)} /></div>
            <div className="form-group"><label htmlFor="dress-shipping">Shipping details</label><textarea id="dress-shipping" value={shipping} onChange={e => setShipping(e.target.value)} /></div>

            <div className="form-group image-upload-card">
              <label className="upload-label" htmlFor="dress-images">Select images</label>
              <input id="dress-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={handleImageSelection} />
              <p className="helper-text">Up to 5 images. Formats: JPG, PNG, WebP. Images over 5 MB will be compressed.</p>
              {validationMessage && <p className="error-text">{validationMessage}</p>}
              {!canSelectMore && <p className="error-text">Maximum 5 images reached.</p>}
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
              </div>
            )}

            <div className="upload-progress-list" aria-live="polite">
              {uploadSteps.map(step => {
                const isSuccess = step.status === "success";
                const isError = step.status === "error";
                const isLoading = step.status === "loading";
                return (
                  <div key={step.id} className={`upload-progress-item ${isSuccess ? "success" : ""} ${isError ? "error" : ""}`}>
                    <span className="upload-progress-icon">{isSuccess ? "✓" : isError ? "✕" : isLoading ? "⏳" : "•"}</span>
                    <div className="upload-progress-text"><strong>{step.label}</strong><p>{step.detail}</p></div>
                  </div>
                );
              })}
            </div>

            <button className="upload-button" type="submit" disabled={isSubmitting || isCompressing || (!compressedImages.length)}>
              {isSubmitting ? "Uploading..." : "Upload dress"}
            </button>
            {statusMessage && <p className="status-message">{statusMessage}</p>}
          </form>
        </div>
      </section>
    </>
  );
}

export default AddDressPage;
