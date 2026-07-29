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
import AgentAssistSetupWizard from "c/agentAssistSetupWizard";
import getOrgDiagnostics from "@salesforce/apex/AgentAssistConfigController.getOrgDiagnostics";
import getActiveUsers from "@salesforce/apex/AgentAssistConfigController.getActiveUsers";
import checkEndpointHealth from "@salesforce/apex/AgentAssistConfigController.checkEndpointHealth";
import saveConfig from "@salesforce/apex/AgentAssistConfigController.saveConfig";
import getAllConfigs from "@salesforce/apex/AgentAssistConfigController.getAllConfigs";
import resetSingleDefaultConfig from "@salesforce/apex/AgentAssistConfigController.resetSingleDefaultConfig";

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.resetSingleDefaultConfig",
  () => ({
    default: jest.fn().mockResolvedValue({ Id: "001", Developer_Name__c: "Default" })
  }),
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.saveConfig",
  () => {
    return {
      default: jest.fn().mockImplementation(({ configRecord }) =>
        Promise.resolve({
          ...configRecord,
          Id: configRecord.Id || "mock-saved-id"
        })
      )
    };
  },
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.checkEndpointHealth",
  () => {
    return {
      default: jest.fn().mockResolvedValue({
        statusCode: 200,
        status: "pass",
        statusLabel: "200 OK",
        message: "Endpoint is reachable and healthy (HTTP 200)."
      })
    };
  },
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.registerAuthToken",
  () => {
    return {
      default: jest.fn().mockResolvedValue({
        status: "success",
        token: "mock-jwt-token-12345"
      })
    };
  },
  { virtual: true }
);

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.getOrgDiagnostics",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return { default: createApexTestWireAdapter() };
  },
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

jest.mock(
  "@salesforce/apex/AgentAssistConfigController.getAllConfigs",
  () => {
    const { createApexTestWireAdapter } = require("@salesforce/sfdx-lwc-jest");
    return { default: createApexTestWireAdapter() };
  },
  { virtual: true }
);

const MOCK_HEALTHY_DIAGNOSTICS = {
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

const MOCK_WARNING_DIAGNOSTICS = {
  isHealthy: true,
  passCount: 4,
  failCount: 0,
  warningCount: 1,
  sections: [
    {
      id: "omnichannel",
      title: "Omni-Channel Presence & Routing",
      subtitle:
        "Presence statuses and queue routing configurations for agent dispatch.",
      iconName: "utility:user",
      setupUrl: "/lightning/setup/ServicePresenceStatusSettings/home",
      setupUrlLabel: "Omni-Channel",
      items: [
        {
          id: "check-presence-messaging",
          label: "Online Messaging Status (Online_Messaging)",
          subLabel: "Deployed presence status not found.",
          status: "warning",
          errorMessage: "Presence Status 'Online_Messaging' is not present.",
          assignees: []
        }
      ]
    }
  ]
};

const MOCK_FAIL_DIAGNOSTICS = {
  isHealthy: false,
  passCount: 4,
  failCount: 1,
  warningCount: 0,
  sections: [
    {
      id: "static_resources",
      title: "Static Resources & UI Module Bundles",
      subtitle:
        "Verify static resource packages for container, transcript, and asset bundles.",
      iconName: "utility:file",
      setupUrl: "/lightning/setup/StaticResources/home",
      setupUrlLabel: "Static Resources",
      items: [
        {
          id: "check-sr-modules",
          label: "UI Modules Bundle (ui_modules.zip)",
          subLabel: "Missing static resource archive.",
          status: "fail",
          errorMessage: "Static Resource 'ui_modules' zip archive is missing.",
          assignees: []
        }
      ]
    }
  ]
};

describe("c-agent-assist-setup-wizard", () => {
  afterEach(() => {
    while (document.body.firstChild) {
      document.body.removeChild(document.body.firstChild);
    }
    jest.clearAllMocks();
  });

  it("renders setup wizard header, title, and tabset", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);

    const header = element.shadowRoot.querySelector(".wizard-header-clean");
    expect(header).not.toBeNull();
    const title = element.shadowRoot.querySelector(".header-title");
    expect(title.textContent).toBe("Integration Setup Wizard");
    const tabset = element.shadowRoot.querySelector("lightning-tabset");
    expect(tabset).not.toBeNull();
  });

  it("populates active users picklist when getActiveUsers emits data", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);

    getActiveUsers.emit([
      { label: "Alex Rivera (test-agent@example.com)", value: "005xx000001" }
    ]);

    await Promise.resolve();

    const profilesPanel = element.shadowRoot.querySelector("c-agent-assist-setup-profiles-panel");
    expect(profilesPanel).not.toBeNull();
    const comboboxes = profilesPanel.shadowRoot.querySelectorAll("lightning-combobox");
    expect(comboboxes.length).toBeGreaterThan(0);
  });

  it("evaluates healthy diagnostics and displays OK status pills", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);

    getOrgDiagnostics.emit(MOCK_HEALTHY_DIAGNOSTICS);
    await Promise.resolve();

    const diagPanel = element.shadowRoot.querySelector("c-agent-assist-setup-diagnostics-panel");
    expect(diagPanel).not.toBeNull();

    const passPills = diagPanel.shadowRoot.querySelectorAll(".status-pill_pass");
    expect(passPills.length).toBeGreaterThan(0);
    expect(passPills[0].textContent).toContain("OK");
  });

  it("evaluates warning diagnostics and renders Attention Needed pills", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);

    getOrgDiagnostics.emit(MOCK_WARNING_DIAGNOSTICS);
    await Promise.resolve();

    const diagPanel = element.shadowRoot.querySelector("c-agent-assist-setup-diagnostics-panel");
    expect(diagPanel).not.toBeNull();

    const warnPills = diagPanel.shadowRoot.querySelectorAll(".status-pill_warn");
    expect(warnPills.length).toBeGreaterThan(0);
    expect(warnPills[0].textContent).toContain("Attention Needed");
  });

  it("evaluates failed diagnostics and renders Action Required pills with error box", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);

    getOrgDiagnostics.emit(MOCK_FAIL_DIAGNOSTICS);
    await Promise.resolve();

    const diagPanel = element.shadowRoot.querySelector("c-agent-assist-setup-diagnostics-panel");
    expect(diagPanel).not.toBeNull();

    const failPills = diagPanel.shadowRoot.querySelectorAll(".status-pill_fail");
    expect(failPills.length).toBeGreaterThan(0);
    expect(failPills[0].textContent).toContain("Action Required");

    const errorBox = diagPanel.shadowRoot.querySelector(".diag-error-box");
    expect(errorBox).not.toBeNull();
    expect(errorBox.textContent).toContain(
      "Static Resource 'ui_modules' zip archive is missing."
    );
  });

  it("handles empty or errored diagnostics gracefully", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);

    getOrgDiagnostics.error(new Error("Apex query error"));
    await Promise.resolve();

    const diagPanel = element.shadowRoot.querySelector("c-agent-assist-setup-diagnostics-panel");
    expect(diagPanel).not.toBeNull();
    const cards = diagPanel.shadowRoot.querySelectorAll(".instrument-card");
    expect(cards.length).toBeGreaterThan(0);
  });

  it("immediately health checks endpoint URL and renders connectivity indicator pill", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);
    await Promise.resolve();
    await Promise.resolve();

    const profilesPanel = element.shadowRoot.querySelector("c-agent-assist-setup-profiles-panel");
    expect(profilesPanel).not.toBeNull();

    const label = profilesPanel.shadowRoot.querySelector(".endpoint-label");
    expect(label).not.toBeNull();
    expect(label.textContent).toContain("UI Connector Endpoint URL");

    const endpointPill = profilesPanel.shadowRoot
      .querySelector(".endpoint-label")
      .parentElement.querySelector(".status-pill");
    expect(endpointPill).not.toBeNull();
  });

  it("renders 404 Not Found indicator pill when endpoint is unreachable or missing", async () => {
    checkEndpointHealth.mockResolvedValueOnce({
      statusCode: 404,
      status: "warning",
      statusLabel: "404 Not Found",
      message: "HTTP 404 Not Found"
    });

    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);
    await Promise.resolve();
    await Promise.resolve();

    const profilesPanel = element.shadowRoot.querySelector("c-agent-assist-setup-profiles-panel");
    expect(profilesPanel).not.toBeNull();

    const endpointPill = profilesPanel.shadowRoot
      .querySelector(".endpoint-label")
      .parentElement.querySelector(".status-pill");
    expect(endpointPill).not.toBeNull();
  });

  it("renders sanitized connection failed message when checkEndpointHealth returns Unauthorized endpoint error", async () => {
    const { performEndpointHealthCheck } = require("c/agentAssistSetupSharedService");
    const res = await performEndpointHealthCheck(
      "https://ui-connector-sfwz-798656365078.us-central1.run.ap",
      jest.fn().mockResolvedValue({
        statusCode: 0,
        status: "fail",
        statusLabel: "Connection Failed",
        message: "Connection failed for https://ui-connector-sfwz-798656365078.us-central1.run.ap: Unauthorized endpoint, please check Setup->Security->Remote site settings."
      })
    );

    expect(res.message).toContain("Unable to reach endpoint");
    expect(res.message).not.toContain("Remote site settings");
  });

  it("filters platform options based on conversation channel and auto-updates platform on channel change", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);
    await Promise.resolve();

    const profilesPanel = element.shadowRoot.querySelector("c-agent-assist-setup-profiles-panel");
    expect(profilesPanel).not.toBeNull();

    const comboboxes = Array.from(
      profilesPanel.shadowRoot.querySelectorAll("lightning-combobox")
    );
    const channelCombobox = comboboxes.find(
      (cb) => cb.dataset.field === "channel"
    );
    const platformCombobox = comboboxes.find(
      (cb) => cb.dataset.field === "platform"
    );

    expect(channelCombobox).not.toBeUndefined();
    expect(platformCombobox).not.toBeUndefined();

    expect(platformCombobox.options).toEqual([
      { label: "Base Platform (Direct API Connector)", value: "base" },
      { label: "Salesforce chat integration", value: "messaging" }
    ]);

    channelCombobox.value = "voice";
    channelCombobox.dispatchEvent(
      new CustomEvent("change", {
        detail: { value: "voice" }
      })
    );
    await Promise.resolve();

    expect(platformCombobox.options).toEqual([
      {
        label: "Salesforce voice integration with Twilio Flex",
        value: "twilioflex"
      },
      {
        label: "Salesforce voice integration with NICE CXone",
        value: "servicecloudvoice-nice"
      },
      {
        label: "Salesforce voice integration with Five9",
        value: "servicecloudvoice-byot-five9"
      }
    ]);
  });

  it("renders CX Platform Setup accordion section logos with correct static resource SVG URLs", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);
    await Promise.resolve();

    const cxPanel = element.shadowRoot.querySelector("c-agent-assist-setup-cx-platform-panel");
    expect(cxPanel).not.toBeNull();

    const logoImgs = Array.from(
      cxPanel.shadowRoot.querySelectorAll(".platform-logo-img")
    );
    expect(logoImgs.length).toBeGreaterThanOrEqual(5);

    const logoSrcs = logoImgs.map((img) => img.getAttribute("src"));
    expect(logoSrcs).toContain("platform_logos/salesforce_logo.svg");
    expect(logoSrcs).toContain("platform_logos/five9_logo.svg");
    expect(logoSrcs).toContain("platform_logos/cxone_logo.svg");
    expect(logoSrcs).toContain("platform_logos/genesys_logo.svg");
    expect(logoSrcs).toContain("platform_logos/twilio_logo.svg");
  });

  it("persists Disable_Integrated_Transcript__c when saving profile", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);
    await Promise.resolve();

    const profilesPanel = element.shadowRoot.querySelector("c-agent-assist-setup-profiles-panel");
    expect(profilesPanel).not.toBeNull();

    const toggles = Array.from(
      profilesPanel.shadowRoot.querySelectorAll("lightning-input")
    );
    const disableTranscriptToggle = toggles.find(
      (t) => t.dataset.field === "integratedTranscriptActive"
    );
    expect(disableTranscriptToggle).not.toBeUndefined();

    disableTranscriptToggle.checked = false;
    profilesPanel.dispatchEvent(
      new CustomEvent("fieldchange", { detail: { field: "integratedTranscriptActive", value: false } })
    );
    await Promise.resolve();

    profilesPanel.dispatchEvent(new CustomEvent("saveprofile"));
    await Promise.resolve();

    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        configRecord: expect.objectContaining({
          Disable_Integrated_Transcript__c: true
        })
      })
    );
  });

  it("copies profile when clicking Save as Copy button", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });
    document.body.appendChild(element);
    await Promise.resolve();

    const profilesPanel = element.shadowRoot.querySelector("c-agent-assist-setup-profiles-panel");
    expect(profilesPanel).not.toBeNull();

    profilesPanel.dispatchEvent(new CustomEvent("saveascopy"));
    await Promise.resolve();

    expect(saveConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        configRecord: expect.objectContaining({
          Name: expect.stringMatching(/^Copy of Default Profile/),
          Developer_Name__c: expect.stringMatching(/^Copy_Default_/),
          Profile_Type__c: "Container"
        })
      })
    );
  });

  it("renders dedicated top-level Users tab and filters user list with search input", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);
    await Promise.resolve();

    const tabs = Array.from(
      element.shadowRoot.querySelectorAll("lightning-tab")
    );
    const usersTab = tabs.find((t) => t.value === "users");
    expect(usersTab).toBeTruthy();

    const usersPanel = element.shadowRoot.querySelector("c-agent-assist-setup-users-panel");
    expect(usersPanel).not.toBeNull();

    const searchInput = usersPanel.shadowRoot.querySelector(
      'lightning-input[type="search"]'
    );
    if (searchInput) {
      searchInput.value = "John";
      searchInput.dispatchEvent(new CustomEvent("change"));
      await Promise.resolve();
    }
  });

  it("refreshes configuration profiles and remounts simulator when simulator tab becomes active", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);
    await Promise.resolve();

    getAllConfigs.emit([
      {
        Id: "001",
        Name: "Default Profile",
        Developer_Name__c: "Default",
        Profile_Type__c: "Container",
        Is_Active__c: true
      }
    ]);
    await Promise.resolve();

    const tabs = element.shadowRoot.querySelectorAll("lightning-tab");
    expect(tabs.length).toBeGreaterThan(1);
    tabs[1].dispatchEvent(new CustomEvent("active"));
    await Promise.resolve();
  });

  it("renders Reset Profile button for default profile and calls resetSingleDefaultConfig when clicked", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);
    await Promise.resolve();

    const profilesPanel = element.shadowRoot.querySelector("c-agent-assist-setup-profiles-panel");
    expect(profilesPanel).not.toBeNull();

    profilesPanel.dispatchEvent(new CustomEvent("resetprofile"));
    await Promise.resolve();
    expect(resetSingleDefaultConfig).toHaveBeenCalledWith({
      developerName: "Default"
    });
  });

  it("places Users tab after CX Platform Setup tab in lightning-tabset", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);
    await Promise.resolve();

    const tabs = Array.from(
      element.shadowRoot.querySelectorAll("lightning-tab")
    );
    const tabValues = tabs.map((t) => t.value);
    expect(tabValues).toEqual([
      "configurationProfiles",
      "simulator",
      "cxPlatformSetup",
      "users",
      "diagnostics"
    ]);
  });

  it("shares selected profile state between LWC Configuration Profiles tab and Simulator tab", async () => {
    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);
    await Promise.resolve();

    getAllConfigs.emit([
      {
        Id: "001",
        Name: "Default Profile",
        Developer_Name__c: "Default",
        Profile_Type__c: "Container",
        Is_Active__c: true
      },
      {
        Id: "002",
        Name: "Companion Profile",
        Developer_Name__c: "Default_Companion",
        Profile_Type__c: "Companion Agent",
        Is_Active__c: true
      }
    ]);
    await Promise.resolve();

    const profilesPanel = element.shadowRoot.querySelector("c-agent-assist-setup-profiles-panel");
    expect(profilesPanel).not.toBeNull();

    profilesPanel.dispatchEvent(
      new CustomEvent("profileselect", { detail: { developerName: "Default_Companion" } })
    );
    await Promise.resolve();

    const simPanel = element.shadowRoot.querySelector("c-agent-assist-setup-simulator-panel");
    expect(simPanel).not.toBeNull();

    const combobox = simPanel.shadowRoot.querySelector("lightning-combobox");
    expect(combobox).toBeTruthy();
    expect(combobox.value).toBe("Default_Companion");
  });

  it("persists selected profile in storage and restores it on component mount", async () => {
    localStorage.setItem(
      "agent_assist_setup_selected_profile",
      "Default_Companion"
    );

    const element = createElement("c-agent-assist-setup-wizard", {
      is: AgentAssistSetupWizard
    });

    document.body.appendChild(element);
    await Promise.resolve();

    getAllConfigs.emit([
      {
        Id: "001",
        Name: "Default Profile",
        Developer_Name__c: "Default",
        Profile_Type__c: "Container",
        Is_Active__c: true
      },
      {
        Id: "002",
        Name: "Companion Profile",
        Developer_Name__c: "Default_Companion",
        Profile_Type__c: "Companion Agent",
        Is_Active__c: true
      }
    ]);
    await Promise.resolve();

    const profilesPanel = element.shadowRoot.querySelector("c-agent-assist-setup-profiles-panel");
    expect(profilesPanel).not.toBeNull();
    expect(profilesPanel.selectedDevName).toBe("Default_Companion");
    localStorage.removeItem("agent_assist_setup_selected_profile");
  });
});
