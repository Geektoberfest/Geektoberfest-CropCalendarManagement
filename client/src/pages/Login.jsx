import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const { login } = useAuth();
  const nav = useNavigate();

  const validateForm = () => {
    const errs = {};
    if (!email || !email.trim()) {
      errs.email = "Email address is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        errs.email = "Please enter a valid email address";
      }
    }

    if (!password) {
      errs.password = "Password is required";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    try {
      await login({ email, password });
      nav("/dashboard");
    } catch (x) {
      setError(x.response?.data?.message || "Login failed");
    }
  };

  return (
    <div className="auth">
      <form className="card form" onSubmit={submit} noValidate>
        <h1>Welcome back</h1>
        <p className="muted">Sign in to manage your crops.</p>
        {error && <div className="error">{error}</div>}

        <label>
          Email Address *
          <input
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              if (fieldErrors.email) setFieldErrors({ ...fieldErrors, email: "" });
            }}
            type="email"
            className={fieldErrors.email ? "input-error" : ""}
            placeholder="farmer@example.com"
          />
          {fieldErrors.email && (
            <span className="field-error">{fieldErrors.email}</span>
          )}
        </label>

        <label>
          Password *
          <input
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              if (fieldErrors.password) setFieldErrors({ ...fieldErrors, password: "" });
            }}
            type="password"
            className={fieldErrors.password ? "input-error" : ""}
            placeholder="••••••••"
          />
          {fieldErrors.password && (
            <span className="field-error">{fieldErrors.password}</span>
          )}
        </label>

        <button type="submit">Login</button>
        <p>
          New farmer? <Link to="/register">Create account</Link>
        </p>
      </form>
    </div>
  );
}
