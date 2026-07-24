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
import AgentAssistContainer from "c/agentAssistContainer";
import getResolvedConfig from "@salesforce/apex/AgentAssistConfigController.getResolvedConfig";

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

describe("c-agent-assist-container", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
  });

  it("renders agent assist container and resolves config", () => {
    const element = createElement("c-agent-assist-container", {
      is: AgentAssistContainer
    });
    element.configName = "Default";

    document.body.appendChild(element);

    getResolvedConfig.emit({
      id: "mock-1",
      name: "Default Profile",
      developerName: "Default",
      profileType: "Container",
      title: "Google Cloud Agent Assist",
      endpointUrl: "https://ui-connector-{id}.{region}.run.app",
      conversationProfile: "projects/p/locations/l/conversationProfiles/cp",
      channel: "chat",
      platform: "messaging",
      containerHeight: "530px",
      debugMode: true,
      showDarkModeToggle: true,
      isFound: true
    });

    return Promise.resolve().then(() => {
      const container = element.shadowRoot.querySelector(
        ".agent-assist-component"
      );
      expect(container).not.toBeNull();
    });
  });

  it("tears down platformService and resets _uiModuleEventTarget on disconnect", () => {
    const element = createElement("c-agent-assist-container", {
      is: AgentAssistContainer
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

  it("disables transcript when disableIntegratedTranscript is true", () => {
    const element = createElement("c-agent-assist-container", {
      is: AgentAssistContainer
    });
    element.configName = "Default";

    document.body.appendChild(element);

    getResolvedConfig.emit({
      id: "mock-2",
      name: "Default Profile",
      developerName: "Default",
      profileType: "Container",
      channel: "voice",
      debugMode: true,
      disableIntegratedTranscript: true,
      isFound: true
    });

    return Promise.resolve().then(() => {
      expect(element.disableIntegratedTranscript).toBe(true);
      const transcriptEl = element.shadowRoot.querySelector(
        ".transcript-container"
      );
      expect(transcriptEl).toBeNull();
    });
  });

  it("enables transcript in chat channel when disableIntegratedTranscript is false and debugMode is false", () => {
    const element = createElement("c-agent-assist-container", {
      is: AgentAssistContainer
    });
    element.configName = "Default";

    document.body.appendChild(element);

    getResolvedConfig.emit({
      id: "mock-3",
      name: "Default Profile",
      developerName: "Default",
      profileType: "Container",
      channel: "chat",
      debugMode: false,
      disableIntegratedTranscript: false,
      isFound: true
    });

    return Promise.resolve().then(() => {
      expect(element.disableIntegratedTranscript).toBe(false);
      const transcriptEl = element.shadowRoot.querySelector(
        ".transcript-container"
      );
      expect(transcriptEl).not.toBeNull();
    });
  });
});
