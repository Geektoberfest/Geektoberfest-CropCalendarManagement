import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { dashboard } from "../services/dashboardService";
import { completeActivity } from "../services/activityService";
import StatCard from "../components/StatCard";
import ActivityCard from "../components/ActivityCard";
import WeatherWidget from "../components/WeatherWidget";

export default function Dashboard() {
  const [d, setD] = useState(null);
  const [error, setError] = useState("");

  const load = async () => {
    try {
      setError("");

      const r = await dashboard();
      setD(r.data.data);
    } catch (e) {
      setError(
        e.response?.data?.message || "Unable to load dashboard"
      );
    }
  };

  useEffect(() => {
    load();
  }, []);

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

      <WeatherWidget />

      <h2>Today's Activities</h2>

      {d.todayActivities.length ? (
        d.todayActivities.map((a) => (
          <ActivityCard
            key={a._id}
            a={a}
            onComplete={done}
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
