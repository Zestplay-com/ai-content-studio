import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("PRODUCTION_RENDER_FIX_V1")) {
  console.log("Production render JSX fix already installed.");
  process.exit(0);
}

const broken = "Your video is ready as {renderedVideoType}. A download should have started automatically.</div></div>');";
const fixed = "Your video is ready as {renderedVideoType}. A download should have started automatically.</div></div>}');";

if (text.includes(broken)) {
  text = text.replace(broken, fixed);
  console.log("Fixed missing JSX conditional closure in production render UI.");
} else if (!text.includes("PRODUCTION_FLOW_V1")) {
  console.log("Production render block not present; nothing to repair.");
} else {
  throw new Error("Production render block was found, but its expected malformed JSX was not found.");
}

text += "\n// PRODUCTION_RENDER_FIX_V1\n";
writeFileSync(path, text);
console.log("Production render JSX fix installed successfully.");
