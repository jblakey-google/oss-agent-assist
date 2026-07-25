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

const { execSync } = require("child_process");
const fs = require("fs");
const path = require("path");

function configureOrgDomainRemoteSite() {
  try {
    const orgInfoJson = execSync("sf org display --json", { encoding: "utf8" });
    const orgInfo = JSON.parse(orgInfoJson);
    const instanceUrl = orgInfo.result?.instanceUrl;

    if (!instanceUrl) {
      console.warn("Could not determine org instance URL.");
      return;
    }

    const xmlPath = path.join(
      __dirname,
      "../../force-app/main/default/remoteSiteSettings/Agent_Assist_Org_Domain.remoteSite-meta.xml"
    );

    const xmlContent = `<?xml version="1.0" encoding="UTF-8"?>
<RemoteSiteSetting xmlns="http://soap.sforce.com/2006/04/metadata">
    <disableProtocolHeader>false</disableProtocolHeader>
    <isActive>true</isActive>
    <url>${instanceUrl}</url>
</RemoteSiteSetting>`;

    fs.writeFileSync(xmlPath, xmlContent, "utf8");
    console.log(`Updated Agent_Assist_Org_Domain Remote Site Setting with URL: ${instanceUrl}`);
  } catch (err) {
    console.warn("Warning: Failed to auto-configure Agent_Assist_Org_Domain Remote Site Setting:", err.message);
  }
}

module.exports = { configureOrgDomainRemoteSite };
