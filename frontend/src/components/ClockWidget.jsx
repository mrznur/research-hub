import { useState, useEffect } from "react";
import { Clock } from "lucide-react";

export default function ClockWidget() {
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(t);
  }, []);
  const timeStr = now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const dateStr = now.toLocaleDateString([], { weekday: "short", month: "short", day: "numeric", year: "numeric" });
  return (
    <div className="clock-widget">
      <Clock size={14} />
      <div>
        <div className="clock-time">{timeStr}</div>
        <div className="clock-date">{dateStr}</div>
      </div>
    </div>
  );
}
