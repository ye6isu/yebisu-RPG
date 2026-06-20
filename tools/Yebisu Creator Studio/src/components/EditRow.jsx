import { Pill, Btn } from "./ui.jsx";
import { C } from "../theme.js";

export default function EditRow({ label, panel, badge, count, activePanel, setActivePanel }) {
  const isActive = activePanel === panel;
  return <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", borderBottom: `1px solid #1e1e1e`, background: isActive ? "#1a2438" : "transparent" }}>
    <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
      <span style={{ fontSize: 13, color: C.text }}>{label}</span>
      {badge && <Pill color="#1e3020">{badge}</Pill>}
      {(count > 0) && <Pill color="#1a2438">{count}</Pill>}
    </div>
    <Btn sm v={isActive ? "p" : "g"} onClick={() => setActivePanel(p => p === panel ? null : panel)}>edit</Btn>
  </div>;
}
