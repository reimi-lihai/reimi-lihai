import { cp, mkdir, rm, stat, writeFile } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

const requiredFiles = [
  "index.html",
  "stays.html",
  "stay-detail.html",
  "booking.html",
  "properties.html",
  "property-detail.html",
  "viewing.html",
  "inbound.html",
  "company.html",
  "contact.html",
  "reservation.html",
  "payment-result.html",
  "privacy.html",
  "terms.html",
  "cancellation.html",
  "offline.html",
  "404.html",
  "styles.css",
  "manifest.webmanifest",
  "service-worker.js",
  "robots.txt",
  "sitemap.xml",
  "src/main.mjs",
  "src/i18n.mjs",
  "src/data.mjs",
  "src/booking-service.mjs",
  "src/dictionaries/ja.mjs",
  "src/dictionaries/en.mjs",
  "src/dictionaries/zh-Hant.mjs",
  "src/dictionaries/zh-Hans.mjs",
  "src/dictionaries/ko.mjs",
  "assets/logo.svg",
  "assets/icon.svg"
];

for (const file of requiredFiles) {
  await stat(join(root, file));
}

await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });

for (const file of requiredFiles) {
  const source = join(root, file);
  const target = join(dist, file);
  await mkdir(dirname(target), { recursive: true });
  await cp(source, target, { recursive: true });
}

await writeFile(join(dist, ".nojekyll"), "");
console.log("Built static GitHub Pages site into dist/");
