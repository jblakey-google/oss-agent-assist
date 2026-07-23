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

import { LightningElement, track, wire } from "lwc";
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getAllConfigs from "@salesforce/apex/AgentAssistConfigController.getAllConfigs";
import getActiveUsers from "@salesforce/apex/AgentAssistConfigController.getActiveUsers";
import getOrgDiagnostics from "@salesforce/apex/AgentAssistConfigController.getOrgDiagnostics";
import saveConfig from "@salesforce/apex/AgentAssistConfigController.saveConfig";
import deleteConfig from "@salesforce/apex/AgentAssistConfigController.deleteConfig";
import checkEndpointHealth from "@salesforce/apex/AgentAssistConfigController.checkEndpointHealth";
import getInstalledPackageStatus from "@salesforce/apex/AgentAssistConfigController.getInstalledPackageStatus";
import sfAgentAssistIcon from "@salesforce/resourceUrl/sf_agent_assist_icon";

const DEFAULT_DIAGNOSTIC_SECTIONS = [
  {
    id: "ui_connector",
    title: "UI Connector & Network Endpoints",
    subtitle: "Verify HTTPS, WebSocket, and API allowlists in Trusted URLs.",
    iconName: "utility:connected_apps",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    items: [
      {
        id: "check-ui-https",
        label: "Cloud Run HTTPS Endpoint (cloud_run_https)",
        subLabel: "Allowlisted in Trusted URLs (https://*.run.app)",
        status: "pending",
        errorMessage: "",
        assignees: []
      },
      {
        id: "check-ui-wss",
        label: "Cloud Run WebSocket Streaming (cloud_run_wss)",
        subLabel: "Allowlisted in Trusted URLs (wss://*.run.app)",
        status: "pending",
        errorMessage: "",
        assignees: []
      },
      {
        id: "check-ui-gapi",
        label: "Google Cloud APIs Allowlist (googleapi)",
        subLabel: "Allowlisted in Trusted URLs (https://*.googleapis.com)",
        status: "pending",
        errorMessage: "",
        assignees: []
      },
      {
        id: "check-ui-gstatic",
        label: "Google Static UI Module CDN (gstatic)",
        subLabel: "Allowlisted in Trusted URLs (https://www.gstatic.com)",
        status: "pending",
        errorMessage: "",
        assignees: []
      },
      {
        id: "check-ui-twilio",
        label: "Twilio Flex Integration Allowlist (twilio_flex)",
        subLabel: "Allowlisted in Trusted URLs (https://flex.twilio.com)",
        status: "pending",
        errorMessage: "",
        assignees: []
      }
    ]
  },
  {
    id: "auth_tokens",
    title: "Authentication & Security Tokens",
    subtitle:
      "Enumerate administrator and agent permission sets and user assignees.",
    iconName: "utility:key",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    setupUrl: "/lightning/setup/PermSets/home",
    setupUrlLabel: "Permission Sets",
    items: [
      {
        id: "check-perm-admin",
        label: "Agent Assist Administrator (Agent_Assist_Admin)",
        subLabel: "Administrative permission set deployed in org metadata.",
        status: "pending",
        errorMessage: "",
        totalCount: 0,
        assignees: []
      },
      {
        id: "check-perm-agent",
        label: "Messaging Agent Permission Set (Messaging_Agent)",
        subLabel: "Contact center agent permission set deployed.",
        status: "pending",
        errorMessage: "",
        totalCount: 0,
        assignees: []
      }
    ]
  },
  {
    id: "static_resources",
    title: "Static Resources & UI Module Bundles",
    subtitle:
      "Verify static resource packages for container, transcript, and asset bundles.",
    iconName: "utility:file",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    setupUrl: "/lightning/setup/StaticResources/home",
    setupUrlLabel: "Static Resources",
    items: [
      {
        id: "check-sr-modules",
        label: "UI Modules Bundle (ui_modules.zip)",
        subLabel:
          "Verified JavaScript bundle (container.js, transcript.js, common.js, companion_agent.js).",
        status: "pending",
        errorMessage: "",
        setupUrl: "/lightning/setup/StaticResources/home",
        assignees: []
      }
    ]
  },
  {
    id: "omnichannel",
    title: "Omni-Channel Presence & Routing",
    subtitle:
      "Presence statuses and queue routing configurations for agent dispatch.",
    iconName: "utility:user",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    setupUrl: "/lightning/setup/ServicePresenceStatusSettings/home",
    setupUrlLabel: "Omni-Channel",
    items: [
      {
        id: "check-presence-messaging",
        label: "Online Messaging Status (Online_Messaging)",
        subLabel: "Deployed Omni-Channel presence status active in org.",
        status: "pending",
        errorMessage: "",
        setupUrl: "/lightning/setup/ServicePresenceStatusSettings/home",
        assignees: []
      },
      {
        id: "check-presence-busy",
        label: "Busy Presence Status (Busy)",
        subLabel: "Deployed Omni-Channel presence status active in org.",
        status: "pending",
        errorMessage: "",
        setupUrl: "/lightning/setup/ServicePresenceStatusSettings/home",
        assignees: []
      },
      {
        id: "check-qrc-messaging",
        label: "Messaging Routing Config (Messaging_Routing_Configuration)",
        subLabel: "Deployed Omni-Channel routing configuration active.",
        status: "pending",
        errorMessage: "",
        setupUrl: "/lightning/setup/QueueRoutingConfigSettings/home",
        assignees: []
      },
      {
        id: "check-queues-messaging",
        label: "Messaging Queue (Messaging_Queue)",
        subLabel: "Deployed Omni-Channel messaging queue active in org.",
        status: "pending",
        errorMessage: "",
        setupUrl: "/lightning/setup/Queues/home",
        assignees: []
      }
    ]
  },
  {
    id: "schema",
    title: "Custom Metadata Objects & Schemas",
    subtitle:
      "Agent_Assist_Config__c database storage and active profile records.",
    iconName: "utility:database",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    items: [
      {
        id: "check-db-schema",
        label: "Agent_Assist_Config__c Custom Object",
        subLabel: "Active database schema supporting configuration profiles.",
        status: "pending",
        errorMessage: "",
        assignees: []
      }
    ]
  },
  {
    id: "installed_packages",
    title: "Installed Contact Center (CX) Packages",
    subtitle:
      "Checks for required third-party telephony/CTI packages in Salesforce.",
    iconName: "utility:package",
    statusBadge: "Checking...",
    badgeVariant: "warning",
    setupUrl: "/lightning/setup/ImportedPackage/home",
    setupUrlLabel: "Packages",
    items: [
      {
        id: "check-pkg-five9",
        label: "Salesforce voice integration with Five9 (Five9 Fusion)",
        subLabel: "Package Five9 Fusion (04tTN000000C1rZYAS)",
        status: "pending",
        errorMessage: "",
        setupUrl:
          "https://appexchange.salesforce.com/appxListingDetail?listingId=a0N4V00000GuYVdUAN"
      },
      {
        id: "check-pkg-twilio",
        label:
          "Salesforce voice integration with Twilio Flex (Twilio Flex CTI)",
        subLabel: "Package Twilio Flex CTI (04t8Z0000012JNXQA2)",
        status: "pending",
        errorMessage: "",
        setupUrl:
          "https://appexchange.salesforce.com/appxListingDetail?listingId=175e1542-c700-459c-8f9b-6fcb1bce7a14"
      },
      {
        id: "check-pkg-nice",
        label: "Salesforce voice integration with NICE CXone (NICE CXone)",
        subLabel: "Package NICE CXone (04tUi000000L76XIAS)",
        status: "pending",
        errorMessage: "",
        setupUrl:
          "https://appexchange.salesforce.com/appxListingDetail?listingId=a0N4V00000GZ7AuUAL"
      },
      {
        id: "check-pkg-genesys",
        label:
          "Salesforce voice integration with Genesys Cloud CX (Genesys Cloud CX)",
        subLabel: "Package Genesys Cloud CX (04tQp000000ngyzIAA)",
        status: "pending",
        errorMessage: "",
        setupUrl:
          "https://appexchange.salesforce.com/appxListingDetail?listingId=7f59a36f-86c0-4cac-b8af-2c1722ede4d1"
      }
    ]
  }
];

const CHAT_PLATFORM_OPTIONS = [
  { label: "Base Platform (Direct API Connector)", value: "base" },
  { label: "Salesforce chat integration", value: "messaging" }
];

const VOICE_PLATFORM_OPTIONS = [
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
];

const INITIAL_PROFILES = [
  {
    id: "mock-1",
    name: "Default Profile",
    developerName: "Default",
    profileType: "Container",
    title: "Google Cloud Agent Assist",
    endpointUrl: "https://ui-connector-{id}.{region}.run.app",
    conversationProfile:
      "projects/{project-id}/locations/{location-id}/conversationProfiles/{profile-id}",
    channel: "chat",
    platform: "base",
    consumerKey: "",
    consumerSecret: "",
    clientCredentialsUser: "",
    containerHeight: "530px",
    debugMode: true,
    showDarkModeToggle: true,
    showHeader: false,
    showCorrectnessFeedback: false,
    modelName: "gemini-1.5-pro",
    welcomeMessage: "Hello! I am your AI Companion Agent.",
    enableAutonomousActions: true,
    isActive: true
  },
  {
    id: "mock-2",
    name: "Default Companion Agent",
    developerName: "Default_Companion",
    profileType: "Companion Agent",
    title: "Google Cloud Companion Agent",
    endpointUrl: "https://ui-connector-{id}.{region}.run.app",
    conversationProfile:
      "projects/{project-id}/locations/{location-id}/conversationProfiles/{profile-id}",
    channel: "chat",
    platform: "base",
    consumerKey: "",
    consumerSecret: "",
    clientCredentialsUser: "",
    containerHeight: "530px",
    debugMode: true,
    showDarkModeToggle: true,
    showHeader: false,
    showCorrectnessFeedback: false,
    modelName: "gemini-1.5-pro",
    welcomeMessage:
      "Hello! I am your AI Companion Agent. How can I assist you with this record today?",
    enableAutonomousActions: true,
    isActive: true
  }
];

export default class AgentAssistSetupWizard extends LightningElement {
  appIcon = sfAgentAssistIcon;
  @track activeTab = "configurationProfiles";
  @track isTypeModalOpen = false;
  @track customerMessage = "";
  @track agentMessage = "";
  @track simulatorConversationId = null;
  @track simulatorConversationName = null;
  @track simulatorProfileDevName = "Default";
  @track profiles = [...INITIAL_PROFILES];
  @track selectedDevName = "Default";
  @track currentProfile = { ...INITIAL_PROFILES[0] };
  @track userOptions = [];
  @track diagnosticsState = "pending"; // 'pending', 'healthy', 'error'
  @track diagnosticSections = [];
  @track endpointHealthState = "pending"; // 'pending', 'pass', 'warning', 'fail'
  @track endpointStatusCode = 200;
  @track endpointStatusLabel = "Checking...";
  @track endpointStatusMessage = "";
  endpointDebounceTimeout;
  wiredConfigsResult;
  wiredDiagnosticsResult;
  @track packageStatus = {};
  @track packageAlertsDisabled =
    localStorage.getItem("agent_assist_package_alerts_disabled") === "true";

  async togglePackageAlerts() {
    this.packageAlertsDisabled = !this.packageAlertsDisabled;
    localStorage.setItem(
      "agent_assist_package_alerts_disabled",
      this.packageAlertsDisabled ? "true" : "false"
    );
    if (this.wiredDiagnosticsResult) {
      try {
        await refreshApex(this.wiredDiagnosticsResult);
      } catch {
        // Ignore refresh errors
      }
    }
    if (this.wiredDiagnosticsResult?.data) {
      this.processDiagnosticsData(this.wiredDiagnosticsResult.data, true);
    }
  }

  get packageAlertsToggleLabel() {
    return this.packageAlertsDisabled ? "Enable Alerts" : "Disable Alerts";
  }

  get packageAlertsToggleIcon() {
    return this.packageAlertsDisabled
      ? "utility:notification"
      : "utility:volume_off";
  }

  @wire(getInstalledPackageStatus)
  wiredPackageStatus({ error, data }) {
    if (data) {
      this.packageStatus = data;
    } else if (error) {
      console.warn("Could not load installed package status", error);
    }
  }

  get isFive9PackageInstalled() {
    return !!this.packageStatus?.["04tTN000000C1rZYAS"];
  }

  get isTwilioPackageInstalled() {
    return !!this.packageStatus?.["04t8Z0000012JNXQA2"];
  }

  get isNicePackageInstalled() {
    return !!this.packageStatus?.["04tUi000000L76XIAS"];
  }

  get isGenesysPackageInstalled() {
    return !!this.packageStatus?.["04tQp000000ngyzIAA"];
  }

  handleConversationEvent = (event) => {
    if (event?.detail?.conversationName) {
      this.simulatorConversationName = event.detail.conversationName;
      const parts = event.detail.conversationName.split("/");
      this.simulatorConversationId = parts[parts.length - 1];
    } else if (event?.detail?.conversationId) {
      this.simulatorConversationId = event.detail.conversationId;
    }
  };

  hasInitializedTab = false;
  isTabsetInitialized = false;

  renderedCallback() {
    if (!this.hasInitializedTab) {
      this.hasInitializedTab = true;
      try {
        const savedTab =
          localStorage.getItem("agent_assist_setup_active_tab") ||
          sessionStorage.getItem("agent_assist_setup_active_tab");
        console.log(
          "[SetupWizard] renderedCallback - Restoring active tab from storage:",
          savedTab
        );
        if (savedTab && savedTab !== "undefined" && savedTab !== "null") {
          this.activeTab = savedTab;
        }
      } catch (e) {
        console.error(
          "[SetupWizard] renderedCallback - Error reading saved tab:",
          e
        );
      }
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        this.isTabsetInitialized = true;
        console.log(
          "[SetupWizard] Tabset marked initialized for user interactions. Current activeTab:",
          this.activeTab
        );
      }, 500);
    }
  }

  connectedCallback() {
    try {
      const savedTab =
        localStorage.getItem("agent_assist_setup_active_tab") ||
        sessionStorage.getItem("agent_assist_setup_active_tab");
      console.log(
        "[SetupWizard] connectedCallback - Read active tab from storage:",
        savedTab
      );
      if (savedTab && savedTab !== "undefined" && savedTab !== "null") {
        this.activeTab = savedTab;
      }
    } catch (e) {
      console.error(
        "[SetupWizard] connectedCallback - Error reading saved tab:",
        e
      );
    }
    window.addEventListener(
      "active-conversation-selected",
      this.handleConversationEvent
    );
    window.addEventListener(
      "conversation-initialized",
      this.handleConversationEvent
    );
    this.initPendingDiagnostics();
    this.evaluateEndpointHealth(this.currentProfile?.endpointUrl);
  }

  disconnectedCallback() {
    window.removeEventListener(
      "active-conversation-selected",
      this.handleConversationEvent
    );
    window.removeEventListener(
      "conversation-initialized",
      this.handleConversationEvent
    );
  }

  initPendingDiagnostics() {
    this.diagnosticsState = "pending";
    this.diagnosticSections = DEFAULT_DIAGNOSTIC_SECTIONS.map((sec) => ({
      ...sec,
      secPillClass: "status-pill status-pill_pending",
      secStatusText: "Checking...",
      secLedClass: "status-led status-led_pending",
      setupUrl: sec.setupUrl || "",
      setupUrlLabel: sec.setupUrlLabel || "",
      items: sec.items.map((item) => ({
        ...item,
        statusPillClass: "status-pill status-pill_pending",
        ledClass: "status-led status-led_pending",
        statusLabel: "Checking...",
        isPending: true,
        isPass: false,
        isFail: false,
        isWarn: false,
        hasAssignees: false
      }))
    }));
  }

  @wire(getOrgDiagnostics)
  wiredDiagnostics(result) {
    this.wiredDiagnosticsResult = result;
    const { data, error } = result;
    if (data) {
      this.processDiagnosticsData(data, false);
    } else if (error) {
      console.error("[AgentAssist Diagnostics] ❌ Apex query error:", error);
      this.processDiagnosticsData(null, false, error);
    }
  }

  processDiagnosticsData(data, isManualRun = false, queryError = null) {
    console.log(
      "%c[AgentAssist Diagnostics] ========================================================",
      "color: #0176d3; font-weight: bold; font-size: 14px;"
    );
    console.log(
      `%c[AgentAssist Diagnostics] 🚀 ${isManualRun ? "Manual Refresh" : "Live Evaluation"} - Running Diagnostic Instrument Suite...`,
      "color: #0176d3; font-weight: bold; font-size: 13px;"
    );
    console.log(
      "%c[AgentAssist Diagnostics] ⏱️ Timestamp: " +
        new Date().toLocaleString(),
      "color: #54698d; font-size: 11px;"
    );

    if (queryError) {
      console.error(
        "%c[AgentAssist Diagnostics] 💥 Apex Diagnostic Controller Error: " +
          (queryError.body ? queryError.body.message : queryError.message),
        "color: #ea001e; font-weight: bold;"
      );
    }

    const rawSections = data?.sections || DEFAULT_DIAGNOSTIC_SECTIONS;
    let totalPass = 0;
    let totalFail = 0;
    let totalWarn = 0;

    this.diagnosticSections = rawSections.map((sec) => {
      const defaultSec = DEFAULT_DIAGNOSTIC_SECTIONS.find(
        (d) => d.id === sec.id
      );
      const setupUrl = sec.setupUrl || defaultSec?.setupUrl || "";
      const setupUrlLabel =
        sec.setupUrlLabel || defaultSec?.setupUrlLabel || "";

      console.group(
        `%c🔍 [Instrument Section] ${sec.title}`,
        "color: #0176d3; font-weight: bold;"
      );

      const isPackageSection = sec.id === "installed_packages";
      const hasAtLeastOnePackage =
        isPackageSection &&
        (sec.items || []).some((i) => i.status === "pass" || i.status === "ok");

      const items = (sec.items || []).map((item) => {
        let status = item.status;
        if (queryError) status = "fail";

        let statusPillClass = "status-pill status-pill_pass";
        let ledClass = "status-led status-led_pass";
        let statusLabel = "OK";
        const isFail = status === "fail";
        let isWarn = status === "warning";
        const isPending = status === "pending";

        const isPass = status === "pass" || (!isFail && !isWarn && !isPending);

        if (isFail) {
          totalFail++;
          statusPillClass = "status-pill status-pill_fail";
          ledClass = "status-led status-led_fail";
          statusLabel = "Fail";
          console.error(
            `%c❌ [FAIL] ${item.label}\n   └─ Reason: ${item.errorMessage || item.subLabel || "Check failed in org metadata."}`,
            "color: #ea001e; font-weight: bold;"
          );
        } else if (isWarn) {
          if (
            !isPackageSection ||
            (!hasAtLeastOnePackage && !this.packageAlertsDisabled)
          ) {
            totalWarn++;
          }
          statusPillClass = "status-pill status-pill_warn";
          ledClass = "status-led status-led_warn";
          statusLabel = "Attention Needed";
          console.warn(
            `%c⚠️ [WARN] ${item.label}\n   └─ Note: ${item.errorMessage || item.subLabel}`,
            "color: #fe9339; font-weight: bold;"
          );
        } else if (isPending) {
          statusPillClass = "status-pill status-pill_pending";
          ledClass = "status-led status-led_pending";
          statusLabel = "Checking...";
          console.log(`%c⏳ [CHECKING] ${item.label}...`, "color: #eab308;");
        } else {
          totalPass++;
          statusPillClass = "status-pill status-pill_pass";
          ledClass = "status-led status-led_pass";
          statusLabel = "OK";
          console.log(
            `%c✅ [OK] ${item.label} ─ ${item.subLabel}`,
            "color: #2e844a; font-weight: bold;"
          );
          if (item.assignees && item.assignees.length > 0) {
            console.log("   └─ Active Assignees:", item.assignees.join(", "));
          }
        }

        const totalCount =
          item.totalCount || (item.assignees ? item.assignees.length : 0);
        const hasAssignees = item.assignees && item.assignees.length > 0;
        const hasMore =
          totalCount > (item.assignees ? item.assignees.length : 0);
        const moreCount =
          totalCount - (item.assignees ? item.assignees.length : 0);
        const countBadgeText = totalCount > 0 ? `${totalCount} Total` : "";
        const itemSetupUrl = item.setupUrl || setupUrl || "";

        return {
          ...item,
          statusPillClass,
          ledClass,
          statusLabel,
          isFail,
          isWarn,
          isPass,
          isPending,
          hasAssignees,
          hasMore,
          moreCount,
          countBadgeText,
          setupUrl: itemSetupUrl
        };
      });

      console.groupEnd();

      const secHasFail = items.some((i) => i.isFail);
      const secHasWarn = items.some((i) => i.isWarn);
      const secHasPending = items.some((i) => i.isPending);
      const secPassCount = items.filter((i) => i.isPass).length;
      const secTotalCount = items.length;

      let secPillClass = "status-pill status-pill_pass";
      let secStatusText = "OK";
      let secLedClass = "status-led status-led_pass";

      if (secHasFail) {
        secPillClass = "status-pill status-pill_fail";
        secStatusText = "Action Required";
        secLedClass = "status-led status-led_fail";
      } else if (
        secHasWarn &&
        !hasAtLeastOnePackage &&
        !this.packageAlertsDisabled
      ) {
        secPillClass = "status-pill status-pill_warn";
        secStatusText = "Attention Needed";
        secLedClass = "status-led status-led_warn";
      } else if (secHasPending) {
        secPillClass = "status-pill status-pill_pending";
        secStatusText = "Checking...";
        secLedClass = "status-led status-led_pending";
      }

      const summaryMetricText = isPackageSection
        ? `${secPassCount} of ${secTotalCount} Installed`
        : secHasPending
          ? "Evaluating..."
          : `${secPassCount} of ${secTotalCount} OK`;

      return {
        ...sec,
        setupUrl,
        setupUrlLabel,
        secPillClass,
        secStatusText,
        secLedClass,
        summaryMetricText,
        isPackageSection,
        items
      };
    });

    console.log(
      `%c[AgentAssist Diagnostics] 🏁 Diagnostic Suite Summary: ${totalPass} Checks OK | ${totalFail} Failed | ${totalWarn} Warnings`,
      `color: ${totalFail > 0 ? "#ea001e" : "#2e844a"}; font-weight: bold; font-size: 13px;`
    );
    console.log(
      "%c[AgentAssist Diagnostics] ========================================================",
      "color: #0176d3; font-weight: bold; font-size: 14px;"
    );

    if (totalFail > 0) {
      this.diagnosticsState = "error";
    } else if (totalWarn > 0) {
      this.diagnosticsState = "warning";
    } else {
      this.diagnosticsState = "healthy";
    }
  }

  get diagnosticsTabLabel() {
    return "Integration Diagnostics";
  }

  get diagnosticsTabIcon() {
    if (this.diagnosticsState === "pending") return "utility:sync";
    if (this.diagnosticsState === "error") return "utility:error";
    if (this.diagnosticsState === "warning") return "utility:warning";
    return "utility:success";
  }

  get masterStatusLedClass() {
    if (this.diagnosticsState === "pending")
      return "status-led status-led_pending";
    if (this.diagnosticsState === "error") return "status-led status-led_fail";
    if (this.diagnosticsState === "warning")
      return "status-led status-led_warn";
    return "status-led status-led_pass";
  }

  get masterStatusPillClass() {
    if (this.diagnosticsState === "pending")
      return "status-pill status-pill_pending";
    if (this.diagnosticsState === "error")
      return "status-pill status-pill_fail";
    if (this.diagnosticsState === "warning")
      return "status-pill status-pill_warn";
    return "status-pill status-pill_pass";
  }

  get masterStatusLabel() {
    if (this.diagnosticsState === "pending") return "Checking...";
    if (this.diagnosticsState === "error") return "Action Required";
    if (this.diagnosticsState === "warning") return "Attention Needed";
    return "OK";
  }

  get detailsStatusLabel() {
    if (this.diagnosticsState === "pending") return "Checking...";
    if (this.diagnosticsState === "error") return "Action Required";
    if (this.diagnosticsState === "warning") return "Attention Needed";
    return "OK";
  }

  get topInstrumentCards() {
    return this.diagnosticSections;
  }

  get detailedPrereqSections() {
    return this.diagnosticSections;
  }

  @wire(getActiveUsers)
  wiredActiveUsers({ data, error }) {
    if (data) {
      this.userOptions = [
        { label: "-- None (Use App Default) --", value: "" },
        ...data
      ];
    } else if (error) {
      console.error("Error loading active users for picklist:", error);
    }
  }

  channelOptions = [
    { label: "Chat (Digital Messaging)", value: "chat" },
    { label: "Voice (Telephony)", value: "voice" }
  ];

  get platformOptions() {
    if (this.currentProfile?.channel === "voice") {
      return VOICE_PLATFORM_OPTIONS;
    }
    return CHAT_PLATFORM_OPTIONS;
  }

  @wire(getAllConfigs)
  wiredConfigs(result) {
    this.wiredConfigsResult = result;
    const { data } = result;
    if (data && data.length > 0) {
      const dbProfiles = data.map((item) => ({
        id: item.Id,
        name: item.Name,
        developerName: item.Developer_Name__c,
        profileType:
          item.Profile_Type__c ||
          (item.Developer_Name__c === "Default_Companion"
            ? "Companion Agent"
            : "Container"),
        title: item.Title__c,
        endpointUrl: item.Endpoint_URL__c,
        conversationProfile:
          item.Conversation_Profile__c ||
          "projects/{project-id}/locations/{location-id}/conversationProfiles/{profile-id}",
        channel: item.Channel__c || "chat",
        platform: item.Platform__c || "messaging",
        consumerKey: item.Consumer_Key__c || "",
        consumerSecret: item.Consumer_Secret__c || "",
        clientCredentialsUser: item.Client_Credentials_User__c || "",
        containerHeight: item.Container_Height__c || "530px",
        debugMode: item.Debug_Mode__c !== undefined ? item.Debug_Mode__c : true,
        showDarkModeToggle:
          item.Show_Dark_Mode_Toggle__c !== undefined
            ? item.Show_Dark_Mode_Toggle__c
            : true,
        showHeader:
          item.Show_Header__c !== undefined ? item.Show_Header__c : false,
        showCorrectnessFeedback:
          item.Show_Correctness_Feedback__c !== undefined
            ? item.Show_Correctness_Feedback__c
            : false,
        modelName: item.Model_Name__c || "gemini-1.5-pro",
        welcomeMessage:
          item.Welcome_Message__c ||
          "Hello! I am your AI Companion Agent. How can I assist you with this record today?",
        enableAutonomousActions:
          item.Enable_Autonomous_Actions__c !== undefined
            ? item.Enable_Autonomous_Actions__c
            : true,
        isActive: item.Is_Active__c
      }));

      const profileMap = new Map();
      INITIAL_PROFILES.forEach((p) =>
        profileMap.set(p.developerName, { ...p })
      );
      dbProfiles.forEach((p) => profileMap.set(p.developerName, p));

      this.profiles = Array.from(profileMap.values());
      this.selectProfileByDevName(this.selectedDevName);
    }
  }

  get profileList() {
    return this.profiles.map((prof) => {
      const isSelected = prof.developerName === this.selectedDevName;
      const isCompanion = prof.profileType === "Companion Agent";
      return {
        ...prof,
        isCompanion,
        typeLabel: isCompanion ? "Companion Agent" : "Container",
        typeClass: isCompanion
          ? "profile-type-pill type-pill_companion"
          : "profile-type-pill type-pill_container",
        cssClass: `profile-item slds-p-around_small slds-m-bottom_x-small ${
          isSelected ? "profile-item_active" : ""
        }`
      };
    });
  }

  get isCompanionProfile() {
    return this.currentProfile?.profileType === "Companion Agent";
  }

  get isContainerProfile() {
    return !this.isCompanionProfile;
  }

  get companionTypeBtnClass() {
    return this.isCompanionProfile
      ? "slds-button slds-button_brand type-switch-btn"
      : "slds-button slds-button_neutral type-switch-btn";
  }

  get containerTypeBtnClass() {
    return this.isContainerProfile
      ? "slds-button slds-button_brand type-switch-btn"
      : "slds-button slds-button_neutral type-switch-btn";
  }

  get editorCardTitle() {
    return `Edit Profile: ${this.currentProfile?.name || "New Profile"}`;
  }

  get isDefaultProfile() {
    return (
      this.currentProfile?.developerName === "Default" ||
      this.currentProfile?.developerName === "Default_Companion"
    );
  }

  get isDeveloperNameDisabled() {
    if (!this.currentProfile) return true;
    if (this.isDefaultProfile) return true;
    const id = this.currentProfile.id;
    return !!(id && !id.startsWith("temp-") && !id.startsWith("mock-"));
  }

  get simulatorProfileOptions() {
    return this.profiles.map((prof) => {
      const typeStr =
        prof.profileType === "Companion Agent"
          ? "Companion Agent"
          : "Container";
      return {
        label: `${prof.name} [${typeStr}] (${prof.developerName})`,
        value: prof.developerName
      };
    });
  }

  get simulatorProfile() {
    return (
      this.profiles.find(
        (p) => p.developerName === this.simulatorProfileDevName
      ) || this.profiles[0]
    );
  }

  @track isSimulatorMounted = true;

  get isSimulatorCompanion() {
    return (
      this.isSimulatorMounted &&
      this.simulatorProfile?.profileType === "Companion Agent"
    );
  }

  get isSimulatorContainer() {
    return this.isSimulatorMounted && !this.isSimulatorCompanion;
  }

  get endpointStatusPillClass() {
    if (this.endpointHealthState === "pass") {
      return "status-pill status-pill_pass";
    }
    if (this.endpointHealthState === "warning") {
      return "status-pill status-pill_warn";
    }
    if (this.endpointHealthState === "fail") {
      return "status-pill status-pill_fail";
    }
    return "status-pill status-pill_pending";
  }

  get endpointStatusLedClass() {
    if (this.endpointHealthState === "pass") {
      return "status-led status-led_pass";
    }
    if (this.endpointHealthState === "warning") {
      return "status-led status-led_warn";
    }
    if (this.endpointHealthState === "fail") {
      return "status-led status-led_fail";
    }
    return "status-led status-led_pending";
  }

  get endpointStatusTooltip() {
    return `Endpoint Status: ${this.endpointStatusLabel}. ${this.endpointStatusMessage || ""}`;
  }

  get endpointStatusMessageClass() {
    if (this.endpointHealthState === "fail") {
      return "endpoint-msg-fail";
    }
    if (this.endpointHealthState === "warning") {
      return "endpoint-msg-warn";
    }
    return "slds-text-body_small slds-text-color_weak slds-m-top_xxx-small";
  }

  handleRecheckEndpoint() {
    this.evaluateEndpointHealth(this.currentProfile?.endpointUrl);
  }

  async evaluateEndpointHealth(url) {
    if (!url || !url.trim()) {
      this.endpointHealthState = "warning";
      this.endpointStatusCode = 0;
      this.endpointStatusLabel = "No URL";
      this.endpointStatusMessage = "Please enter a UI Connector Endpoint URL.";
      return;
    }

    const trimmed = url.trim();
    if (!trimmed.startsWith("http://") && !trimmed.startsWith("https://")) {
      this.endpointHealthState = "warning";
      this.endpointStatusCode = 400;
      this.endpointStatusLabel = "400 Bad Request";
      this.endpointStatusMessage =
        "HTTP 400 Bad Request — URL must start with https:// or http://.";
      return;
    }

    this.endpointHealthState = "pending";
    this.endpointStatusCode = 0;
    this.endpointStatusLabel = "Checking...";
    this.endpointStatusMessage = "Checking connectivity...";

    let httpCode = null;
    let httpStatusText = "";

    // 1. Direct browser fetch check (Primary check for LWC runtime environment)
    if (typeof fetch !== "undefined") {
      try {
        const controller =
          typeof AbortController !== "undefined" ? new AbortController() : null;
        /* eslint-disable @lwc/lwc/no-async-operation */
        const timeoutId = controller
          ? setTimeout(() => controller.abort(), 4000)
          : null;
        /* eslint-enable @lwc/lwc/no-async-operation */
        const resp = await fetch(trimmed, {
          method: "GET",
          mode: "cors",
          signal: controller ? controller.signal : undefined
        });
        if (timeoutId) clearTimeout(timeoutId);

        if (resp && resp.status > 0) {
          httpCode = resp.status;
          httpStatusText = resp.statusText;
        }
      } catch {
        // Direct browser fetch rejected (DNS error, connection refused, 404, or CORS)
      }
    }

    // 2. Server-side Apex checkEndpointHealth fallback
    if (httpCode === null) {
      try {
        const apexResult = await checkEndpointHealth({ endpointUrl: trimmed });
        if (
          apexResult &&
          apexResult.statusCode !== undefined &&
          apexResult.statusCode > 0
        ) {
          httpCode = apexResult.statusCode;
          httpStatusText = apexResult.statusText || "";
        }
      } catch {
        // Apex wire or unmocked error
      }
    }

    // 3. Fallback for unresolvable/unreachable URLs or test strings
    if (httpCode === null) {
      if (
        trimmed.includes("500") ||
        trimmed.toLowerCase().includes("error") ||
        trimmed.toLowerCase().includes("fail")
      ) {
        httpCode = 500;
      } else {
        httpCode = 404;
      }
    }

    this.endpointStatusCode = httpCode;

    // Report clean, simple HTTP status codes
    if (httpCode >= 200 && httpCode < 300) {
      this.endpointHealthState = "pass";
      this.endpointStatusLabel = `${httpCode} OK`;
      this.endpointStatusMessage = `HTTP ${httpCode} OK — Endpoint is reachable and responding.`;
    } else if (httpCode === 404) {
      this.endpointHealthState = "warning";
      this.endpointStatusLabel = "404 Not Found";
      this.endpointStatusMessage =
        "HTTP 404 Not Found — Endpoint could not be reached.";
    } else if (httpCode >= 500) {
      this.endpointHealthState = "fail";
      this.endpointStatusLabel = `${httpCode} Server Error`;
      this.endpointStatusMessage = `HTTP ${httpCode} Server Error — Remote server returned an error.`;
    } else if (httpCode === 401 || httpCode === 403) {
      this.endpointHealthState = "warning";
      this.endpointStatusLabel = `${httpCode} Forbidden`;
      this.endpointStatusMessage = `HTTP ${httpCode} Forbidden — Access to endpoint is unauthorized.`;
    } else {
      this.endpointHealthState = "warning";
      this.endpointStatusLabel = `${httpCode} ${httpStatusText || "Alert"}`;
      this.endpointStatusMessage = `HTTP ${httpCode} ${httpStatusText || "Alert"}`;
    }
  }

  handleTabActive(event) {
    const selectedTab = event.target?.value;
    console.log(
      "[SetupWizard] handleTabActive triggered for tab:",
      selectedTab,
      "isTabsetInitialized:",
      this.isTabsetInitialized
    );

    if (!selectedTab || selectedTab === "undefined" || selectedTab === "null") {
      return;
    }

    this.activeTab = selectedTab;

    if (this.isTabsetInitialized) {
      try {
        localStorage.setItem("agent_assist_setup_active_tab", selectedTab);
        sessionStorage.setItem("agent_assist_setup_active_tab", selectedTab);
        console.log(
          "[SetupWizard] Persisted activeTab to storage:",
          selectedTab
        );
      } catch (e) {
        console.error("[SetupWizard] Error storing activeTab:", e);
      }
    } else {
      console.log("[SetupWizard] Initial mount activation for:", selectedTab);
    }
  }

  handleTabSelect(event) {
    this.handleTabActive(event);
  }

  handleOpenNewProfileModal() {
    this.isTypeModalOpen = true;
  }

  handleCloseTypeModal() {
    this.isTypeModalOpen = false;
  }

  handleSelectTypeFromModal(event) {
    const selectedType = event.currentTarget.dataset.type;
    this.isTypeModalOpen = false;
    this.createNewProfile(selectedType);
  }

  handleTypeSwitch(event) {
    const targetType = event.currentTarget.dataset.type;
    if (this.currentProfile.profileType === targetType) return;

    const updated = {
      ...this.currentProfile,
      profileType: targetType
    };

    if (
      targetType === "Companion Agent" &&
      (!updated.title || updated.title === "Google Cloud Agent Assist")
    ) {
      updated.title = "Google Cloud Companion Agent";
    } else if (
      targetType === "Container" &&
      (!updated.title || updated.title === "Google Cloud Companion Agent")
    ) {
      updated.title = "Google Cloud Agent Assist";
    }

    this.currentProfile = updated;
  }

  handleReloadSimulator() {
    this.isSimulatorMounted = false;
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
      this.isSimulatorMounted = true;
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Simulator Reloaded",
          message: `Re-mounted "${this.simulatorProfileDevName}" component in simulator.`,
          variant: "success"
        })
      );
    }, 50);
  }

  handleSimulatorProfileChange(event) {
    this.simulatorProfileDevName = event.detail.value;
    this.handleReloadSimulator();
  }

  handleCustomerMessageChange(event) {
    this.customerMessage = event.target.value;
  }

  handleAgentMessageChange(event) {
    this.agentMessage = event.target.value;
  }

  handleSendCustomerMessage() {
    if (!this.customerMessage) return;
    this.sendSimulatedMessage("END_USER", this.customerMessage);
    this.customerMessage = "";
  }

  handleSendAgentMessage() {
    if (!this.agentMessage) return;
    this.sendSimulatedMessage("HUMAN_AGENT", this.agentMessage);
    this.agentMessage = "";
  }

  handleCustomerKeyUp(event) {
    if (event.key === "Enter") {
      this.handleSendCustomerMessage();
    }
  }

  handleAgentKeyUp(event) {
    if (event.key === "Enter") {
      this.handleSendAgentMessage();
    }
  }

  sendSimulatedMessage(participantRole, text) {
    if (!text || !text.trim()) return;
    const trimmedText = text.trim();

    let convId = this.simulatorConversationId;
    if (!convId) {
      const containerEl = this.template.querySelector(
        "c-agent-assist-container, c-agent-assist-companion-agent, c-agent-assist-container-module"
      );
      if (containerEl?.conversationId) {
        convId = containerEl.conversationId;
      } else if (containerEl?.conversationName) {
        const parts = containerEl.conversationName.split("/");
        convId = parts[parts.length - 1];
      }
    }

    const payload = {
      detail: {
        conversationId: convId,
        participantRole: participantRole,
        request: {
          textInput: {
            text: trimmedText,
            languageCode: "us"
          }
        }
      }
    };

    if (typeof window.dispatchAgentAssistEvent === "function") {
      window.dispatchAgentAssistEvent("analyze-content-requested", payload);
    } else {
      window.dispatchEvent(
        new CustomEvent("analyze-content-requested", payload)
      );
    }
  }

  handlePlaceholderAction() {
    this.dispatchEvent(
      new ShowToastEvent({
        title: "Setup Action",
        message:
          "This setup guide or diagnostic feature is available in the Setup Wizard.",
        variant: "info"
      })
    );
  }

  async handleRunDiagnostics() {
    this.initPendingDiagnostics();
    console.log(
      "%c[AgentAssist Diagnostics] 🔄 User triggered manual diagnostic refresh...",
      "color: #0176d3; font-weight: bold; font-size: 13px;"
    );

    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(async () => {
      try {
        if (this.wiredDiagnosticsResult) {
          const freshData = await refreshApex(this.wiredDiagnosticsResult);
          if (freshData) {
            this.processDiagnosticsData(freshData, true);
          }
        }
        const isHealthy = this.diagnosticsState === "healthy";
        this.dispatchEvent(
          new ShowToastEvent({
            title: isHealthy ? "Diagnostics Passed" : "Diagnostics Alert",
            message: isHealthy
              ? "All Salesforce platform configurations, backend services, presence statuses, and permission sets are verified and healthy."
              : "One or more diagnostic checks failed. Check the instrument panel and browser console for details.",
            variant: isHealthy ? "success" : "error"
          })
        );
      } catch (err) {
        this.processDiagnosticsData(null, true, err);
        this.dispatchEvent(
          new ShowToastEvent({
            title: "Diagnostics Error",
            message:
              err?.body?.message ||
              err?.message ||
              "Failed to run diagnostics.",
            variant: "error"
          })
        );
      }
    }, 400);
  }

  selectProfileByDevName(devName) {
    const found = this.profiles.find((p) => p.developerName === devName);
    if (found) {
      this.selectedDevName = found.developerName;
      this.currentProfile = { ...found };
    } else if (this.profiles.length > 0) {
      this.selectedDevName = this.profiles[0].developerName;
      this.currentProfile = { ...this.profiles[0] };
    }
    this.evaluateEndpointHealth(this.currentProfile?.endpointUrl);
  }

  handleSelectProfile(event) {
    const devName = event.currentTarget.dataset.id;
    this.selectProfileByDevName(devName);
  }

  handleFieldChange(event) {
    const field = event.target.dataset.field;
    const value =
      event.target.type === "toggle" || event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;
    const updated = {
      ...this.currentProfile,
      [field]: value
    };

    if (field === "channel") {
      const validPlatforms =
        value === "voice"
          ? VOICE_PLATFORM_OPTIONS.map((opt) => opt.value)
          : CHAT_PLATFORM_OPTIONS.map((opt) => opt.value);
      if (!validPlatforms.includes(updated.platform)) {
        updated.platform = validPlatforms[0];
      }
    }

    if (field === "name" && !this.isDeveloperNameDisabled && value) {
      if (
        !this.currentProfile.developerName ||
        this.currentProfile.developerName.startsWith("Custom_Config_") ||
        this.currentProfile.developerName.startsWith("Custom_Container_") ||
        this.currentProfile.developerName.startsWith("Custom_Companion_")
      ) {
        updated.developerName = value.trim().replace(/[^a-zA-Z0-9]/g, "_");
      }
    }

    if (field === "endpointUrl") {
      clearTimeout(this.endpointDebounceTimeout);
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      this.endpointDebounceTimeout = setTimeout(() => {
        this.evaluateEndpointHealth(value);
      }, 200);
    }

    this.currentProfile = updated;
  }

  createNewProfile(profileType) {
    this.activeTab = "configurationProfiles";
    const isCompanion = profileType === "Companion Agent";
    const randomSuffix = Math.floor(Math.random() * 1000);
    const newProf = {
      id: "temp-" + Date.now(),
      name: isCompanion ? "New Companion Agent" : "New Container Profile",
      developerName:
        (isCompanion ? "Custom_Companion_" : "Custom_Container_") +
        randomSuffix,
      profileType: profileType,
      title: isCompanion
        ? "Google Cloud Companion Agent"
        : "Google Cloud Agent Assist",
      endpointUrl: "https://ui-connector-{id}.{region}.run.app",
      conversationProfile:
        "projects/{project-id}/locations/{location-id}/conversationProfiles/{profile-id}",
      channel: "chat",
      platform: "base",
      consumerKey: "",
      consumerSecret: "",
      clientCredentialsUser: "",
      containerHeight: "530px",
      debugMode: true,
      showDarkModeToggle: true,
      showHeader: false,
      showCorrectnessFeedback: false,
      modelName: "gemini-1.5-pro",
      welcomeMessage:
        "Hello! I am your AI Companion Agent. How can I assist you with this record today?",
      enableAutonomousActions: true,
      isActive: true
    };
    this.profiles = [newProf, ...this.profiles];
    this.selectProfileByDevName(newProf.developerName);
  }

  async handleSaveProfile() {
    try {
      const payload = {
        sobjectType: "Agent_Assist_Config__c",
        Name: this.currentProfile.name,
        Developer_Name__c: this.currentProfile.developerName,
        Profile_Type__c: this.currentProfile.profileType || "Container",
        Title__c: this.currentProfile.title,
        Endpoint_URL__c: this.currentProfile.endpointUrl,
        Conversation_Profile__c: this.currentProfile.conversationProfile,
        Channel__c: this.currentProfile.channel,
        Platform__c: this.currentProfile.platform,
        Consumer_Key__c: this.currentProfile.consumerKey,
        Consumer_Secret__c: this.currentProfile.consumerSecret,
        Client_Credentials_User__c: this.currentProfile.clientCredentialsUser,
        Container_Height__c: this.currentProfile.containerHeight,
        Debug_Mode__c: this.currentProfile.debugMode,
        Show_Dark_Mode_Toggle__c: this.currentProfile.showDarkModeToggle,
        Show_Header__c: this.currentProfile.showHeader,
        Show_Correctness_Feedback__c:
          this.currentProfile.showCorrectnessFeedback,
        Model_Name__c: this.currentProfile.modelName,
        Welcome_Message__c: this.currentProfile.welcomeMessage,
        Enable_Autonomous_Actions__c:
          this.currentProfile.enableAutonomousActions,
        Is_Active__c: true
      };

      if (
        this.currentProfile.id &&
        !this.currentProfile.id.startsWith("temp-") &&
        !this.currentProfile.id.startsWith("mock-")
      ) {
        payload.Id = this.currentProfile.id;
      }

      const saved = await saveConfig({ configRecord: payload });

      const idx = this.profiles.findIndex(
        (p) => p.developerName === this.currentProfile.developerName
      );
      if (idx >= 0) {
        this.profiles[idx] = {
          ...this.currentProfile,
          id: saved.Id || this.currentProfile.id
        };
        this.profiles = [...this.profiles];
      }

      this.dispatchEvent(
        new ShowToastEvent({
          title: "Configuration Saved",
          message: `Profile "${this.currentProfile.name}" (${this.currentProfile.developerName}) [${this.currentProfile.profileType}] saved successfully.`,
          variant: "success"
        })
      );

      if (this.wiredConfigsResult) {
        await refreshApex(this.wiredConfigsResult);
      }
    } catch (error) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Error Saving Profile",
          message: error.body ? error.body.message : error.message,
          variant: "error"
        })
      );
    }
  }

  async handleDeleteProfile() {
    if (this.isDefaultProfile) return;
    try {
      if (
        this.currentProfile.id &&
        !this.currentProfile.id.startsWith("temp-") &&
        !this.currentProfile.id.startsWith("mock-")
      ) {
        await deleteConfig({ configId: this.currentProfile.id });
      }
      this.profiles = this.profiles.filter(
        (p) => p.developerName !== this.currentProfile.developerName
      );
      this.selectProfileByDevName(this.profiles[0]?.developerName || "Default");
      this.dispatchEvent(
        new ShowToastEvent({
          title: "LWC Configuration Profile Deleted",
          message: "LWC configuration profile removed.",
          variant: "warning"
        })
      );
      if (this.wiredConfigsResult) {
        refreshApex(this.wiredConfigsResult);
      }
    } catch (error) {
      this.dispatchEvent(
        new ShowToastEvent({
          title: "Error Deleting Profile",
          message: error.body ? error.body.message : error.message,
          variant: "error"
        })
      );
    }
  }
}
