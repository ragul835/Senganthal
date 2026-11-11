import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Header from "../../components/Header/Header";
import { loginAdmin, requestPasswordReset } from "../../services/auth";
import "./Admin.css";

export default function AdminLogin() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("ragulsiva369@gmail.com");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [recover, setRecover] = useState(false);
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setMessage("");
    try {
      if (recover) {
        await requestPasswordReset(email.trim());
        setMessage("If this email is registered, a password reset link has been sent.");
      } else {
        await loginAdmin(email.trim(), password);
        navigate("/admin", { replace: true });
      }
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Please try again.");
    } finally {
      setBusy(false);
    }
  }

  function toggleRecovery() {
    setRecover(current => !current);
    setPassword("");
    setShowPassword(false);
    setMessage("");
  }

  return <>
    <Header />
    <main className="admin-page">
      <div className="admin-card admin-login-card">
        <h1>{recover ? "Reset password" : "Admin login"}</h1>
        <form className="admin-form" onSubmit={submit}>
          <div className="form-group">
            <label htmlFor="admin-email">Email</label>
            <input id="admin-email" type="email" required autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} />
          </div>
          {!recover && <div className="form-group">
            <label htmlFor="admin-password">Password</label>
            <div className="admin-password-field">
              <input id="admin-password" type={showPassword ? "text" : "password"} required autoComplete="current-password" value={password} onChange={event => setPassword(event.target.value)} />
              <button type="button" className="admin-password-toggle" aria-label={showPassword ? "Hide password" : "Show password"} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>
                {showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}
              </button>
            </div>
          </div>}
          <button type="submit" className="upload-button admin-login-submit" disabled={busy}>
            {busy ? "Please wait…" : recover ? "Send reset link" : "Log in"}
          </button>
        </form>
        <button type="button" className="admin-login-toggle" onClick={toggleRecovery} disabled={busy}>
          {recover ? "Back to login" : "Forgot password?"}
        </button>
        {message && <p role="status" className="status-message">{message}</p>}
      </div>
    </main>
  </>;
}
