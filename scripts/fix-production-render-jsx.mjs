import { readFileSync, writeFileSync } from "node:fs";

const path = "app/page.tsx";
let text = readFileSync(path, "utf8");

if (text.includes("PRODUCTION_RENDER_FIX_V2")) {
  console.log("Production render JSX fix already installed.");
  process.exit(0);
}

const marker = "Your video is ready as {renderedVideoType}. A download should have started automatically.";
const markerIndex = text.indexOf(marker);

if (markerIndex >= 0) {
  const contentStart = markerIndex + marker.length;
  const closingHtml = "</div></div>";
  const closingIndex = text.indexOf(closingHtml, contentStart);

  if (closingIndex >= 0) {
    const insertAt = closingIndex + closingHtml.length;
    if (text.slice(insertAt, insertAt + 1) !== "}") {
      text = text.slice(0, insertAt) + "}" + text.slice(insertAt);
      console.log("Fixed missing JSX conditional closure in production render UI.");
    } else {
      console.log("Production render JSX conditional is already correctly closed.");
    }
  } else {
    console.log("Production render completion block found, but no closing JSX sequence was found.");
  }
} else {
  console.log("Production render completion block not present; nothing to repair.");
}

text += "\n// PRODUCTION_RENDER_FIX_V2\n";
writeFileSync(path, text);
console.log("Production render JSX repair completed successfully.");
