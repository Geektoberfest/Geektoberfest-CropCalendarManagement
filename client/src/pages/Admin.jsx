import { useEffect, useState } from "react";
import api from "../services/api";
import CropCard from "../components/CropCard";

export default function Admin() {
  const [t, setT] = useState([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [f, setF] = useState({
    name: "",
    category: "",
    description: "",
    typicalDuration: "",
    sowingSeason: "",
    image: "",
  });

  const load = async () => {
    try {
      setError("");

      const r = await api.get("/crop-templates");
      setT(r.data.data || []);
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
        sowingSeason: "",
        image: "",
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
    if (!confirm("Are you sure you want to delete this crop template?")) return;

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
      <div className="pagehead">
        <div>
          <h1>Admin · Crop Template Directory</h1>
          <p className="muted" style={{ margin: "4px 0 0 0" }}>
            Manage the master crop templates available to farmers
          </p>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      <form className="card form" onSubmit={save} noValidate>
        <h2>Add Crop Template</h2>

        <label>
          Crop Name *
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
          Sowing Season
          <input
            name="sowingSeason"
            value={f.sowingSeason}
            onChange={(e) => handleChange("sowingSeason", e.target.value)}
            placeholder="e.g. Kharif (June - October), Rabi (November - April)"
          />
        </label>

        <label>
          Image URL
          <input
            name="image"
            type="url"
            value={f.image}
            onChange={(e) => handleChange("image", e.target.value)}
            placeholder="https://example.com/crop.jpg (optional)"
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

        <label>
          Description
          <textarea
            name="description"
            value={f.description}
            onChange={(e) => handleChange("description", e.target.value)}
            placeholder="Short details about soil requirements, climate, or planting notes..."
            rows={3}
          />
        </label>

        <button type="submit">Add Template</button>
      </form>

      <h2>Current Templates ({t.length})</h2>
      <div className="crop-grid">
        {t.map((x) => (
          <CropCard
            key={x._id}
            crop={x}
            actions={
              <button
                type="button"
                className="danger"
                style={{ width: "100%", justifyContent: "center" }}
                onClick={() => del(x._id)}
              >
                Delete Template
              </button>
            }
          />
        ))}

        {!t.length && (
          <div className="card empty" style={{ gridColumn: "1 / -1" }}>
            No crop templates in database.
          </div>
        )}
      </div>
    </>
  );
}
