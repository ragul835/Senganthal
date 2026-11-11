import { useEffect, useState, type ReactNode } from "react";
import { Link, useLocation } from "react-router-dom";
import { getAdmin } from "../../services/auth";

export default function RequireAdmin({ children }: { children: ReactNode }) {
  const [allowed, setAllowed] = useState<boolean | null>(null);
  const location = useLocation();
  useEffect(() => {
    let live = true;
    void getAdmin().then(admin => { if (live) setAllowed(Boolean(admin)); });
    return () => { live = false; };
  }, [location.pathname]);
  if (allowed === null) return <main className="admin-page">Checking admin access…</main>;
  if (!allowed) return <main className="admin-page"><div className="admin-card"><h1>Admin access required</h1><Link className="upload-button" to="/admin/login">Admin login</Link></div></main>;
  return <>{children}</>;
}
