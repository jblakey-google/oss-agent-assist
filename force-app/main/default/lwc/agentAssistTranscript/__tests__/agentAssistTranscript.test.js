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
import AgentAssistTranscript from "c/agentAssistTranscript";
import getResolvedConfig from "@salesforce/apex/AgentAssistConfigController.getResolvedConfig";
import { loadScript } from "lightning/platformResourceLoader";

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.getResolvedConfig",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return {
      default: createApexTestWireAdapter()
    };
  },
  { virtual: true }
);

jest.mock(
  "lightning/platformResourceLoader",
  () => ({
    loadScript: jest.fn().mockImplementation(() => {
      global.addAgentAssistEventListener = jest.fn();
      return Promise.resolve();
    })
  }),
  { virtual: true }
);

describe("c-agent-assist-transcript", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("renders agent assist transcript and resolves config", () => {
    const element = createElement("c-agent-assist-transcript", {
      is: AgentAssistTranscript
    });
    element.configName = "Default";

    document.body.appendChild(element);

    getResolvedConfig.emit({
      id: "mock-1",
      name: "Default Profile",
      developerName: "Default",
      profileType: "Container",
      title: "Google Cloud Agent Assist",
      containerHeight: "530px",
      debugMode: true,
      isFound: true
    });

    return Promise.resolve().then(() => {
      const container = element.shadowRoot.querySelector(
        ".agent-assist-component"
      );
      expect(container).not.toBeNull();
    });
  });

  it("renders missing profile error view when profile is missing", () => {
    const element = createElement("c-agent-assist-transcript", {
      is: AgentAssistTranscript
    });
    element.configName = "NonExistentProfile";

    document.body.appendChild(element);

    getResolvedConfig.emit({
      developerName: "NonExistentProfile",
      isFound: false
    });

    return Promise.resolve().then(() => {
      const missingBox = element.shadowRoot.querySelector(
        ".missing-profile-box"
      );
      expect(missingBox).not.toBeNull();
    });
  });

  it("loads script and mounts agent-assist-transcript with namespace attribute", async () => {
    const element = createElement("c-agent-assist-transcript", {
      is: AgentAssistTranscript
    });
    element.configName = "Default";
    element.recordId = "001xx000003DGGZAA4";

    document.body.appendChild(element);

    getResolvedConfig.emit({
      id: "mock-1",
      name: "Default Profile",
      developerName: "Default",
      profileType: "Container",
      containerHeight: "500px",
      debugMode: true,
      isFound: true
    });

    // Wait for wire adapter emit and async renderedCallback execution
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    await new Promise((r) => setTimeout(r, 0));

    expect(loadScript).toHaveBeenCalled();
    const transcriptEl = element.shadowRoot.querySelector(
      "agent-assist-transcript"
    );
    expect(transcriptEl).not.toBeNull();
    expect(transcriptEl.getAttribute("namespace")).toBe("001xx000003DGGZAA4");
  });

  it("toggles dark mode class when handleDarkModeToggled is triggered", async () => {
    const element = createElement("c-agent-assist-transcript", {
      is: AgentAssistTranscript
    });
    element.configName = "Default";

    document.body.appendChild(element);

    getResolvedConfig.emit({
      id: "mock-1",
      name: "Default Profile",
      developerName: "Default",
      isFound: true
    });

    await Promise.resolve();

    element.handleDarkModeToggled({ detail: { on: true } });

    const componentEl = element.shadowRoot.querySelector(
      ".agent-assist-component"
    );
    expect(componentEl.classList.contains("dark-mode")).toBe(true);

    element.handleDarkModeToggled({ detail: { on: false } });
    expect(componentEl.classList.contains("dark-mode")).toBe(false);
  });

  it("resets _uiModuleEventTarget on disconnect", () => {
    const element = createElement("c-agent-assist-transcript", {
      is: AgentAssistTranscript
    });
    element.configName = "Default";

    const mockEventTarget = {
      cloneNode: jest.fn().mockReturnValue({})
    };
    window._uiModuleEventTarget = mockEventTarget;

    document.body.appendChild(element);
    document.body.removeChild(element);

    expect(mockEventTarget.cloneNode).toHaveBeenCalledWith(true);
    delete window._uiModuleEventTarget;
  });
});
