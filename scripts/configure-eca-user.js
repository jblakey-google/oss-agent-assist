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
const policyPath = path.join(
  projectRoot,
  "force-app",
  "main",
  "default",
  "extlClntAppOauthConfigurablePolicies",
  "Agent_Assist_LWC_Auth_policy.ecaOauthPlcy-meta.xml"
);
const appPath = path.join(
  projectRoot,
  "force-app",
  "main",
  "default",
  "externalClientApps",
  "Agent_Assist_LWC_Auth.eca-meta.xml"
);

function updateEcaExecutionUser() {
  try {
    const output = execSync("sf org display --json", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"]
    });
    const parsed = JSON.parse(output);
    const username = parsed.result?.username;
    const email = parsed.result?.email || username;

    if (username && fs.existsSync(policyPath)) {
      let content = fs.readFileSync(policyPath, "utf-8");
      const updated = content.replace(
        /<clientCredentialsFlowUser>[\s\S]*?<\/clientCredentialsFlowUser>/,
        `<clientCredentialsFlowUser>${username}</clientCredentialsFlowUser>`
      );
      if (content !== updated) {
        fs.writeFileSync(policyPath, updated, "utf-8");
        console.log(`[ECA] Dynamically set clientCredentialsFlowUser to active SF user: ${username}`);
      }
    }

    if (email && fs.existsSync(appPath)) {
      let appContent = fs.readFileSync(appPath, "utf-8");
      const updatedApp = appContent.replace(
        /<contactEmail>[\s\S]*?<\/contactEmail>/,
        `<contactEmail>${email}</contactEmail>`
      );
      if (appContent !== updatedApp) {
        fs.writeFileSync(appPath, updatedApp, "utf-8");
        console.log(`[ECA] Dynamically set contactEmail to active SF user email: ${email}`);
      }
    }
  } catch (error) {
    // Suppress if offline or target-org not yet initialized
  }
}

if (require.main === module) {
  updateEcaExecutionUser();
}

module.exports = { updateEcaExecutionUser };
