import { randomBytes } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";

const path = ".env.local";
let contents = existsSync(path) ? readFileSync(path, "utf8") : "";
const defaults = {
  BACKCOSAIF_URL: "http://127.0.0.1:3008",
  SESSION_SECRET: randomBytes(32).toString("base64url"),
  COSAIF_DOWNLOAD_DATA_DIR: ".data",
};
for (const [name, value] of Object.entries(defaults)) {
  if (!new RegExp(`^${name}=.+$`, "m").test(contents)) {
    contents = contents.replace(new RegExp(`^${name}=.*\\n?`, "m"), "");
    contents += `${contents && !contents.endsWith("\n") ? "\n" : ""}${name}=${value}\n`;
  }
}
writeFileSync(path, contents, { mode: 0o600 });
console.log("Local configuration ready; no credentials are printed.");
