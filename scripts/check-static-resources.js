const fs = require("fs");
const path = require("path");
const { execSync } = require("child_process");

const projectRoot = path.resolve(__dirname, "..");
const uiModulesDir = path.join(
  projectRoot,
  "force-app",
  "main",
  "default",
  "staticresources",
  "ui_modules"
);

const requiredFiles = ["transcript.js", "container.js", "common.js"];

function hasValidJsFiles() {
  if (!fs.existsSync(uiModulesDir)) {
    return false;
  }
  for (const file of requiredFiles) {
    const filePath = path.join(uiModulesDir, file);
    if (!fs.existsSync(filePath)) {
      return false;
    }
    const stats = fs.statSync(filePath);
    if (stats.size === 0) {
      return false;
    }
  }
  return true;
}

if (!hasValidJsFiles()) {
  console.log(
    "Static resource JS files missing or empty in staticresources/ui_modules. Generating static resources..."
  );
  try {
    execSync("npm run generate-aa-static-resources", {
      cwd: projectRoot,
      stdio: "inherit"
    });
  } catch (error) {
    console.error("Failed to generate static resources:", error);
    process.exit(1);
  }
}
