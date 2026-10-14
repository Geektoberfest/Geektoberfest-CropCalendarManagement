import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/authService";

export default function Register() {
  const [f, setF] = useState({
    name: "",
    email: "",
    password: "",
    confirm: "",
    phone: "",
    location: "",
    role: "farmer",
  });
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const nav = useNavigate();

  const change = (e) => {
    const { name, value } = e.target;
    setF({ ...f, [name]: value });
    if (fieldErrors[name]) {
      setFieldErrors({ ...fieldErrors, [name]: "" });
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!f.name || !f.name.trim()) {
      errs.name = "Full name is required";
    }

    if (!f.email || !f.email.trim()) {
      errs.email = "Email address is required";
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(f.email.trim())) {
        errs.email = "Please enter a valid email address";
      }
    }

    if (!f.password) {
      errs.password = "Password is required";
    } else if (f.password.length < 6) {
      errs.password = "Password must be at least 6 characters";
    }

    if (!f.confirm) {
      errs.confirm = "Please confirm your password";
    } else if (f.password !== f.confirm) {
      errs.confirm = "Passwords do not match";
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
      await register(f);
      nav("/login");
    } catch (x) {
      const msg = x.response?.data?.message || "Registration failed";
      setError(msg);
      if (msg.toLowerCase().includes("email")) {
        setFieldErrors((prev) => ({ ...prev, email: msg }));
      }
    }
  };

  return (
    <div className="auth">
      <form className="card form" onSubmit={submit} noValidate>
        <h1>Create account</h1>
        {error && <div className="error">{error}</div>}

        <label>
          Full Name *
          <input
            name="name"
            value={f.name}
            onChange={change}
            className={fieldErrors.name ? "input-error" : ""}
            placeholder="John Farmer"
          />
          {fieldErrors.name && (
            <span className="field-error">{fieldErrors.name}</span>
          )}
        </label>

        <label>
          Email Address *
          <input
            name="email"
            type="email"
            value={f.email}
            onChange={change}
            className={fieldErrors.email ? "input-error" : ""}
            placeholder="farmer@example.com"
          />
          {fieldErrors.email && (
            <span className="field-error">{fieldErrors.email}</span>
          )}
        </label>

        <label>
          Phone
          <input
            name="phone"
            type="tel"
            value={f.phone}
            onChange={change}
            placeholder="+1 234 567 8900"
          />
        </label>

        <label>
          Farm Location
          <input
            name="location"
            value={f.location}
            onChange={change}
            placeholder="e.g. Springfield Valley"
          />
        </label>

        <label>
          Password *
          <input
            name="password"
            type="password"
            value={f.password}
            onChange={change}
            className={fieldErrors.password ? "input-error" : ""}
            placeholder="Minimum 6 characters"
          />
          {fieldErrors.password && (
            <span className="field-error">{fieldErrors.password}</span>
          )}
        </label>

        <label>
          Confirm Password *
          <input
            name="confirm"
            type="password"
            value={f.confirm}
            onChange={change}
            className={fieldErrors.confirm ? "input-error" : ""}
            placeholder="Re-enter password"
          />
          {fieldErrors.confirm && (
            <span className="field-error">{fieldErrors.confirm}</span>
          )}
        </label>

        <button type="submit">Create account</button>
        <p>
          Already registered? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
