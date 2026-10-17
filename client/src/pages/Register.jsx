import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { register } from "../services/authService";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

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
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const change = (e) => setF({ ...f, [e.target.name]: e.target.value });

  const submit = async (e) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");

    if (!f.name.trim() || !f.email.trim() || !f.password) {
      return setError("Name, email and password are required");
    }

    if (!EMAIL_REGEX.test(f.email.trim())) {
      return setError("Please provide a valid email address");
    }

    if (f.password.length < 6) {
      return setError("Password must be at least 6 characters");
    }

    if (f.password !== f.confirm) {
      return setError("Passwords do not match");
    }

    setLoading(true);
    try {
      await register({
        name: f.name.trim(),
        email: f.email.trim(),
        password: f.password,
        phone: f.phone.trim(),
        location: f.location.trim(),
        role: "farmer",
      });

      setSuccess("Account created successfully! Redirecting to login...");
      setTimeout(() => {
        nav("/login", {
          state: { message: "Registration successful! Please login." },
        });
      }, 1000);
    } catch (x) {
      if (x.response?.data?.message) {
        setError(x.response.data.message);
      } else if (x.code === "ERR_NETWORK" || !x.response) {
        setError(
          "Unable to connect to the server. Please check your network connection or try again later.",
        );
      } else {
        setError(x.message || "Registration failed. Please try again.");
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth">
      <form className="card form" onSubmit={submit}>
        <h1>Create account</h1>
        <p className="muted">Register as a new farmer to manage your crops.</p>
        {error && <div className="error">{error}</div>}
        {success && (
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
            {success}
          </div>
        )}

        <label>
          Full Name
          <input
            name="name"
            type="text"
            value={f.name}
            onChange={change}
            required
            placeholder="Farmer Name"
            disabled={loading}
          />
        </label>

        <label>
          Email
          <input
            name="email"
            type="email"
            value={f.email}
            onChange={change}
            required
            placeholder="farmer@example.com"
            disabled={loading}
          />
        </label>

        <label>
          Phone
          <input
            name="phone"
            type="tel"
            value={f.phone}
            onChange={change}
            placeholder="Phone number (optional)"
            disabled={loading}
          />
        </label>

        <label>
          Location
          <input
            name="location"
            type="text"
            value={f.location}
            onChange={change}
            placeholder="Location or district"
            disabled={loading}
          />
        </label>

        <label>
          Password
          <input
            name="password"
            type="password"
            minLength="6"
            value={f.password}
            onChange={change}
            required
            placeholder="At least 6 characters"
            disabled={loading}
          />
        </label>

        <label>
          Confirm Password
          <input
            name="confirm"
            type="password"
            minLength="6"
            value={f.confirm}
            onChange={change}
            required
            placeholder="Re-enter password"
            disabled={loading}
          />
        </label>

        <button type="submit" disabled={loading}>
          {loading ? "Creating account..." : "Create account"}
        </button>

        <p>
          Already registered? <Link to="/login">Login</Link>
        </p>
      </form>
    </div>
  );
}
