import { Link, useNavigate } from "react-router-dom";
import { LogOut, Leaf, Sun, Moon } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useTheme } from "../context/ThemeContext";

export default function Navbar() {
  const { theme, toggleTheme } = useTheme();
  const { user, logout } = useAuth();
  const nav = useNavigate();

  return (
    <header>
      <Link className="brand" to="/dashboard">
        <Leaf /> CropCalendar
      </Link>
      <nav>
        {user && (
          <>
            <Link to="/crops">Crops</Link>
            <Link to="/calendar">Calendar</Link>
            <Link to="/activities">Activities</Link>
            <Link to="/notifications">Notifications</Link>
            <Link to="/statistics">Statistics</Link>
            <Link to="/profile">Profile</Link>
            {user.role === "admin" && <Link to="/admin">Admin</Link>}
          </>
        )}

        {/* Theme Toggle Button */}
        <button
          type="button"
          onClick={toggleTheme}
          className="ghost theme-toggle-btn"
          aria-label="Toggle theme"
          title={`Switch to ${theme === "light" ? "dark" : "light"} mode`}
        >
          {theme === "light" ? <Moon size={16} /> : <Sun size={16} />}
        </button>

        {user && (
          <button
            className="ghost"
            onClick={() => {
              logout();
              nav("/login");
            }}
          >
            <LogOut size={16} /> Logout
          </button>
        )}
      </nav>
    </header>
  );
}