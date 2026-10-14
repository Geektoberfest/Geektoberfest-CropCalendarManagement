import { useEffect, useState } from "react";
import {
  getActivities,
  addActivity,
  updateActivity,
  deleteActivity,
} from "../services/activityService";
import { getCrops } from "../services/cropService";

export default function Activities() {
  const [a, setA] = useState([]);
  const [c, setC] = useState([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [f, setF] = useState({
    name: "",
    crop: "",
    scheduledDate: "",
    category: "",
    priority: "Medium",
    description: "",
    reminderDate: "",
  });

  const [editing, setEditing] = useState(null);

  const load = async () => {
    try {
      const r = await getActivities();
      setA(r.data.data);
    } catch (e) {
      setError(
        e.response?.data?.message || "Unable to load activities"
      );
    }
  };

  const loadCrops = async () => {
    try {
      const r = await getCrops();
      setC(r.data.data);
    } catch (e) {
      setError(
        e.response?.data?.message || "Unable to load crops"
      );
    }
  };

  useEffect(() => {
    load();
    loadCrops();
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
      errs.name = "Activity name is required";
    }
    if (!f.crop) {
      errs.crop = "Please select a crop";
    }
    if (!f.scheduledDate) {
      errs.scheduledDate = "Scheduled date is required";
    }
    if (f.reminderDate && f.scheduledDate) {
      if (new Date(f.reminderDate) > new Date(f.scheduledDate)) {
        errs.reminderDate = "Reminder date cannot be after scheduled date";
      }
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
      if (editing) {
        await updateActivity(editing, f);
      } else {
        await addActivity(f);
      }

      setEditing(null);
      setFieldErrors({});

      setF({
        name: "",
        crop: "",
        scheduledDate: "",
        category: "",
        priority: "Medium",
        description: "",
        reminderDate: "",
      });

      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || "Unable to save activity"
      );
    }
  };

  const editActivity = (x) => {
    setEditing(x._id);
    setFieldErrors({});

    setF({
      name: x.name || "",
      crop: x.crop?._id || x.crop || "",
      scheduledDate: x.scheduledDate
        ? new Date(x.scheduledDate).toISOString().slice(0, 10)
        : "",
      category: x.category || "",
      priority: x.priority || "Medium",
      description: x.description || "",
      reminderDate: x.reminderDate
        ? new Date(x.reminderDate).toISOString().slice(0, 10)
        : "",
    });
  };

  const cancelEdit = () => {
    setEditing(null);
    setFieldErrors({});
    setF({
      name: "",
      crop: "",
      scheduledDate: "",
      category: "",
      priority: "Medium",
      description: "",
      reminderDate: "",
    });
  };

  const removeActivity = async (id) => {
    if (!confirm("Delete activity?")) return;

    try {
      await deleteActivity(id);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || "Unable to delete activity"
      );
    }
  };

  return (
    <>
      <h1>Activities</h1>

      {error && <div className="error">{error}</div>}

      <form className="card form" onSubmit={submit} noValidate>
        <h2>{editing ? "Edit" : "Add"} Activity</h2>

        <label>
          Activity Name *
          <input
            name="name"
            value={f.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className={fieldErrors.name ? "input-error" : ""}
            placeholder="e.g. Sowing, Fertilizer application, Irrigation"
          />
          {fieldErrors.name && (
            <span className="field-error">{fieldErrors.name}</span>
          )}
        </label>

        <label>
          Crop *
          <select
            name="crop"
            value={f.crop}
            onChange={(e) => handleChange("crop", e.target.value)}
            className={fieldErrors.crop ? "input-error" : ""}
          >
            <option value="">Select crop</option>
            {c.map((x) => (
              <option key={x._id} value={x._id}>
                {x.cropName} ({x.variety || "Default"})
              </option>
            ))}
          </select>
          {fieldErrors.crop && (
            <span className="field-error">{fieldErrors.crop}</span>
          )}
        </label>

        {["category", "description"].map((k) => (
          <label key={k}>
            {k[0].toUpperCase() + k.slice(1)}
            <input
              name={k}
              value={f[k]}
              onChange={(e) => handleChange(k, e.target.value)}
            />
          </label>
        ))}

        <label>
          Scheduled Date *
          <input
            type="date"
            name="scheduledDate"
            value={f.scheduledDate}
            onChange={(e) => handleChange("scheduledDate", e.target.value)}
            className={fieldErrors.scheduledDate ? "input-error" : ""}
          />
          {fieldErrors.scheduledDate && (
            <span className="field-error">{fieldErrors.scheduledDate}</span>
          )}
        </label>

        <label>
          Reminder Date
          <input
            type="date"
            name="reminderDate"
            value={f.reminderDate}
            onChange={(e) => handleChange("reminderDate", e.target.value)}
            className={fieldErrors.reminderDate ? "input-error" : ""}
          />
          {fieldErrors.reminderDate && (
            <span className="field-error">{fieldErrors.reminderDate}</span>
          )}
        </label>

        <label>
          Priority
          <select
            name="priority"
            value={f.priority}
            onChange={(e) => handleChange("priority", e.target.value)}
          >
            <option>Low</option>
            <option>Medium</option>
            <option>High</option>
          </select>
        </label>

        <div className="actions" style={{ marginTop: "12px" }}>
          <button type="submit">
            {editing ? "Save Changes" : "Add Activity"}
          </button>
          {editing && (
            <button type="button" className="ghost" onClick={cancelEdit}>
              Cancel
            </button>
          )}
        </div>
      </form>

      {a.map((x) => (
        <div className="card activity" key={x._id}>
          <div>
            <b>{x.name}</b>
            <span className="muted">
              {x.crop?.cropName} ·{" "}
              {new Date(x.scheduledDate).toLocaleDateString()}
            </span>
          </div>

          <div className="actions">
            <button onClick={() => editActivity(x)}>
              Edit
            </button>

            <button
              className="danger"
              onClick={() => removeActivity(x._id)}
            >
              Delete
            </button>
          </div>
        </div>
      ))}
    </>
  );
}