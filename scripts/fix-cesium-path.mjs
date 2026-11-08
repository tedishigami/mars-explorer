import fs from "node:fs";
import path from "node:path";

const source = path.resolve("dist/mars-explorer/cesium");
const destination = path.resolve("dist/cesium");

if (!fs.existsSync(path.join(source, "Cesium.js"))) {
  console.error("ERREUR : Cesium.js introuvable dans", source);
  process.exit(1);
}

fs.mkdirSync(path.dirname(destination), { recursive: true });

if (fs.existsSync(destination)) {
  fs.rmSync(destination, { recursive: true, force: true });
}

fs.renameSync(source, destination);

const nestedBase = path.resolve("dist/mars-explorer");
if (fs.existsSync(nestedBase)) {
  fs.rmSync(nestedBase, { recursive: true, force: true });
}

console.log("Correction Cesium terminée.");
