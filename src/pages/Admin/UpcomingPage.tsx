import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link } from "react-router-dom";
import Header from "../../components/Header/Header";
import Footer from "../../components/Footer/Footer";
import "./Admin.css";
import { saveUpcoming } from "../../services/upcoming";
import { compressImage, formatSize, type CompressedImage } from "../../services/images";

type RawFile = { id: string; file: File };

function UpcomingPage() {
  const [title, setTitle] = useState("");
  const [status, setStatus] = useState("Upcoming");
  const [description, setDescription] = useState("");
  const [mainRaw, setMainRaw] = useState<RawFile[]>([]);
  const [mainCompressed, setMainCompressed] = useState<CompressedImage[]>([]);
  const [workRaw, setWorkRaw] = useState<RawFile[]>([]);
  const [workCompressed, setWorkCompressed] = useState<CompressedImage[]>([]);
  const [compressing, setCompressing] = useState<"" | "main" | "working">("");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);

  const handleSelect = (event: ChangeEvent<HTMLInputElement>, target: "main" | "working") => {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;
    const items = files.map(f => ({ id: crypto.randomUUID(), file: f }));
    if (target === "main") setMainRaw(prev => [...prev, ...items]);
    else setWorkRaw(prev => [...prev, ...items]);
    setMessage("Images selected. Click 'Compress' to optimize.");
    event.target.value = "";
  };

  const handleCompress = async (target: "main" | "working") => {
    const raw = target === "main" ? mainRaw : workRaw;
    if (!raw.length) return;
    setCompressing(target);
    try {
      const results = await Promise.all(raw.map(r => compressImage(r.file)));
      if (target === "main") { setMainCompressed(prev => [...prev, ...results]); setMainRaw([]); }
      else { setWorkCompressed(prev => [...prev, ...results]); setWorkRaw([]); }
      setMessage("Compression complete. Review and save.");
    } catch (err) { setMessage(err instanceof Error ? err.message : "Compression failed."); }
    finally { setCompressing(""); }
  };

  const removeRaw = (id: string, target: "main" | "working") => {
    if (target === "main") setMainRaw(prev => prev.filter(r => r.id !== id));
    else setWorkRaw(prev => prev.filter(r => r.id !== id));
  };

  const removeCompressed = (id: string, target: "main" | "working") => {
    const setter = target === "main" ? setMainCompressed : setWorkCompressed;
    setter(prev => {
      const img = prev.find(i => i.id === id);
      if (img) URL.revokeObjectURL(img.previewUrl);
      return prev.filter(i => i.id !== id);
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!title.trim() || !description.trim()) { setMessage("Please add a title and description."); return; }
    if (!mainCompressed.length) { setMessage("Please add and compress at least the final look images."); return; }
    if (mainRaw.length || workRaw.length) { setMessage("Please compress all selected images before saving."); return; }

    setIsSaving(true);
    setMessage("Saving upcoming dress...");
    try {
      await saveUpcoming({
        title: title.trim(),
        status,
        description: description.trim(),
        mainImages: mainCompressed.map(i => i.compressed),
        workingImages: workCompressed.length ? workCompressed.map(i => i.compressed) : mainCompressed.map(i => i.compressed),
      });
      setMessage(`Upcoming dress "${title}" saved successfully!`);
      setTitle(""); setDescription(""); setStatus("Upcoming");
      mainCompressed.forEach(i => URL.revokeObjectURL(i.previewUrl));
      workCompressed.forEach(i => URL.revokeObjectURL(i.previewUrl));
      setMainCompressed([]); setWorkCompressed([]);
    } catch (error) { setMessage(error instanceof Error ? error.message : "Could not save. Please try again."); }
    finally { setIsSaving(false); }
  };

  function renderSection(label: string, hint: string, inputId: string, target: "main" | "working", raw: RawFile[], compressed: CompressedImage[]) {
    return (
      <div className="upcoming-image-section">
        <div className="upcoming-section-header">
          <h3>{label}</h3>
          <p className="helper-text">{hint}</p>
        </div>

        <label className="upload-label" htmlFor={inputId}>Select images</label>
        <input id={inputId} type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => handleSelect(e, target)} style={{ display: "none" }} />

        {raw.length > 0 && (
          <div className="compress-section">
            <div className="compress-file-list">
              {raw.map(r => (
                <div className="compress-file-row" key={r.id}>
                  <span className="compress-file-name">{r.file.name}</span>
                  <span className="compress-file-size">Original: {formatSize(r.file.size)}</span>
                  <button type="button" className="preview-remove-inline" onClick={() => removeRaw(r.id, target)}>Remove</button>
                </div>
              ))}
            </div>
            <button type="button" className="upload-button compress-button" onClick={() => handleCompress(target)} disabled={!!compressing}>
              {compressing === target ? "Compressing..." : "Compress images"}
            </button>
          </div>
        )}

        {compressed.length > 0 && (
          <div className="preview-grid">
            {compressed.map(img => (
              <div className="preview-card" key={img.id}>
                <button type="button" className="preview-remove" onClick={() => removeCompressed(img.id, target)}>x</button>
                <img src={img.previewUrl} alt={img.compressed.name} />
                <div className="compress-info">
                  <span className="compress-original">Original: {formatSize(img.originalSize)}</span>
                  <span className="compress-result">Compressed: {formatSize(img.compressedSize)}</span>
                  {img.originalSize > img.compressedSize && <span className="compress-saved">Saved {Math.round((1 - img.compressedSize / img.originalSize) * 100)}%</span>}
                </div>
              </div>
            ))}
          </div>
        )}

        {!raw.length && !compressed.length && <p className="empty-state">No images selected yet.</p>}
      </div>
    );
  }

  return (
    <>
      <Header />
      <section className="admin-page">
        <div className="admin-card">
          <div className="admin-page-header">
            <div>
              <p className="eyebrow">Admin</p>
              <h1>Upcoming dresses</h1>
              <p>Share a new upcoming dress look with customers.</p>
            </div>
            <Link className="secondary-link" to="/admin">Back to admin</Link>
          </div>

          <form className="admin-form" onSubmit={handleSubmit}>
            <div className="form-group">
              <label htmlFor="upcoming-title">Dress title</label>
              <input id="upcoming-title" type="text" placeholder="Enter upcoming dress name" value={title} onChange={e => setTitle(e.target.value)} />
            </div>
            <div className="form-group">
              <label htmlFor="upcoming-status">Type</label>
              <select id="upcoming-status" value={status} onChange={e => setStatus(e.target.value)}>
                <option value="Upcoming">Upcoming</option>
                <option value="Ready to finish">Ready to finish</option>
                <option value="Next arrivals">Next arrivals</option>
              </select>
            </div>
            <div className="form-group">
              <label htmlFor="upcoming-description">Description</label>
              <textarea id="upcoming-description" rows={4} placeholder="Tell customers what makes this design special" value={description} onChange={e => setDescription(e.target.value)} />
            </div>

            {renderSection("Final look images", "The finished dress photos customers will see", "main-images", "main", mainRaw, mainCompressed)}
            {renderSection("Working process images (optional)", "Behind-the-scenes or in-progress photos", "working-images", "working", workRaw, workCompressed)}

            <button className="upload-button" type="submit" disabled={!mainCompressed.length || isSaving}>
              {isSaving ? "Saving..." : "Save upcoming dress"}
            </button>
            {message && <p className="status-message">{message}</p>}
          </form>
        </div>
      </section>
      <Footer />
    </>
  );
}

export default UpcomingPage;
