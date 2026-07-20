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

const {
  updateEcaExecutionUser
} = require("./predeployment-tasks/configure-eca-user");
const {
  updateMessagingQueueUser
} = require("./predeployment-tasks/configure-messaging-queue");
const {
  checkStaticResources
} = require("./predeployment-tasks/check-static-resources");

function runPredeploymentTasks() {
  console.log("[Predeploy] 🛠️ Executing predeployment configuration tasks...");

  // 1. Configure External Client App & OAuth Policy execution user
  updateEcaExecutionUser();

  // 2. Configure Omni-Channel Messaging Queue user membership
  updateMessagingQueueUser();

  // 3. Validate & bundle UI Modules static resources
  checkStaticResources();

  console.log("[Predeploy] ✅ Predeployment tasks completed successfully.");
}

if (require.main === module) {
  runPredeploymentTasks();
}

module.exports = { runPredeploymentTasks };
