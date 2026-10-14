import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { addCrop, templates } from "../services/cropService";

export default function AddCrop() {
  const [t, setT] = useState([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});

  const [f, setF] = useState({
    cropTemplate: "",
    cropName: "",
    variety: "",
    plantingDate: "",
    expectedHarvestDate: "",
    farmSize: "",
    location: "",
    soilType: "",
    irrigationMethod: "",
    notes: "",
  });

  const nav = useNavigate();

  useEffect(() => {
    const loadTemplates = async () => {
      try {
        const r = await templates();
        setT(r.data.data);
      } catch (e) {
        setError(
          e.response?.data?.message || "Unable to load crop templates"
        );
      }
    };

    loadTemplates();
  }, []);

  const change = (e) => {
    const { name, value } = e.target;
    setF({
      ...f,
      [name]: value,
    });
    if (fieldErrors[name]) {
      setFieldErrors({
        ...fieldErrors,
        [name]: "",
      });
    }
  };

  const validateForm = () => {
    const errs = {};
    if (!f.cropTemplate) {
      errs.cropTemplate = "Please select a crop template";
    }
    if (!f.cropName || !f.cropName.trim()) {
      errs.cropName = "Crop name is required";
    }
    if (!f.plantingDate) {
      errs.plantingDate = "Planting date is required";
    }
    if (f.expectedHarvestDate && f.plantingDate) {
      if (new Date(f.expectedHarvestDate) < new Date(f.plantingDate)) {
        errs.expectedHarvestDate = "Expected harvest date cannot be earlier than planting date";
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
      const r = await addCrop(f);
      nav(`/crops/${r.data.data._id}`);
    } catch (e) {
      setError(
        e.response?.data?.message || "Unable to add crop"
      );
    }
  };

  return (
    <form className="card form" onSubmit={submit} noValidate>
      <h1>Add Crop</h1>

      {error && <div className="error">{error}</div>}

      <label>
        Crop Template *
        <select
          name="cropTemplate"
          value={f.cropTemplate}
          className={fieldErrors.cropTemplate ? "input-error" : ""}
          onChange={(e) => {
            const x = t.find(
              (item) => item._id === e.target.value
            );

            setF({
              ...f,
              cropTemplate: e.target.value,
              cropName: x?.name || "",
            });
            if (fieldErrors.cropTemplate || fieldErrors.cropName) {
              setFieldErrors({
                ...fieldErrors,
                cropTemplate: "",
                cropName: "",
              });
            }
          }}
        >
          <option value="">Select crop template</option>
          {t.map((x) => (
            <option value={x._id} key={x._id}>
              {x.name} {x.typicalDuration ? `(${x.typicalDuration} days)` : ""}
            </option>
          ))}
        </select>
        {fieldErrors.cropTemplate && (
          <span className="field-error">{fieldErrors.cropTemplate}</span>
        )}
      </label>

      <label>
        Crop Name *
        <input
          name="cropName"
          value={f.cropName}
          onChange={change}
          placeholder="e.g. Wheat, Tomato"
          className={fieldErrors.cropName ? "input-error" : ""}
        />
        {fieldErrors.cropName && (
          <span className="field-error">{fieldErrors.cropName}</span>
        )}
      </label>

      {[
        "variety",
        "farmSize",
        "location",
        "soilType",
        "irrigationMethod",
        "notes",
      ].map((k) => (
        <label key={k}>
          {k.replace(/([A-Z])/g, " $1")}
          <input
            name={k}
            value={f[k]}
            onChange={change}
          />
        </label>
      ))}

      <label>
        Planting Date *
        <input
          type="date"
          name="plantingDate"
          value={f.plantingDate}
          onChange={change}
          className={fieldErrors.plantingDate ? "input-error" : ""}
        />
        {fieldErrors.plantingDate && (
          <span className="field-error">{fieldErrors.plantingDate}</span>
        )}
      </label>

      <label>
        Expected Harvest Date
        <input
          type="date"
          name="expectedHarvestDate"
          value={f.expectedHarvestDate}
          onChange={change}
          className={fieldErrors.expectedHarvestDate ? "input-error" : ""}
        />
        {fieldErrors.expectedHarvestDate && (
          <span className="field-error">{fieldErrors.expectedHarvestDate}</span>
        )}
      </label>

      <button type="submit">
        Add & Generate Calendar
      </button>
    </form>
  );
}
