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
import AgentAssistSetupUsersPanel from "c/agentAssistSetupUsersPanel";
import getUsersWithPermissionSetStatus from "@salesforce/apex/AgentAssistConfigController.getUsersWithPermissionSetStatus";
import toggleUserPermissionSetAssignment from "@salesforce/apex/AgentAssistConfigController.toggleUserPermissionSetAssignment";

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.getUsersWithPermissionSetStatus",
  () => ({
    default: jest.fn().mockResolvedValue([
      { label: "Jane Doe (jane@example.com)", value: "005xx001", isAssigned: true },
      { label: "John Smith (john@example.com)", value: "005xx002", isAssigned: false }
    ])
  }),
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.toggleUserPermissionSetAssignment",
  () => ({
    default: jest.fn().mockResolvedValue(true)
  }),
  { virtual: true }
);

describe("c-agent-assist-setup-users-panel", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("loads users and filters user search list", async () => {
    const element = createElement("c-agent-assist-setup-users-panel", {
      is: AgentAssistSetupUsersPanel
    });

    document.body.appendChild(element);
    await Promise.resolve();
    await Promise.resolve();

    const searchInput = element.shadowRoot.querySelector("lightning-input");
    expect(searchInput).not.toBeNull();

    searchInput.value = "Jane";
    searchInput.dispatchEvent(new CustomEvent("change"));
    await Promise.resolve();

    expect(element.shadowRoot.querySelectorAll(".user-search-results-container").length).toBe(1);
  });

  it("toggles user permission assignment inline", async () => {
    const element = createElement("c-agent-assist-setup-users-panel", {
      is: AgentAssistSetupUsersPanel
    });

    document.body.appendChild(element);
    await Promise.resolve();
    await Promise.resolve();

    const btn = element.shadowRoot.querySelector("lightning-button");
    expect(btn).not.toBeNull();
    btn.click();
    await Promise.resolve();

    expect(toggleUserPermissionSetAssignment).toHaveBeenCalled();
  });
});
