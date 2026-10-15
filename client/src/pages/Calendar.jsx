import { useEffect, useState, useMemo } from "react";
import {
  getActivities,
  completeActivity,
} from "../services/activityService";
import { getWeatherAlerts } from "../services/weatherService";
import ActivityCard from "../components/ActivityCard";

export default function Calendar() {
  const [a, setA] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");

  const loadAlerts = async () => {
    try {
      const res = await getWeatherAlerts({ includeDismissed: false });
      if (res.data?.success && res.data?.data) {
        setAlerts(res.data.data);
      }
    } catch {
      // alerts are non-critical
    }
  };

  const load = async () => {
    try {
      setError("");

      const r = await getActivities({
        search: q,
        status,
      });

      setA(r.data.data);
      await loadAlerts();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Unable to load activities"
      );
    }
  };

  useEffect(() => {
    load();
  }, [status]);

  const alertsByActivity = useMemo(() => {
    const map = {};
    for (const alert of alerts) {
      if (alert.activity && !alert.isDismissed) {
        map[alert.activity] = alert;
      }
    }
    return map;
  }, [alerts]);

  const handleComplete = async (id) => {
    try {
      await completeActivity(id, {});
      await load();
    } catch (e) {
      setError(
        e.response?.data?.message ||
          "Unable to complete activity"
      );
    }
  };

  return (
    <>
      <div className="pagehead">
        <h1>Calendar</h1>

        <input
          placeholder="Search activities..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              load();
            }
          }}
        />

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
        >
          <option value="">All</option>
          <option>Pending</option>
          <option>Completed</option>
          <option>Overdue</option>
        </select>
      </div>

      {error && <div className="error">{error}</div>}

      {a.map((x) => (
        <ActivityCard
          key={x._id}
          a={x}
          onComplete={handleComplete}
          weatherAlert={alertsByActivity[x._id]}
        />
      ))}

      {!a.length && !error && (
        <div className="card empty">
          No matching activities.
        </div>
      )}
    </>
  );
}
