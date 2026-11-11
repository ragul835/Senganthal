import { Link, useNavigate } from "react-router-dom";
import Header from "../../components/Header/Header";
import { logoutAdmin } from "../../services/auth";
import "./Admin.css";

function Admin() {
  const navigate = useNavigate();

  async function logOut() {
    await logoutAdmin();
    navigate("/admin/login", { replace: true });
  }

  return (
    <>
      <Header />
      <section className="admin-page">
        <div className="admin-card admin-landing-card">
          <p className="eyebrow">Admin</p>
          <h1>Dress management</h1>
          <p>Select an action to create or update dresses in the catalog.</p>

          <div className="admin-action-stack">
            <Link className="admin-action-button" to="/admin/add">
              <span className="admin-action-title">Add dress</span>
              <span className="admin-action-desc">Create a new dress listing with images and pricing.</span>
            </Link>

            <Link className="admin-action-button" to="/admin/edit">
              <span className="admin-action-title">Edit dress</span>
              <span className="admin-action-desc">Search, update, or delete dresses from the collection.</span>
            </Link>

            <Link className="admin-action-button" to="/admin/upcoming">
              <span className="admin-action-title">Upcoming</span>
              <span className="admin-action-desc">Upload upcoming dresses, ready-to-finish looks, or next arrivals.</span>
            </Link>

            <Link className="admin-action-button" to="/admin/add-review">
              <span className="admin-action-title">Add customer review</span>
              <span className="admin-action-desc">Submit a new customer review to display on the site.</span>
            </Link>

            <Link className="admin-action-button" to="/admin/orders">
              <span className="admin-action-title">Orders</span>
              <span className="admin-action-desc">View customer details and update order status.</span>
            </Link>

            <Link className="admin-action-button" to="/admin/messages">
              <span className="admin-action-title">Customer messages</span>
              <span className="admin-action-desc">Read and reply to questions sent through the contact form.</span>
            </Link>

            <Link className="admin-action-button" to="/admin/subscribers">
              <span className="admin-action-title">Updates list</span>
              <span className="admin-action-desc">View people who asked to hear about new dresses.</span>
            </Link>
          </div>

          <button className="secondary-link" type="button" onClick={() => void logOut()}>Log out</button>
        </div>
      </section>
    </>
  );
}

export default Admin;
