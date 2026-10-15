import { useState, useEffect, useCallback } from "react";
import {
  Sun,
  Cloud,
  CloudRain,
  CloudLightning,
  CloudDrizzle,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  MapPin,
  RefreshCw,
  Edit2,
  Check,
  X,
  AlertCircle,
} from "lucide-react";
import { getWeather, updateFarmLocation } from "../services/weatherService";
import { useAuth } from "../context/AuthContext";

/**
 * Return appropriate Lucide weather icon based on WMO weather code
 */
function getWeatherIcon(code, size = 24) {
  if (code === 0 || code === 1) return <Sun size={size} className="weather-icon-sun" />;
  if (code === 2 || code === 3) return <Cloud size={size} className="weather-icon-cloud" />;
  if (code >= 45 && code <= 48) return <CloudFog size={size} className="weather-icon-fog" />;
  if (code >= 51 && code <= 57) return <CloudDrizzle size={size} className="weather-icon-drizzle" />;
  if ((code >= 61 && code <= 67) || (code >= 80 && code <= 82))
    return <CloudRain size={size} className="weather-icon-rain" />;
  if (code >= 95) return <CloudLightning size={size} className="weather-icon-storm" />;
  return <Cloud size={size} className="weather-icon-cloud" />;
}

export default function WeatherWidget({ onWeatherLoaded }) {
  const { user } = useAuth();
  const [weather, setWeather] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeLocation, setActiveLocation] = useState(user?.location || "");
  const [editingLocation, setEditingLocation] = useState(false);
  const [inputLocation, setInputLocation] = useState("");
  const [savingLocation, setSavingLocation] = useState(false);

  const fetchWeather = useCallback(
    async (locToFetch) => {
      setLoading(true);
      setError("");
      try {
        const params = locToFetch ? { location: locToFetch } : {};
        const res = await getWeather(params);
        if (res.data?.success && res.data?.data) {
          setWeather(res.data.data);
          setActiveLocation(res.data.data.location?.name || locToFetch || "");
          if (onWeatherLoaded) {
            onWeatherLoaded(res.data.data);
          }
        }
      } catch (err) {
        setWeather(null);
        setError(
          err.response?.data?.message ||
            "Unable to retrieve weather forecast for this location. Please try again."
        );
      } finally {
        setLoading(false);
      }
    },
    [onWeatherLoaded]
  );

  useEffect(() => {
    fetchWeather(activeLocation || user?.location || "");
  }, [user?.location]);

  const handleRefresh = () => {
    fetchWeather(activeLocation);
  };

  const handleLocationSubmit = async (e) => {
    e.preventDefault();
    if (!inputLocation.trim()) return;

    const trimmed = inputLocation.trim();
    setSavingLocation(true);
    setError("");

    try {
      // First verify the location can get weather
      const res = await getWeather({ location: trimmed });
      if (res.data?.success && res.data?.data) {
        setWeather(res.data.data);
        setActiveLocation(res.data.data.location?.name || trimmed);
        setEditingLocation(false);
        if (onWeatherLoaded) {
          onWeatherLoaded(res.data.data);
        }

        // Also persist as farm location
        try {
          await updateFarmLocation(trimmed);
        } catch {
          // If persistence fails, we still show the queried location
        }
      }
    } catch (err) {
      setError(
        err.response?.data?.message ||
          `Could not find weather data for "${trimmed}".`
      );
    } finally {
      setSavingLocation(false);
    }
  };

  const formatDateLabel = (dateStr, index) => {
    if (index === 0) return "Today";
    if (index === 1) return "Tomorrow";
    const date = new Date(dateStr + "T00:00:00");
    return date.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
  };

  return (
    <div className="card weather-widget" data-testid="weather-widget">
      <div className="weather-header">
        <div className="weather-location-title">
          <MapPin size={18} className="text-forest" />
          {editingLocation ? (
            <form onSubmit={handleLocationSubmit} className="weather-location-form">
              <input
                type="text"
                placeholder="Enter city or lat,lon..."
                value={inputLocation}
                onChange={(e) => setInputLocation(e.target.value)}
                autoFocus
                disabled={savingLocation}
                className="weather-input"
              />
              <button
                type="submit"
                className="button-sm"
                disabled={savingLocation || !inputLocation.trim()}
                title="Save Location"
              >
                <Check size={14} />
              </button>
              <button
                type="button"
                className="button-sm button-ghost"
                onClick={() => setEditingLocation(false)}
                disabled={savingLocation}
                title="Cancel"
              >
                <X size={14} />
              </button>
            </form>
          ) : (
            <>
              <h3>
                {weather?.location?.name || activeLocation || "Farm Weather"}
                {weather?.location?.country ? `, ${weather.location.country}` : ""}
              </h3>
              <button
                type="button"
                className="button-icon"
                onClick={() => {
                  setInputLocation(activeLocation);
                  setEditingLocation(true);
                }}
                title="Change farm location"
              >
                <Edit2 size={14} />
              </button>
            </>
          )}
        </div>

        <button
          type="button"
          className="button-icon"
          onClick={handleRefresh}
          disabled={loading}
          title="Refresh weather data"
        >
          <RefreshCw size={16} className={loading ? "spin" : ""} />
        </button>
      </div>

      {loading && !weather && (
        <div className="weather-loading" data-testid="weather-loading">
          <div className="skeleton-line" style={{ width: "60%" }} />
          <div className="skeleton-line" style={{ width: "80%" }} />
          <p className="muted">Retrieving farm weather forecast...</p>
        </div>
      )}

      {error && !loading && (
        <div className="weather-error" data-testid="weather-error">
          <AlertCircle size={20} className="text-danger" />
          <div>
            <p>{error}</p>
            <div className="weather-error-actions">
              <button
                type="button"
                className="button-sm"
                onClick={() => {
                  setInputLocation(activeLocation || "Pune");
                  setEditingLocation(true);
                }}
              >
                Set Farm Location
              </button>
              <button
                type="button"
                className="button-sm button-ghost"
                onClick={handleRefresh}
              >
                Retry
              </button>
            </div>
          </div>
        </div>
      )}

      {weather && (
        <>
          {/* Current Conditions Card */}
          <div className="weather-current-container">
            <div className="weather-current-main">
              <div className="weather-current-icon">
                {getWeatherIcon(weather.current.weatherCode, 44)}
              </div>
              <div>
                <div className="weather-temp-hero">
                  {weather.current.temperature !== null
                    ? `${Math.round(weather.current.temperature)}°C`
                    : "--"}
                </div>
                <div className="weather-condition-badge">
                  {weather.current.condition}
                </div>
              </div>
            </div>

            <div className="weather-meta-grid">
              <div className="weather-meta-item">
                <Thermometer size={16} className="muted" />
                <span>
                  High / Low:{" "}
                  <strong>
                    {weather.daily[0]?.tempMax !== null
                      ? `${Math.round(weather.daily[0].tempMax)}°`
                      : "--"}
                    {" / "}
                    {weather.daily[0]?.tempMin !== null
                      ? `${Math.round(weather.daily[0].tempMin)}°`
                      : "--"}
                  </strong>
                </span>
              </div>

              <div className="weather-meta-item">
                <Droplets size={16} className="muted" />
                <span>
                  Humidity:{" "}
                  <strong>
                    {weather.current.humidity !== null
                      ? `${weather.current.humidity}%`
                      : "--"}
                  </strong>
                </span>
              </div>

              <div className="weather-meta-item">
                <CloudRain size={16} className="muted" />
                <span>
                  Rain Chance:{" "}
                  <strong>
                    {weather.daily[0]?.precipitationProbability !== undefined
                      ? `${weather.daily[0].precipitationProbability}%`
                      : "--"}
                  </strong>{" "}
                  ({weather.daily[0]?.precipitationSum || 0} mm)
                </span>
              </div>

              <div className="weather-meta-item">
                <Wind size={16} className="muted" />
                <span>
                  Wind:{" "}
                  <strong>
                    {weather.current.windSpeed !== null
                      ? `${weather.current.windSpeed} km/h`
                      : "--"}
                  </strong>
                </span>
              </div>
            </div>
          </div>

          {/* 7-Day Forecast Grid */}
          <div className="weather-forecast-section">
            <h4 className="weather-forecast-title">7-Day Farming Outlook</h4>
            <div className="weather-forecast-grid">
              {weather.daily.map((day, idx) => (
                <div
                  key={day.date}
                  className={`weather-day-card ${idx === 0 ? "today" : ""}`}
                >
                  <span className="weather-day-label">
                    {formatDateLabel(day.date, idx)}
                  </span>
                  <div className="weather-day-icon">
                    {getWeatherIcon(day.weatherCode, 22)}
                  </div>
                  <span className="weather-day-cond" title={day.condition}>
                    {day.condition}
                  </span>
                  <div className="weather-day-temps">
                    <span className="temp-max">
                      {day.tempMax !== null ? `${Math.round(day.tempMax)}°` : "--"}
                    </span>
                    <span className="temp-min">
                      {day.tempMin !== null ? `${Math.round(day.tempMin)}°` : "--"}
                    </span>
                  </div>
                  {day.precipitationProbability > 0 && (
                    <div className="weather-day-rain">
                      <CloudRain size={12} />
                      <span>{day.precipitationProbability}%</span>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
