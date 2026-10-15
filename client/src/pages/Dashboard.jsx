import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { dashboard } from "../services/dashboardService";
import { completeActivity } from "../services/activityService";
import { getWeatherAlerts } from "../services/weatherService";
import StatCard from "../components/StatCard";
import ActivityCard from "../components/ActivityCard";
import WeatherWidget from "../components/WeatherWidget";
import WeatherAlertsSection from "../components/WeatherAlertsSection";

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [error, setError] = useState("");

  const loadAlerts = async () => {
    try {
      const res = await getWeatherAlerts({ includeDismissed: false });
      if (res.data?.success && res.data?.data) {
        setAlerts(res.data.data);
      }
    } catch {
      // alerts are non-critical to core dashboard loading
    }
  };

  const load = async () => {
    try {
      setError("");
      const r = await dashboard();
      setD(r.data.data);
      await loadAlerts();
    } catch (e) {
      setError(
        e.response?.data?.message || "Unable to load dashboard"
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

  const alertsByActivity = useMemo(() => {
    const map = {};
    for (const alert of alerts) {
      if (alert.activity && !alert.isDismissed) {
        map[alert.activity] = alert;
      }
    }
    return map;
  }, [alerts]);

  if (error) {
    return <div className="error">{error}</div>;
  }

  if (!d) {
    return <p>Loading dashboard...</p>;
  }

  const done = async (id) => {
    try {
      await completeActivity(id, {});
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message || "Unable to complete activity"
      );
    }
  };

  return (
    <>
      <div className="pagehead">
        <div>
          <h1>Farmer Dashboard</h1>
          <p className="muted">Plan today, grow tomorrow.</p>
        </div>

        <Link className="button" to="/crops/add">
          + Add Crop
        </Link>
      </div>

      <section className="stats">
        {Object.entries(d.stats).map(([k, v]) => (
          <StatCard
            key={k}
            label={k.replace(/([A-Z])/g, " $1")}
            value={v}
          />
        ))}
      </section>

      {/* Integrated Weather Forecast Widget */}
      <WeatherWidget onWeatherLoaded={loadAlerts} />

      {/* Dedicated Weather Alerts Section */}
      <WeatherAlertsSection alerts={alerts} onAlertsUpdated={loadAlerts} />

      <h2>Today's Activities</h2>

      {d.todayActivities.length ? (
        d.todayActivities.map((a) => (
          <ActivityCard
            key={a._id}
            a={a}
            onComplete={done}
            weatherAlert={alertsByActivity[a._id]}
          />
        ))
      ) : (
        <div className="card empty">
          No activities due today.
        </div>
      )}

      <h2>Crop Progress</h2>

      <div className="grid">
        {d.cropProgress.map((c) => (
          <div className="card" key={c._id}>
            <b>{c.cropName}</b>

            <div className="progress">
              <span style={{ width: `${c.progress}%` }} />
            </div>

            <small>{c.progress}% complete</small>
          </div>
        ))}
      </div>
    </>
  );
}
