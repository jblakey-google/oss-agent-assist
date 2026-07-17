/**
 * Copyright 2026 Google LLC
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

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
