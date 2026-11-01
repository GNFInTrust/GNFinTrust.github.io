// Renders every composition into out/<id>.mp4
import { execSync } from "node:child_process";

const ids = ["Esf1-WhoMust", "Esf2-HowTo", "Vat-Formulas"];
for (const id of ids) {
  execSync(`npx remotion render src/index.ts ${id} out/${id}.mp4`, { stdio: "inherit" });
}
