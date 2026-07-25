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

const projectRoot = path.resolve(__dirname, "../..");
const queuePath = path.join(
  projectRoot,
  "force-app",
  "main",
  "default",
  "queues",
  "Messaging_Queue.queue-meta.xml"
);

function updateMessagingQueueUser() {
  try {
    const output = execSync("sf org display --json", {
      cwd: projectRoot,
      encoding: "utf-8",
      stdio: ["pipe", "pipe", "ignore"]
    });
    const parsed = JSON.parse(output);
    const username = parsed.result?.username;
    const email = parsed.result?.email || username;

    if (username && fs.existsSync(queuePath)) {
      let queueContent = fs.readFileSync(queuePath, "utf-8");
      let updatedQueue = queueContent.replace(
        /<users\b[^>]*>[\s\S]*?<\/users>/i,
        `<users>\n            <user>${username}</user>\n        </users>`
      );
      if (email) {
        updatedQueue = updatedQueue.replace(
          /<email\b[^>]*>[\s\S]*?<\/email>/i,
          `<email>${email}</email>`
        );
      }
      if (queueContent !== updatedQueue) {
        fs.writeFileSync(queuePath, updatedQueue, "utf-8");
        console.log(
          `[Queue] Dynamically set Messaging_Queue member to active SF user: ${username}`
        );
      }
    }
  } catch (error) {
    // Suppress if offline or target-org not yet initialized
  }
}

if (require.main === module) {
  updateMessagingQueueUser();
}

module.exports = { updateMessagingQueueUser };
