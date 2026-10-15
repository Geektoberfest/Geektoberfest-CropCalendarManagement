import { useState, useEffect } from "react";
import {
  AlertTriangle,
  AlertCircle,
  Info,
  CheckCircle2,
  X,
  Droplets,
  Wind,
  Thermometer,
  Calendar,
  Eye,
  RefreshCw,
} from "lucide-react";
import {
  getWeatherAlerts,
  markAlertRead,
  dismissAlert,
} from "../services/weatherService";

export default function WeatherAlertsSection({ alerts: propAlerts, onAlertsUpdated }) {
  const [alerts, setAlerts] = useState(propAlerts || []);
  const [loading, setLoading] = useState(false);
  const [showDismissed, setShowDismissed] = useState(false);
  const [error, setError] = useState("");

  const loadAlerts = async (includeDismissed = showDismissed) => {
    setLoading(true);
    setError("");
    try {
      const res = await getWeatherAlerts({ includeDismissed });
      if (res.data?.success && res.data?.data) {
        setAlerts(res.data.data);
        if (onAlertsUpdated) onAlertsUpdated(res.data.data);
      }
    } catch {
      setError("Unable to load weather alerts.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (propAlerts) {
      setAlerts(propAlerts);
    } else {
      loadAlerts(showDismissed);
    }
  }, [propAlerts, showDismissed]);

  const handleMarkRead = async (id) => {
    try {
      await markAlertRead(id);
      setAlerts((prev) =>
        prev.map((a) => (a._id === id ? { ...a, isRead: true } : a))
      );
    } catch {
      // silently handle
    }
  };

  const handleDismiss = async (id) => {
    try {
      await dismissAlert(id);
      if (!showDismissed) {
        setAlerts((prev) => prev.filter((a) => a._id !== id));
      } else {
        setAlerts((prev) =>
          prev.map((a) => (a._id === id ? { ...a, isDismissed: true } : a))
        );
      }
      if (onAlertsUpdated) onAlertsUpdated();
    } catch {
      // silently handle
    }
  };

  const getSeverityIcon = (severity) => {
    if (severity === "critical") return <AlertCircle size={20} className="text-danger" />;
    if (severity === "warning") return <AlertTriangle size={20} className="text-warning" />;
    return <Info size={20} className="text-info" />;
  };

  const activeCount = alerts.filter((a) => !a.isDismissed).length;

  return (
    <div className="card weather-alerts-card" data-testid="weather-alerts-section">
      <div className="weather-alerts-header">
        <div className="weather-alerts-title">
          <AlertTriangle size={22} className="text-warning" />
          <h3>Weather-Based Farming Alerts</h3>
          {activeCount > 0 && (
            <span className="pill badge-alert-count">{activeCount} Active</span>
          )}
        </div>

        <div className="weather-alerts-controls">
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showDismissed}
              onChange={(e) => setShowDismissed(e.target.checked)}
            />
            Show Dismissed
          </label>
          <button
            type="button"
            className="button-icon"
            onClick={() => loadAlerts(showDismissed)}
            disabled={loading}
            title="Refresh alerts"
          >
            <RefreshCw size={15} className={loading ? "spin" : ""} />
          </button>
        </div>
      </div>

      {error && <div className="error">{error}</div>}

      {alerts.length === 0 ? (
        <div className="weather-alerts-empty">
          <CheckCircle2 size={32} className="text-forest" />
          <p>
            <strong>All clear!</strong> No adverse weather risks detected for your
            scheduled farming activities. Safe growing!
          </p>
        </div>
      ) : (
        <div className="weather-alerts-list">
          {alerts.map((alert) => (
            <div
              key={alert._id || alert.alertKey}
              className={`weather-alert-item ${alert.severity} ${
                alert.isRead ? "read" : "unread"
              } ${alert.isDismissed ? "dismissed" : ""}`}
            >
              <div className="alert-left-indicator">
                {getSeverityIcon(alert.severity)}
              </div>

              <div className="alert-content">
                <div className="alert-meta-row">
                  <span className={`pill category-pill ${alert.category.toLowerCase()}`}>
                    {alert.category}
                  </span>
                  <span className="alert-crop-name">
                    Crop: <strong>{alert.cropName}</strong>
                  </span>
                  <span className="alert-date">
                    <Calendar size={13} /> {alert.forecastDate}
                  </span>
                  {alert.isDismissed && (
                    <span className="pill dismissed-pill">Dismissed</span>
                  )}
                </div>

                <h4 className="alert-title">{alert.title}</h4>
                <p className="alert-message">{alert.message}</p>

                {alert.recommendation && (
                  <div className="alert-recommendation">
                    <strong>Advisory:</strong> {alert.recommendation}
                  </div>
                )}

                {alert.weatherValues && (
                  <div className="alert-weather-pills">
                    {alert.weatherValues.precipitationSum > 0 && (
                      <span className="weather-metric">
                        <Droplets size={12} /> {alert.weatherValues.precipitationSum} mm rain (
                        {alert.weatherValues.precipitationProbability}%)
                      </span>
                    )}
                    {alert.weatherValues.windSpeedMax > 0 && (
                      <span className="weather-metric">
                        <Wind size={12} /> Max wind {alert.weatherValues.windSpeedMax} km/h
                      </span>
                    )}
                    {alert.weatherValues.tempMax !== null && (
                      <span className="weather-metric">
                        <Thermometer size={12} /> {alert.weatherValues.tempMax}°C
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="alert-actions">
                {!alert.isRead && (
                  <button
                    type="button"
                    className="button-icon"
                    onClick={() => handleMarkRead(alert._id)}
                    title="Mark as Read"
                  >
                    <Eye size={16} />
                  </button>
                )}
                {!alert.isDismissed && (
                  <button
                    type="button"
                    className="button-icon text-danger"
                    onClick={() => handleDismiss(alert._id)}
                    title="Dismiss alert"
                  >
                    <X size={16} />
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
