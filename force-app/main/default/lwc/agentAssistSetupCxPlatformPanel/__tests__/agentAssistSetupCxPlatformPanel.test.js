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
import AgentAssistSetupCxPlatformPanel from "c/agentAssistSetupCxPlatformPanel";

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.getInstalledPackageStatus",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return { default: createApexTestWireAdapter() };
  },
  { virtual: true }
);

describe("c-agent-assist-setup-cx-platform-panel", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("renders platform guide accordion and platform logos", async () => {
    const element = createElement("c-agent-assist-setup-cx-platform-panel", {
      is: AgentAssistSetupCxPlatformPanel
    });

    document.body.appendChild(element);
    await Promise.resolve();

    const accordion = element.shadowRoot.querySelector("lightning-accordion");
    expect(accordion).not.toBeNull();

    const logoImgs = element.shadowRoot.querySelectorAll(".platform-logo-img");
    expect(logoImgs.length).toBeGreaterThanOrEqual(5);

    const logoSrcs = Array.from(logoImgs).map((img) => img.getAttribute("src"));
    expect(logoSrcs).toContain("platform_logos/salesforce_logo.svg");
    expect(logoSrcs).toContain("platform_logos/five9_logo.svg");
  });
});
