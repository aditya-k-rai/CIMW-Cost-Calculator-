const { execSync } = require("child_process");

console.log("Executing monorepo build...");

try {
  console.log("1. Building shared package...");
  execSync("npm run build --workspace @cost-calculator/shared", { stdio: "inherit" });

  if (process.env.VERCEL) {
    console.log("Vercel environment detected. Skipping backend API compilation to prevent native SQLite compilation errors.");
  } else {
    console.log("2. Building API backend...");
    execSync("npm run build --workspace @cost-calculator/api", { stdio: "inherit" });
  }

  console.log("3. Building Next.js Web frontend...");
  execSync("npm run build --workspace @cost-calculator/web", { stdio: "inherit" });
  
  console.log("Build completed successfully!");
} catch (error) {
  console.error("Build failed:", error);
  process.exit(1);
}
