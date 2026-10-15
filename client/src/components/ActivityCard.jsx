import { useState } from "react";
import { Check, AlertTriangle, AlertCircle, ChevronDown, ChevronUp } from "lucide-react";

export default function ActivityCard({ a, onComplete, weatherAlert }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className={`card activity ${weatherAlert ? "has-weather-alert" : ""}`}>
      <div className="activity-info">
        <div className="activity-main-line">
          <b>{a.name}</b>
          <span className="muted">
            {a.crop?.cropName || a.crop?.name || "Crop"} ·{" "}
            {new Date(a.scheduledDate).toLocaleDateString()}
          </span>
          <span className={`pill ${a.status.toLowerCase()}`}>{a.status}</span>
        </div>

        {weatherAlert && (
          <div className="activity-weather-warning">
            <div
              className={`activity-weather-badge ${weatherAlert.severity || "warning"}`}
              onClick={() => setShowDetails(!showDetails)}
              role="button"
              tabIndex={0}
            >
              {weatherAlert.severity === "critical" ? (
                <AlertCircle size={14} className="text-danger" />
              ) : (
                <AlertTriangle size={14} className="text-warning" />
              )}
              <span>{weatherAlert.title}</span>
              {showDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </div>

            {showDetails && (
              <div className="activity-weather-details">
                <p>{weatherAlert.message}</p>
                {weatherAlert.recommendation && (
                  <small>
                    <strong>Advisory:</strong> {weatherAlert.recommendation}
                  </small>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {a.status !== "Completed" && (
        <button onClick={() => onComplete(a._id)}>
          <Check size={16} /> Complete
        </button>
      )}
    </div>
  );
}
