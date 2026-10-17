import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { getCrops, deleteCrop, templates } from "../services/cropService";
import CropCard from "../components/CropCard";

export default function Crops() {
  const [items, setItems] = useState([]);
  const [availableTemplates, setAvailableTemplates] = useState([]);
  const [tab, setTab] = useState("my-crops");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const nav = useNavigate();

  const load = async () => {
    try {
      setLoading(true);
      setError("");

      const [myCropsRes, templatesRes] = await Promise.all([
        getCrops(),
        templates(),
      ]);

      setItems(myCropsRes.data.data || []);
      setAvailableTemplates(templatesRes.data.data || []);
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Unable to load crops"
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleDelete = async (id) => {
    if (!confirm("Delete this crop?")) {
      return;
    }

    try {
      setError("");
      await deleteCrop(id);
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Unable to delete crop"
      );
    }
  };

  const handleSelectTemplate = (template) => {
    nav(`/crops/add?template=${template._id}`);
  };

  const categories = [
    "All",
    ...Array.from(new Set(availableTemplates.map((t) => t.category).filter(Boolean))),
  ];

  const filteredTemplates = availableTemplates.filter((t) => {
    const matchesSearch =
      t.name.toLowerCase().includes(search.toLowerCase()) ||
      (t.description && t.description.toLowerCase().includes(search.toLowerCase())) ||
      (t.sowingSeason && t.sowingSeason.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory =
      categoryFilter === "All" || t.category === categoryFilter;
    return matchesSearch && matchesCategory;
  });

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>{tab === "my-crops" ? "My Planted Crops" : "Crop Information & Directory"}</h1>
          <p className="muted" style={{ margin: "4px 0 0 0" }}>
            {tab === "my-crops"
              ? "Track and manage your ongoing crop cycles"
              : "Explore recommended crops, growing durations, and sowing seasons"}
          </p>
        </div>

        <div className="actions">
          <Link className="button" to="/crops/add">
            + Plant New Crop
          </Link>
        </div>
      </div>

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
        <button
          type="button"
          className={tab === "my-crops" ? "button" : "button ghost"}
          onClick={() => setTab("my-crops")}
        >
          My Crops ({items.length})
        </button>
        <button
          type="button"
          className={tab === "directory" ? "button" : "button ghost"}
          onClick={() => setTab("directory")}
        >
          Crop Information Cards ({availableTemplates.length})
        </button>
      </div>

      {error && <div className="error">{error}</div>}

      {tab === "directory" ? (
        <>
          <div className="pagehead" style={{ marginBottom: "18px" }}>
            <input
              placeholder="Search crop name, season, or details..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ maxWidth: "340px" }}
            />

            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{ maxWidth: "200px" }}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c === "All" ? "All Categories" : c}
                </option>
              ))}
            </select>
          </div>

          {loading ? (
            <div className="card center">Loading crop directory...</div>
          ) : filteredTemplates.length ? (
            <div className="crop-grid">
              {filteredTemplates.map((crop) => (
                <CropCard
                  key={crop._id}
                  crop={crop}
                  onSelect={handleSelectTemplate}
                  actionLabel="+ Plant This Crop"
                />
              ))}
            </div>
          ) : (
            <div className="card empty">
              No crops found matching your search.
            </div>
          )}
        </>
      ) : (
        <div className="grid">
          {items.map((c) => {
            const template = c.cropTemplate || {};
            return (
              <div className="card" key={c._id} style={{ display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "8px" }}>
                  <h3 style={{ margin: 0 }}>{c.cropName}</h3>
                  <span className="pill completed">{c.status}</span>
                </div>

                <p className="muted" style={{ margin: "0 0 10px 0" }}>
                  Variety: {c.variety || "Standard"}
                  {template.sowingSeason ? ` · Sowing: ${template.sowingSeason}` : ""}
                </p>

                <p style={{ margin: "0 0 6px 0", fontSize: "14px" }}>
                  <strong>Planted:</strong> {new Date(c.plantingDate).toLocaleDateString()}
                </p>

                {template.typicalDuration && (
                  <p style={{ margin: "0 0 12px 0", fontSize: "14px" }}>
                    <strong>Expected Duration:</strong> ~{template.typicalDuration} days
                  </p>
                )}

                <div className="actions" style={{ marginTop: "auto", paddingTop: "12px" }}>
                  <Link to={`/crops/${c._id}`} className="button" style={{ fontSize: "13px", padding: "6px 12px" }}>
                    View Calendar
                  </Link>

                  <button
                    type="button"
                    className="danger"
                    style={{ fontSize: "13px", padding: "6px 12px" }}
                    onClick={() => handleDelete(c._id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            );
          })}

          {!items.length && !loading && (
            <div className="card empty" style={{ gridColumn: "1 / -1", padding: "40px 20px" }}>
              <h3>No crops planted yet</h3>
              <p className="muted">Browse the crop information cards to choose and plan your first seasonal crop.</p>
              <button
                type="button"
                className="button"
                style={{ marginTop: "12px" }}
                onClick={() => setTab("directory")}
              >
                Browse Crop Information Cards
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
