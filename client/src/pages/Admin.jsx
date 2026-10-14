import { useEffect, useState } from "react";
import api from "../services/api";

export default function Admin() {
  const [t, setT] = useState([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [f, setF] = useState({
    name: "",
    category: "",
    description: "",
    typicalDuration: "",
  });

  const load = async () => {
    try {
      setError("");

      const r = await api.get("/crop-templates");
      setT(r.data.data);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Unable to load crop templates"
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleChange = (field, value) => {
    setF({
      ...f,
      [field]: value,
    });
    if (fieldErrors[field]) {
      setFieldErrors({
        ...fieldErrors,
        [field]: "",
      });
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!f.name || !f.name.trim()) {
      errs.name = "Template name is required";
    }
    if (!f.category || !f.category.trim()) {
      errs.category = "Category is required";
    }
    if (
      f.typicalDuration !== "" &&
      (isNaN(Number(f.typicalDuration)) || Number(f.typicalDuration) <= 0)
    ) {
      errs.typicalDuration = "Typical duration must be a positive number of days";
    }
    setFieldErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const save = async (e) => {
    e.preventDefault();
    setError("");

    if (!validateForm()) {
      return;
    }

    try {
      await api.post("/crop-templates", {
        ...f,
        typicalDuration: f.typicalDuration ? Number(f.typicalDuration) : 0,
      });

      setF({
        name: "",
        category: "",
        description: "",
        typicalDuration: "",
      });
      setFieldErrors({});

      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Unable to add crop template"
      );
    }
  };

  const del = async (id) => {
    try {
      setError("");

      await api.delete(`/crop-templates/${id}`);

      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Unable to delete crop template"
      );
    }
  };

  return (
    <>
      <h1>Admin · Crop Templates</h1>

      {error && <div className="error">{error}</div>}

      <form className="card form" onSubmit={save} noValidate>
        <h2>Add Template</h2>

        <label>
          Template Name *
          <input
            name="name"
            value={f.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={fieldErrors.name ? "input-error" : ""}
            placeholder="e.g. Basmati Rice"
          />
          {fieldErrors.name && (
            <span className="field-error">{fieldErrors.name}</span>
          )}
        </label>

        <label>
          Category *
          <input
            name="category"
            value={f.category}
            onChange={(e) => handleChange("category", e.target.value)}
            className={fieldErrors.category ? "input-error" : ""}
            placeholder="e.g. Grains, Vegetables, Pulses"
          />
          {fieldErrors.category && (
            <span className="field-error">{fieldErrors.category}</span>
          )}
        </label>

        <label>
          Description
          <textarea
            name="description"
            value={f.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Short details about this crop..."
            rows={3}
          />
        </label>

        <label>
          Typical Duration (Days)
          <input
            name="typicalDuration"
            type="number"
            min="1"
            value={f.typicalDuration}
            onChange={(e) => handleChange("typicalDuration", e.target.value)}
            className={fieldErrors.typicalDuration ? "input-error" : ""}
            placeholder="e.g. 120"
          />
          {fieldErrors.typicalDuration && (
            <span className="field-error">{fieldErrors.typicalDuration}</span>
          )}
        </label>

        <button type="submit">Add Template</button>
      </form>

      <div className="grid">
        {t.map((x) => (
          <div className="card" key={x._id}>
            <b>{x.name}</b>

            <p>{x.description}</p>

            <p>
              <strong>Category:</strong> {x.category}
            </p>

            <p>
              <strong>Duration:</strong>{" "}
              {x.typicalDuration} days
            </p>

            <button
              type="button"
              className="danger"
              onClick={() => del(x._id)}
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </>
  );
}
