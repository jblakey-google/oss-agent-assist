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
import AgentAssistSetupSimulatorPanel from "c/agentAssistSetupSimulatorPanel";

describe("c-agent-assist-setup-simulator-panel", () => {
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
      profileType: "Container"
    },
    {
      id: "mock-2",
      name: "Companion Agent",
      developerName: "Default_Companion",
      profileType: "Companion Agent"
    }
  ];

  it("renders profile combobox options and instantiated component badge", async () => {
    const element = createElement("c-agent-assist-setup-simulator-panel", {
      is: AgentAssistSetupSimulatorPanel
    });
    element.profiles = MOCK_PROFILES;
    element.simulatorProfileDevName = "Default";

    document.body.appendChild(element);
    await Promise.resolve();

    const combobox = element.shadowRoot.querySelector("lightning-combobox");
    expect(combobox).not.toBeNull();
    expect(combobox.options.length).toBe(2);

    const badge = element.shadowRoot.querySelector(".slds-badge");
    expect(badge).not.toBeNull();
    expect(badge.textContent).toBe("Container");
  });

  it("dispatches simulatorprofilechange event on combobox selection", async () => {
    const element = createElement("c-agent-assist-setup-simulator-panel", {
      is: AgentAssistSetupSimulatorPanel
    });
    element.profiles = MOCK_PROFILES;
    element.simulatorProfileDevName = "Default";

    document.body.appendChild(element);
    await Promise.resolve();

    const handler = jest.fn();
    element.addEventListener("simulatorprofilechange", handler);

    const combobox = element.shadowRoot.querySelector("lightning-combobox");
    combobox.value = "Default_Companion";
    combobox.dispatchEvent(new CustomEvent("change", { detail: { value: "Default_Companion" } }));

    expect(handler).toHaveBeenCalledWith(
      expect.objectContaining({
        detail: { developerName: "Default_Companion" }
      })
    );
  });

  it("dispatches simulated message when sending customer or agent message", async () => {
    const element = createElement("c-agent-assist-setup-simulator-panel", {
      is: AgentAssistSetupSimulatorPanel
    });
    element.profiles = MOCK_PROFILES;
    element.simulatorProfileDevName = "Default";

    document.body.appendChild(element);
    await Promise.resolve();

    const spy = jest.spyOn(window, "dispatchEvent");

    const inputs = element.shadowRoot.querySelectorAll("lightning-input");
    expect(inputs.length).toBeGreaterThanOrEqual(2);

    inputs[0].value = "Hello customer query";
    inputs[0].dispatchEvent(new CustomEvent("change"));

    const sendBtns = element.shadowRoot.querySelectorAll("lightning-button-icon");
    expect(sendBtns.length).toBeGreaterThanOrEqual(2);
    sendBtns[0].click();

    expect(spy).toHaveBeenCalled();
  });
});
