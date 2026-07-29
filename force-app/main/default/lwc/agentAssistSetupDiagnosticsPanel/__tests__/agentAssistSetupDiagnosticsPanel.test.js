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

import { createElement } from "@lwc/engine-dom";
import AgentAssistSetupDiagnosticsPanel from "c/agentAssistSetupDiagnosticsPanel";
import getOrgDiagnostics from "@salesforce/apex/AgentAssistConfigController.getOrgDiagnostics";

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.getOrgDiagnostics",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return { default: createApexTestWireAdapter() };
  },
  { virtual: true }
);

const MOCK_DIAGNOSTICS_DATA = {
  isHealthy: true,
  passCount: 5,
  failCount: 0,
  warningCount: 0,
  sections: [
    {
      id: "ui_connector",
      title: "UI Connector & Network Endpoints",
      subtitle: "Verify HTTPS, WebSocket, and API allowlists in Trusted URLs.",
      iconName: "utility:connected_apps",
      setupUrl: "/lightning/setup/SecurityCspTrustedSite/home",
      setupUrlLabel: "Trusted URLs",
      items: [
        {
          id: "check-ui-https",
          label: "Cloud Run HTTPS Endpoint (cloud_run_https)",
          subLabel: "Allowlisted in Trusted URLs: https://*.run.app",
          status: "pass",
          errorMessage: null,
          assignees: []
        }
      ]
    }
  ]
};

describe("c-agent-assist-setup-diagnostics-panel", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("evaluates diagnostics data and renders instrument cards and status pills", async () => {
    const element = createElement("c-agent-assist-setup-diagnostics-panel", {
      is: AgentAssistSetupDiagnosticsPanel
    });

    document.body.appendChild(element);

    getOrgDiagnostics.emit(MOCK_DIAGNOSTICS_DATA);
    await Promise.resolve();

    const cards = element.shadowRoot.querySelectorAll(".instrument-card");
    expect(cards.length).toBeGreaterThan(0);

    const statusPill = element.shadowRoot.querySelector(".status-pill_pass");
    expect(statusPill).not.toBeNull();
  });

  it("handles manual diagnostics refresh button click", async () => {
    const element = createElement("c-agent-assist-setup-diagnostics-panel", {
      is: AgentAssistSetupDiagnosticsPanel
    });

    document.body.appendChild(element);
    await Promise.resolve();

    const runBtn = element.shadowRoot.querySelector("lightning-button");
    expect(runBtn).not.toBeNull();
    runBtn.click();
    await Promise.resolve();
  });
});
