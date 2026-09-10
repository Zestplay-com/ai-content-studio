import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("WORKFLOW_NAV_V1")) {
  console.log("Workflow navigation already installed.");
  process.exit(0);
}

const stateAnchor = '  const [stockError, setStockError] = useState("");\n';
if (!text.includes(stateAnchor)) throw new Error("Workflow state anchor was not found.");
text = text.replace(stateAnchor, stateAnchor + '  const [workflowStep, setWorkflowStep] = useState("idea");\n');

const returnAnchor = "  return (";
if (!text.includes(returnAnchor)) throw new Error("Component return anchor was not found.");
const helper = `  function goToWorkflowStep(step: string, id: string) {
    setWorkflowStep(step);
    window.requestAnimationFrame(() => {
      window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }), 40);
    });
  }

`;
text = text.replace(returnAnchor, helper + returnAnchor);

text = text.replace(
  'onClick={() => { setShowVoiceoverStage(true); window.requestAnimationFrame(() => document.getElementById("voiceover-section")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}',
  'onClick={() => { setShowVoiceoverStage(true); goToWorkflowStep("voiceover", "voiceover-section"); }}',
);
text = text.replace(
  'onClick={() => { window.requestAnimationFrame(() => document.getElementById("captions-section")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}',
  'onClick={() => { goToWorkflowStep("captions", "captions-section"); }}',
);
text = text.replace(
  'onClick={() => { window.requestAnimationFrame(() => document.getElementById("timeline-section")?.scrollIntoView({ behavior: "smooth", block: "start" })); }}',
  'onClick={() => { goToWorkflowStep("timeline", "timeline-section"); }}',
);

text = text.replace(
  '<section id="voiceover-section" style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>',
  '<section id="voiceover-section" style={{ ...card, marginTop: 18, borderColor: "#29476a", scrollMarginTop: 90 }}>',
);
text = text.replace(
  '<section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>\n                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>\n                    <div><h2 style={{ margin: 0, fontSize: 22 }}>Automatic Captions</h2>',
  '<section id="captions-section" style={{ ...card, marginTop: 18, borderColor: "#29476a", scrollMarginTop: 90 }}>\n                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}>\n                    <div><h2 style={{ margin: 0, fontSize: 22 }}>Automatic Captions</h2>',
);
text = text.replace(
  '<section style={{ ...card, marginTop: 18, borderColor: "#29476a" }}>\n                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><h2 style={{ margin: 0, fontSize: 22 }}>Automatic Timeline Assembly</h2>',
  '<section id="timeline-section" style={{ ...card, marginTop: 18, borderColor: "#29476a", scrollMarginTop: 90 }}>\n                  <div style={{ display: "flex", justifyContent: "space-between", gap: 12, alignItems: "center", flexWrap: "wrap" }}><div><h2 style={{ margin: 0, fontSize: 22 }}>Automatic Timeline Assembly</h2>',
);

const nav = `
              {/* WORKFLOW_NAV_V1 */}
              <div style={{ position: "sticky", top: 8, zIndex: 30, marginBottom: 16, padding: "10px 12px", border: "1px solid #29476a", borderRadius: 16, background: "rgba(7,15,25,.94)", backdropFilter: "blur(12px)" }}>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div style={{ fontSize: 12, fontWeight: 800 }}>VIDEO WORKFLOW</div>
                  <div style={{ color: "#8fa4bd", fontSize: 11 }}>Current: {workflowStep === "idea" ? "Idea & Script" : workflowStep === "scenes" ? "Scenes & Footage" : workflowStep === "voiceover" ? "Voiceover" : workflowStep === "captions" ? "Captions" : workflowStep === "timeline" ? "Timeline" : "Export"}</div>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(6, minmax(0, 1fr))", gap: 6, marginTop: 9 }}>
                  {[ ["idea", "Idea", ""], ["scenes", "Scenes", ""], ["voiceover", "Voice", "voiceover-section"], ["captions", "Captions", "captions-section"], ["timeline", "Timeline", "timeline-section"], ["export", "Export", ""] ].map(([step, label, target]) => <button key={step} type="button" onClick={() => target ? goToWorkflowStep(step, target) : setWorkflowStep(step)} style={{ padding: "8px 5px", borderRadius: 9, border: workflowStep === step ? "1px solid #6ea8fe" : "1px solid #1d3048", background: workflowStep === step ? "#102744" : "#091522", color: workflowStep === step ? "#dce9f7" : "#7186a0", fontSize: 10, fontWeight: 800 }}>{label}</button>)}
                </div>
              </div>
`;

const headerAnchor = '            <div style={{ maxWidth: 850, margin: "28px auto 60px" }}>\n';
if (!text.includes(headerAnchor)) throw new Error("Creator content anchor was not found.");
text = text.replace(headerAnchor, headerAnchor + nav);

writeFileSync(path, text);
console.log("Workflow navigation installed successfully.");
