// Builds Ardrix into dist/ with esbuild. `--serve` runs a local dev server with live rebuilds.
import * as esbuild from "esbuild";
import { cpSync, mkdirSync, readFileSync, rmSync, writeFileSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";

const serve = process.argv.includes("--serve");
const out = "dist";

rmSync(out, { recursive: true, force: true });
mkdirSync(`${out}/assets`, { recursive: true });
cpSync("public", out, { recursive: true });

const options = {
  entryPoints: { app: "src/main.tsx" },
  bundle: true,
  outdir: `${out}/assets`,
  entryNames: serve ? "[name]" : "[name]-[hash]",
  format: "esm",
  target: ["es2020", "safari15"],
  jsx: "automatic",
  minify: !serve,
  sourcemap: true,
  metafile: true,
  logLevel: "info",
  define: { "process.env.NODE_ENV": JSON.stringify(serve ? "development" : "production") },
  nodePaths: (process.env.NODE_PATH || "").split(":").filter(Boolean),
};

function writeHtml(metafile) {
  const outputs = Object.keys(metafile.outputs).map((p) => p.replace(`${out}/`, ""));
  const js = outputs.find((p) => /assets\/app[^/]*\.js$/.test(p));
  const css = outputs.find((p) => /assets\/app[^/]*\.css$/.test(p));
  const version = createHash("sha1").update(outputs.join("|")).digest("hex").slice(0, 10);
  const html = readFileSync("index.html", "utf8").replace("%APP_JS%", `./${js}`).replace("%APP_CSS%", `./${css}`);
  writeFileSync(`${out}/index.html`, html);
  // Give the service worker a new cache name on every build so updates reach installed apps.
  const sw = readFileSync("public/sw.js", "utf8").replace("__BUILD_VERSION__", version);
  writeFileSync(`${out}/sw.js`, sw);
  return version;
}

if (serve) {
  const ctx = await esbuild.context({
    ...options,
    plugins: [{ name: "html", setup(b) { b.onEnd((r) => { if (r.metafile) writeHtml(r.metafile); }); } }],
  });
  await ctx.watch();
  const { port } = await ctx.serve({ servedir: out, port: Number(process.env.PORT) || 5173 });
  console.log(`\nArdrix dev server: http://localhost:${port}/\n`);
} else {
  const result = await esbuild.build(options);
  const v = writeHtml(result.metafile);
  console.log(`Built ${readdirSync(`${out}/assets`).length} assets · version ${v}`);
}
