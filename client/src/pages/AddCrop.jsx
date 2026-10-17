import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { addCrop, templates } from "../services/cropService";
import CropCard from "../components/CropCard";

export default function AddCrop() {
  const [t, setT] = useState([]);
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({});
  const [showCatalog, setShowCatalog] = useState(false);
  const [searchParams] = useSearchParams();

  const [f, setF] = useState({
    cropTemplate: "",
    cropName: "",
    variety: "",
    plantingDate: new Date().toISOString().slice(0, 10),
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
        const list = r.data.data || [];
        setT(list);

        const templateParam = searchParams.get("template");
        if (templateParam) {
          const selected = list.find((item) => item._id === templateParam);
          if (selected) {
            handleSelectTemplate(selected, list);
          }
        }
      } catch (e) {
        setError(
          e.response?.data?.message || "Unable to load crop templates"
        );
      }
    };

    loadTemplates();
  }, [searchParams]);

  const handleSelectTemplate = (crop) => {
    let harvestDate = "";
    if (f.plantingDate && crop.typicalDuration) {
      const p = new Date(f.plantingDate);
      p.setDate(p.getDate() + Number(crop.typicalDuration));
      harvestDate = p.toISOString().slice(0, 10);
    }

    setF((prev) => ({
      ...prev,
      cropTemplate: crop._id,
      cropName: crop.name || prev.cropName,
      expectedHarvestDate: harvestDate || prev.expectedHarvestDate,
    }));

    setFieldErrors((prev) => ({
      ...prev,
      cropTemplate: "",
      cropName: "",
    }));
  };

  const change = (e) => {
    const { name, value } = e.target;
    setF((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => ({
        ...prev,
        [name]: "",
      }));
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

  const selectedTemplateObj = t.find((x) => x._id === f.cropTemplate);

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Add Crop & Generate Calendar</h1>
          <p className="muted" style={{ margin: "4px 0 0 0" }}>
            Select a crop variety to automatically schedule key farm activities
          </p>
        </div>

        <button
          type="button"
          className="button ghost"
          onClick={() => setShowCatalog(!showCatalog)}
        >
          {showCatalog ? "Hide Crop Cards" : "Browse Crop Cards"}
        </button>
      </div>

      {showCatalog && (
        <div style={{ marginBottom: "30px" }}>
          <h2>Available Crops</h2>
          <div className="crop-grid">
            {t.map((crop) => (
              <CropCard
                key={crop._id}
                crop={crop}
                isSelected={f.cropTemplate === crop._id}
                onSelect={() => handleSelectTemplate(crop)}
                actionLabel="Select This Crop"
              />
            ))}
          </div>
        </div>
      )}

      {selectedTemplateObj && !showCatalog && (
        <div style={{ maxWidth: "650px", margin: "0 auto 15px auto" }}>
          <p className="muted" style={{ margin: "0 0 6px 0", fontSize: "13px" }}>
            Selected Crop Information:
          </p>
          <CropCard
            crop={selectedTemplateObj}
            isSelected={true}
            actionLabel="Change Selection"
            onSelect={() => setShowCatalog(true)}
          />
        </div>
      )}

      <form className="card form" onSubmit={submit} noValidate>
        <h2>Crop Details</h2>

        {error && <div className="error">{error}</div>}

        <label>
          Crop Template *
          <select
            name="cropTemplate"
            value={f.cropTemplate}
            className={fieldErrors.cropTemplate ? "input-error" : ""}
            onChange={(e) => {
              const x = t.find((item) => item._id === e.target.value);
              if (x) {
                handleSelectTemplate(x);
              } else {
                setF((prev) => ({
                  ...prev,
                  cropTemplate: "",
                  cropName: "",
                }));
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
            className={fieldErrors.cropName ? "input-error" : ""}
            placeholder="e.g. Basmati Rice, Red Tomato"
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
    </>
  );
}
