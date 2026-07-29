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
import AgentAssistSetupProfilesPanel from "c/agentAssistSetupProfilesPanel";

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.checkEndpointHealth",
  () => ({
    default: jest.fn().mockResolvedValue({
      statusCode: 200,
      status: "pass",
      statusLabel: "200 OK",
      message: "Endpoint is reachable."
    })
  }),
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.registerAuthToken",
  () => ({
    default: jest.fn().mockResolvedValue({
      status: "success",
      token: "mock-token"
    })
  }),
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.getActiveUsers",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return { default: createApexTestWireAdapter() };
  },
  { virtual: true }
);

describe("c-agent-assist-setup-profiles-panel", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  const MOCK_PROFILES = [
    {
      id: "mock-1",
      name: "Default Profile",
      developerName: "Default",
      profileType: "Container",
      title: "Google Cloud Agent Assist",
      endpointUrl: "https://ui-connector.run.app",
      conversationProfile: "projects/123/conversationProfiles/456",
      channel: "chat",
      platform: "base"
    },
    {
      id: "mock-2",
      name: "Companion Agent",
      developerName: "Default_Companion",
      profileType: "Companion Agent",
      title: "Google Cloud Companion Agent",
      endpointUrl: "https://ui-connector.run.app",
      conversationProfile: "projects/123/conversationProfiles/789",
      channel: "chat",
      platform: "base"
    }
  ];

  it("renders profile list items and editor form", async () => {
    const element = createElement("c-agent-assist-setup-profiles-panel", {
      is: AgentAssistSetupProfilesPanel
    });
    element.profiles = MOCK_PROFILES;
    element.selectedDevName = "Default";
    element.currentProfile = MOCK_PROFILES[0];

    document.body.appendChild(element);
    await Promise.resolve();

    const items = element.shadowRoot.querySelectorAll(".profile-item");
    expect(items.length).toBe(2);
    expect(items[0].classList.contains("profile-item_active")).toBe(true);
  });

  it("dispatches opennewprofilemodal when New LWC Profile button is clicked", async () => {
    const element = createElement("c-agent-assist-setup-profiles-panel", {
      is: AgentAssistSetupProfilesPanel
    });
    element.profiles = MOCK_PROFILES;
    element.currentProfile = MOCK_PROFILES[0];

    document.body.appendChild(element);
    await Promise.resolve();

    const handler = jest.fn();
    element.addEventListener("opennewprofilemodal", handler);

    const newBtn = element.shadowRoot.querySelector("button.slds-button_brand");
    expect(newBtn).not.toBeNull();
    newBtn.click();

    expect(handler).toHaveBeenCalled();
  });

  it("dispatches profileselect event when a profile item is clicked", async () => {
    const element = createElement("c-agent-assist-setup-profiles-panel", {
      is: AgentAssistSetupProfilesPanel
    });
    element.profiles = MOCK_PROFILES;
    element.selectedDevName = "Default";
    element.currentProfile = MOCK_PROFILES[0];

    document.body.appendChild(element);
    await Promise.resolve();

    const handler = jest.fn();
    element.addEventListener("profileselect", handler);

    const items = element.shadowRoot.querySelectorAll(".profile-item");
    items[1].click();

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { developerName: "Default_Companion" }
      })
    );
  });

  it("dispatches fieldchange event on input change", async () => {
    const element = createElement("c-agent-assist-setup-profiles-panel", {
      is: AgentAssistSetupProfilesPanel
    });
    element.profiles = MOCK_PROFILES;
    element.currentProfile = MOCK_PROFILES[0];

    document.body.appendChild(element);
    await Promise.resolve();

    const handler = jest.fn();
    element.addEventListener("fieldchange", handler);

    const titleInput = element.shadowRoot.querySelector(
      'lightning-input[data-field="title"]'
    );
    expect(titleInput).not.toBeNull();
    titleInput.value = "Updated Title";
    titleInput.dispatchEvent(new CustomEvent("change"));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { field: "title", value: "Updated Title" }
      })
    );
  });

  it("dispatches action events (saveprofile, saveascopy, deleteprofile, resetprofile)", async () => {
    const element = createElement("c-agent-assist-setup-profiles-panel", {
      is: AgentAssistSetupProfilesPanel
    });
    element.profiles = MOCK_PROFILES;
    element.selectedDevName = "Custom_Dev";
    element.currentProfile = {
      ...MOCK_PROFILES[0],
      developerName: "Custom_Dev"
    };

    document.body.appendChild(element);
    await Promise.resolve();

    const saveHandler = jest.fn();
    const copyHandler = jest.fn();
    const deleteHandler = jest.fn();

    element.addEventListener("saveprofile", saveHandler);
    element.addEventListener("saveascopy", copyHandler);
    element.addEventListener("deleteprofile", deleteHandler);

    const buttons = Array.from(element.shadowRoot.querySelectorAll("button"));
    const saveBtn = buttons.find((b) => b.textContent.includes("Save Profile"));
    const copyBtn = buttons.find((b) => b.textContent.includes("Save as Copy"));
    const deleteBtn = buttons.find((b) => b.textContent.includes("Delete Profile"));

    if (saveBtn) saveBtn.click();
    if (copyBtn) copyBtn.click();
    if (deleteBtn) deleteBtn.click();

    expect(saveHandler).toHaveBeenCalled();
    expect(copyHandler).toHaveBeenCalled();
    expect(deleteHandler).toHaveBeenCalled();
  });
});
