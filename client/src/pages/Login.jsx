import { useState } from "react";
import { Link, useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
export default function Login() {
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState(""),
    [error, setError] = useState("");
    
  const { login } = useAuth(),
    nav = useNavigate(),
    loc = useLocation();
  const infoMessage = loc.state?.message;
  const submit = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await login({ email, password });
      nav("/dashboard");
    } catch (x) {
      setError(x.response?.data?.message || "Login failed");
    }
  };
  return (
    <div className="auth">
      <form className="card form" onSubmit={submit}>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to manage your crops.</p>
        {infoMessage && !error && (
          <div
            className="pill completed"
            style={{
              display: "block",
              textAlign: "center",
              padding: "10px",
              margin: "10px 0",
              fontSize: "14px",
            }}
          >
            {infoMessage}
          </div>
        )}
        {error && <div className="error">{error}</div>}
        <label>
          Email
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            required
          />
        </label>
        <label>
          Password
          <input
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            type="password"
            minLength="6"
            required
          />
        </label>
        <button>Login</button>
        <p>
          New farmer? <Link to="/register">Create account</Link>
        </p>
      </form>
    </div>
  );
}
