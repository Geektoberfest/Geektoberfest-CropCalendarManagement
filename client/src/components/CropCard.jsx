import { useState } from "react";

export default function CropCard({
  crop,
  onSelect,
  isSelected = false,
  actionLabel = "Select Crop",
  actions,
}) {
  const [imgError, setImgError] = useState(false);

  if (!crop) return null;

  const name = crop.name || crop.cropName || "Unnamed Crop";
  const duration = crop.typicalDuration || crop.growingDuration;
  const season = crop.sowingSeason;
  const description = crop.description;
  const category = crop.category;
  const image = crop.image;

  return (
    <div className={`card crop-card ${isSelected ? "crop-card-selected" : ""}`}>
      <div className="crop-card-image-wrap">
        {image && !imgError ? (
          <img
            src={image}
            alt={name}
            className="crop-card-img"
            onError={() => setImgError(true)}
            loading="lazy"
          />
        ) : (
          <div className="crop-card-fallback-img">
            <svg
              width="48"
              height="48"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#287a3e"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M12 22v-9" />
              <path d="M12 13a5 5 0 0 0 5-5c0-3-5-6-5-6s-5 3-5 6a5 5 0 0 0 5 5z" />
              <path d="M7 17a4 4 0 0 1-3-4c0-2.5 3-4.5 3-4.5s3 2 3 4.5a4 4 0 0 1-3 4z" />
              <path d="M17 17a4 4 0 0 0 3-4c0-2.5-3-4.5-3-4.5s-3 2-3 4.5a4 4 0 0 0 3 4z" />
            </svg>
            <span className="crop-card-fallback-text">{category || "Crop"}</span>
          </div>
        )}
        {category && <span className="crop-card-category-badge">{category}</span>}
      </div>

      <div className="crop-card-body">
        <h3 className="crop-card-title">{name}</h3>

        <div className="crop-card-meta">
          <div className="crop-meta-badge" title="Growing Duration">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
            <span>{duration ? `${duration} days` : "Duration N/A"}</span>
          </div>

          <div className="crop-meta-badge" title="Sowing Season">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2a10 10 0 1 0 10 10" />
              <path d="M12 12 2.1 10.5" />
              <path d="M12 12 16.5 2.1" />
            </svg>
            <span>{season || "All Season"}</span>
          </div>
        </div>

        <p className="crop-card-desc">
          {description ? description : "No specific description available for this crop variety."}
        </p>

        <div className="crop-card-footer">
          {actions ? (
            actions
          ) : onSelect ? (
            <button
              type="button"
              className={`crop-select-btn ${isSelected ? "selected" : ""}`}
              onClick={() => onSelect(crop)}
            >
              {isSelected ? "✓ Selected" : actionLabel}
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
