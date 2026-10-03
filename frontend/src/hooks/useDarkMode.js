import { useState, useEffect } from "react";

export default function useDarkMode() {
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem("hub-dark");
    return saved !== null ? saved === "1" : window.matchMedia("(prefers-color-scheme: dark)").matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
    localStorage.setItem("hub-dark", dark ? "1" : "0");
  }, [dark]);
  return [dark, () => setDark(d => !d)];
}
