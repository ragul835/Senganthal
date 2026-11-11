import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { FiEye, FiEyeOff } from "react-icons/fi";
import Header from "../../components/Header/Header";
import { finishPasswordReset } from "../../services/auth";
import "./Admin.css";

export default function ResetPassword() {
  const [params] = useSearchParams();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [message, setMessage] = useState("");

  async function submit(event: FormEvent) { event.preventDefault(); try { await finishPasswordReset(params.get("userId") || "", params.get("secret") || "", password); setMessage("Password updated. You can log in now."); } catch (error) { setMessage(error instanceof Error ? error.message : "Reset failed."); } }

  return <><Header /><main className="admin-page"><div className="admin-card"><h1>Choose a new password</h1><form className="admin-form" onSubmit={submit}><div className="form-group"><label htmlFor="new-password">New password</label><div className="admin-password-field"><input id="new-password" type={showPassword ? "text" : "password"} minLength={8} required autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} /><button type="button" className="admin-password-toggle" aria-label={showPassword ? "Hide new password" : "Show new password"} aria-pressed={showPassword} onClick={() => setShowPassword(current => !current)}>{showPassword ? <FiEyeOff aria-hidden="true" /> : <FiEye aria-hidden="true" />}</button></div></div><button className="upload-button">Save password</button></form><p role="status">{message}</p><Link to="/admin/login">Admin login</Link></div></main></>;
}
