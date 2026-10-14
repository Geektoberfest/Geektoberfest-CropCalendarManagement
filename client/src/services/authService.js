import api from "./api";
export const login = (d) => api.post("/auth/login", d);
export const register = ({ name, email, password, phone, location, role }) =>
  api.post("/auth/register", {
    name,
    email,
    password,
    phone,
    location,
    role: role || "farmer",
  });
export const me = () => api.get("/auth/me");
