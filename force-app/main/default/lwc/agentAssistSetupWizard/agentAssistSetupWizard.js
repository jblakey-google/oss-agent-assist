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
import resetSingleDefaultConfig from "@salesforce/apex/AgentAssistConfigController.resetSingleDefaultConfig";
import checkEndpointHealth from "@salesforce/apex/AgentAssistConfigController.checkEndpointHealth";
import registerAuthToken from "@salesforce/apex/AgentAssistConfigController.registerAuthToken";
import getInstalledPackageStatus from "@salesforce/apex/AgentAssistConfigController.getInstalledPackageStatus";
import getUsersWithPermissionSetStatus from "@salesforce/apex/AgentAssistConfigController.getUsersWithPermissionSetStatus";
import toggleUserPermissionSetAssignment from "@salesforce/apex/AgentAssistConfigController.toggleUserPermissionSetAssignment";
import sfAgentAssistIcon from "@salesforce/resourceUrl/sf_agent_assist_icon";
import platformLogos from "@salesforce/resourceUrl/platform_logos";
import {
  DEFAULT_DIAGNOSTIC_SECTIONS,
  CHAT_PLATFORM_OPTIONS,
  VOICE_PLATFORM_OPTIONS,
  CHANNEL_OPTIONS,
  INITIAL_PROFILES,
  PERMISSION_SET_OPTIONS,
  PERMISSION_SET_CONFIG,
  STATUS_PILL_CLASSES,
  STATUS_LED_CLASSES,
  STATUS_ICONS,
  STATUS_LABELS
} from "./constants";
import {
  isValidEndpointUrl,
  checkBrowserFetchHealth,
  formatEndpointStatusResult,
  formatRegisterTokenResult,
  performEndpointHealthCheck,
  performRegisterEndpointHealthCheck,
  validateRegisterPrerequisites
} from "./healthCheckService";
import { evaluateDiagnosticsSuite } from "./diagnosticsService";
import { logComponentBadge, logDiagnostic } from "c/agentAssistLogger";
import {
  createNewProfileTemplate,
  switchProfileType,
  buildConfigRecordPayload,
  saveProfileService,
  saveAsCopyProfileService,
  deleteProfileService,
  resetProfileService,
  updateProfileInList,
  removeProfileFromList
} from "./profileService";
import {
  filterAndSortUsers,
  processAgentUsersData,
  calculateUserAssignmentStatus,
  toggleUserPermissionService,
  formatSelectedUserUI
} from "./userPermissionService";
import {
  formatSimulatorProfileOptions,
  getActiveSimulatorProfile,
  extractConversationIdFromEvent,
  resolveConversationId,
  buildSimulatedMessagePayload,
  dispatchSimulatedMessage
} from "./simulatorService";

export default class AgentAssistSetupWizard extends LightningElement {
  // ===========================================================================
  // 1. CLASS PROPERTIES & STATIC RESOURCES
  // ===========================================================================
  appIcon = sfAgentAssistIcon;

  get salesforceLogoUrl() {
    return `${platformLogos}/salesforce_logo.svg`;
  }

  get five9LogoUrl() {
    return `${platformLogos}/five9_logo.svg`;
  }

  get niceLogoUrl() {
    return `${platformLogos}/cxone_logo.svg`;
  }

  get genesysLogoUrl() {
    return `${platformLogos}/genesys_logo.svg`;
  }

  get twilioLogoUrl() {
    return `${platformLogos}/twilio_logo.svg`;
  }
  @track activeTab = "configurationProfiles";
  @track isTypeModalOpen = false;
  @track customerMessage = "";
  @track agentMessage = "";
  @track simulatorConversationId = null;
  @track simulatorConversationName = null;
  @track simulatorProfileDevName = "Default";
  @track simulatorRefreshKey = Date.now();
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

  @track registerHealthState = "pending"; // 'pending', 'pass', 'warning', 'fail'
  @track registerStatusCode = 200;
  @track registerStatusLabel = "Checking...";
  @track registerStatusMessage = "";
  registerDebounceTimeout;
  wiredConfigsResult;
  wiredDiagnosticsResult;
  @track packageStatus = {};
  @track packageAlertsDisabled =
    localStorage.getItem("agent_assist_package_alerts_disabled") === "true";

  // ===========================================================================
  // 2. PACKAGE INSTALLATION & ALERT SETTINGS
  // ===========================================================================
  async togglePackageAlerts() {
    this.packageAlertsDisabled = !this.packageAlertsDisabled;
    this.saveToStorage(
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

  // ===========================================================================
  // 3. EVENT LISTENERS & CONVERSATION HANDLERS
  // ===========================================================================
  handleConversationEvent = (event) => {
    const extracted = extractConversationIdFromEvent(event);
    if (extracted.conversationName !== null) {
      this.simulatorConversationName = extracted.conversationName;
    }
    if (extracted.conversationId !== null) {
      this.simulatorConversationId = extracted.conversationId;
    }
  };

  hasInitializedTab = false;
  isTabsetInitialized = false;

  // ===========================================================================
  // 4. STORAGE PERSISTENCE, DEBUG LOGGING & TOAST HELPERS
  // ===========================================================================
  get debugMode() {
    return true;
  }

  debugLog(message, ...extra) {
    if (this.debugMode) {
      logComponentBadge("AgentAssistSetupWizard", message, ...extra);
    }
  }

  showToast(title, message, variant = "info") {
    this.dispatchEvent(new ShowToastEvent({ title, message, variant }));
  }

  showErrorToast(title, error) {
    const message = error?.body?.message || error?.message || String(error);
    this.showToast(title, message, "error");
  }

  debugGroup(label, ...extra) {
    if (this.debugMode) console.group(label, ...extra);
  }

  debugGroupEnd() {
    if (this.debugMode) console.groupEnd();
  }

  getFromStorage(key) {
    try {
      const val = localStorage.getItem(key) || sessionStorage.getItem(key);
      if (val && val !== "undefined" && val !== "null") {
        return val;
      }
    } catch (e) {
      console.error(`[SetupWizard] Error reading ${key} from storage:`, e);
    }
    return null;
  }

  saveToStorage(key, value) {
    try {
      localStorage.setItem(key, value);
      sessionStorage.setItem(key, value);
    } catch (e) {
      console.error(`[SetupWizard] Error storing ${key} in storage:`, e);
    }
  }

  restorePersistedState(source) {
    const savedTab = this.getFromStorage("agent_assist_setup_active_tab");
    this.debugLog(`${source} - Restoring active tab from storage:`, savedTab);
    if (savedTab) {
      this.activeTab = savedTab;
    }
    const savedProfile = this.getFromStorage(
      "agent_assist_setup_selected_profile"
    );
    if (savedProfile) {
      this.selectedDevName = savedProfile;
      this.simulatorProfileDevName = savedProfile;
    }
  }

  // ===========================================================================
  // 5. COMPONENT LIFECYCLE METHODS
  // ===========================================================================
  renderedCallback() {
    if (!this.hasInitializedTab) {
      this.hasInitializedTab = true;
      this.restorePersistedState("renderedCallback");
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        this.isTabsetInitialized = true;
        this.debugLog(
          "Tabset marked initialized for user interactions. Current activeTab:",
          this.activeTab
        );
      }, 500);
    }
  }

  connectedCallback() {
    this.restorePersistedState("connectedCallback");
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
    this.evaluateRegisterEndpointHealth();
    this.loadAgentUsers();
  }

  // ===========================================================================
  // 6. TAB: USERS & PERMISSION SET ASSIGNMENT
  // ===========================================================================
  @track agentUsersList = [];
  @track selectedAgentUserId = "";
  @track isSelectedUserAssigned = false;
  @track isUserPermissionLoading = false;
  @track selectedPermissionSetName = "Agent_Assist_User";
  @track userSearchTerm = "";

  get permissionSetOptions() {
    return PERMISSION_SET_OPTIONS;
  }

  get selectedPermissionSetLabel() {
    return (
      PERMISSION_SET_CONFIG[this.selectedPermissionSetName]?.label ||
      "Google Cloud Agent Assist User"
    );
  }

  get selectedPermissionSetDescription() {
    return (
      PERMISSION_SET_CONFIG[this.selectedPermissionSetName]?.description ||
      ""
    );
  }

  get assignedUsersEmptyMessage() {
    return `No active users are currently assigned the ${this.selectedPermissionSetLabel} permission set.`;
  }

  handleUserSearchChange(event) {
    this.userSearchTerm = event.target.value;
  }

  get filteredUsersList() {
    return filterAndSortUsers(this.agentUsersList, this.userSearchTerm);
  }

  get hasFilteredUsers() {
    return this.filteredUsersList.length > 0;
  }

  get _selectedUserUI() {
    return formatSelectedUserUI(this.isSelectedUserAssigned);
  }

  get selectedUserBadgeClass() {
    return this._selectedUserUI.badgeClass;
  }

  get selectedUserStatusText() {
    return this._selectedUserUI.statusText;
  }

  get userAssignButtonLabel() {
    return this._selectedUserUI.buttonLabel;
  }

  get userAssignButtonVariant() {
    return this._selectedUserUI.buttonVariant;
  }

  get isIntegratedTranscriptActive() {
    return !this.currentProfile?.disableIntegratedTranscript;
  }

  get userAssignButtonIcon() {
    return this._selectedUserUI.buttonIcon;
  }

  get isAssignUserDisabled() {
    return !this.selectedAgentUserId || this.isUserPermissionLoading;
  }

  get assignedAgentUsers() {
    return this.agentUsersList.filter((u) => u.isAssigned);
  }

  get hasAssignedAgentUsers() {
    return this.assignedAgentUsers.length > 0;
  }

  get assignedUsersCount() {
    return this.assignedAgentUsers.length;
  }

  async handlePermissionSetChange(event) {
    this.selectedPermissionSetName = event.detail.value;
    await this.loadAgentUsers();
  }

  async loadAgentUsers() {
    try {
      const data = await getUsersWithPermissionSetStatus({
        permissionSetName: this.selectedPermissionSetName
      });
      const res = processAgentUsersData(data, this.selectedAgentUserId);
      this.agentUsersList = res.usersList;
      this.selectedAgentUserId = res.selectedUserId;
      this.updateSelectedUserStatus();
    } catch {
      // Ignore fetch error
    }
  }

  handleAgentUserSelect(event) {
    this.selectedAgentUserId = event.detail.value;
    this.updateSelectedUserStatus();
  }

  updateSelectedUserStatus() {
    this.isSelectedUserAssigned = calculateUserAssignmentStatus(
      this.agentUsersList,
      this.selectedAgentUserId
    );
  }

  async modifyUserPermissionSetAssignment(
    userId,
    assign,
    successMessage,
    errorTitle = "Error Managing Permission Set"
  ) {
    this.isUserPermissionLoading = true;
    try {
      await toggleUserPermissionService(
        {
          userId,
          assign,
          permissionSetName: this.selectedPermissionSetName
        },
        toggleUserPermissionSetAssignment
      );
      this.showToast("Success", successMessage, "success");
      await this.loadAgentUsers();
      if (this.wiredDiagnosticsResult) {
        refreshApex(this.wiredDiagnosticsResult);
      }
    } catch (error) {
      this.showErrorToast(errorTitle, error);
    } finally {
      this.isUserPermissionLoading = false;
    }
  }

  async handleAssignUserPermissionSet() {
    if (!this.selectedAgentUserId) return;
    const shouldAssign = !this.isSelectedUserAssigned;
    const message = `Permission set ${this.selectedPermissionSetLabel} (${
      shouldAssign ? "assigned to" : "removed from"
    }) user.`;
    await this.modifyUserPermissionSetAssignment(
      this.selectedAgentUserId,
      shouldAssign,
      message
    );
  }

  async handleToggleUserInline(event) {
    const userId = event.currentTarget?.dataset?.userId;
    const isAssigned = event.currentTarget?.dataset?.assigned === "true";
    if (!userId) return;
    const message = `Permission set ${this.selectedPermissionSetLabel} ${
      !isAssigned ? "assigned to" : "removed from"
    } user.`;
    await this.modifyUserPermissionSetAssignment(
      userId,
      !isAssigned,
      message
    );
  }

  async handleQuickRemoveUserPermissionSet(event) {
    const userId =
      event.detail?.name ||
      event.target?.name ||
      event.currentTarget?.dataset?.userId;
    if (!userId) return;
    const message = `Permission set ${this.selectedPermissionSetLabel} removed.`;
    await this.modifyUserPermissionSetAssignment(
      userId,
      false,
      message,
      "Error Removing Permission Set"
    );
  }

  // ===========================================================================
  // 8. DISCONNECTED CALLBACK & DIAGNOSTICS INIT
  // ===========================================================================
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

  // ===========================================================================
  // 9. TAB: INTEGRATION DIAGNOSTICS & MONITORING
  // ===========================================================================
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
    const result = evaluateDiagnosticsSuite(data, {
      isManualRun,
      queryError,
      debugMode: this.debugMode,
      packageAlertsDisabled: this.packageAlertsDisabled,
      defaultSections: DEFAULT_DIAGNOSTIC_SECTIONS,
      debugGroup: (label, ...extra) => this.debugGroup(label, ...extra),
      debugGroupEnd: () => this.debugGroupEnd()
    });
    this.diagnosticSections = result.sections;
    this.diagnosticsState = result.state;
  }

  get diagnosticsTabLabel() {
    return "Integration Diagnostics";
  }

  get diagnosticsTabIcon() {
    return STATUS_ICONS[this.diagnosticsState] || STATUS_ICONS.pass;
  }

  get masterStatusLedClass() {
    return STATUS_LED_CLASSES[this.diagnosticsState] || STATUS_LED_CLASSES.pass;
  }

  get masterStatusPillClass() {
    return STATUS_PILL_CLASSES[this.diagnosticsState] || STATUS_PILL_CLASSES.pass;
  }

  get masterStatusLabel() {
    return STATUS_LABELS[this.diagnosticsState] || STATUS_LABELS.pass;
  }

  get detailsStatusLabel() {
    return STATUS_LABELS[this.diagnosticsState] || STATUS_LABELS.pass;
  }

  get topInstrumentCards() {
    return this.diagnosticSections;
  }

  get detailedPrereqSections() {
    return this.diagnosticSections;
  }

  // ===========================================================================
  // 10. TAB: CX PLATFORM SETUP & WIRED PICKLISTS
  // ===========================================================================
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

  channelOptions = CHANNEL_OPTIONS;

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
        disableIntegratedTranscript:
          item.Disable_Integrated_Transcript__c !== undefined
            ? item.Disable_Integrated_Transcript__c
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

  // ===========================================================================
  // 11. TAB: CONFIGURATION PROFILES & SIMULATOR OPTIONS
  // ===========================================================================
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
    return formatSimulatorProfileOptions(this.profiles);
  }

  get simulatorProfile() {
    return getActiveSimulatorProfile(this.profiles, this.simulatorProfileDevName);
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

  // ===========================================================================
  // 12. ENDPOINT URL & REGISTER ROUTE HEALTH CHECKS
  // ===========================================================================
  get endpointStatusPillClass() {
    return STATUS_PILL_CLASSES[this.endpointHealthState] || STATUS_PILL_CLASSES.pending;
  }

  get endpointStatusLedClass() {
    return STATUS_LED_CLASSES[this.endpointHealthState] || STATUS_LED_CLASSES.pending;
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

  isValidEndpointUrl(url) {
    return isValidEndpointUrl(url);
  }

  async evaluateEndpointHealth(url) {
    const targetUrl =
      url !== undefined ? url : this.currentProfile?.endpointUrl;
    const check = this.isValidEndpointUrl(targetUrl);
    if (!check.valid) {
      this.endpointHealthState = check.reason === "empty" ? "warning" : "fail";
      this.endpointStatusCode = check.reason === "empty" ? 0 : 400;
      this.endpointStatusLabel =
        check.reason === "empty" ? "No URL" : "400 Bad Request";
      this.endpointStatusMessage = check.message;
      return;
    }

    this.endpointHealthState = "pending";
    this.endpointStatusCode = 0;
    this.endpointStatusLabel = "Checking...";
    this.endpointStatusMessage = "Checking connectivity...";

    const res = await performEndpointHealthCheck(
      targetUrl,
      checkEndpointHealth
    );
    this.endpointHealthState = res.state;
    this.endpointStatusCode = res.statusCode;
    this.endpointStatusLabel = res.label || res.statusLabel;
    this.endpointStatusMessage = res.message || res.statusMessage;
  }

  get registerStatusPillClass() {
    return STATUS_PILL_CLASSES[this.registerHealthState] || STATUS_PILL_CLASSES.pending;
  }

  get registerStatusLedClass() {
    return STATUS_LED_CLASSES[this.registerHealthState] || STATUS_LED_CLASSES.pending;
  }

  get registerStatusTooltip() {
    return `/register Route Status: ${this.registerStatusLabel}. ${this.registerStatusMessage || ""}`;
  }

  get registerStatusMessageClass() {
    if (this.registerHealthState === "fail") {
      return "endpoint-msg-fail";
    }
    if (this.registerHealthState === "warning") {
      return "endpoint-msg-warn";
    }
    return "slds-text-body_small slds-text-color_weak slds-m-top_xxx-small";
  }

  get showRemoteSiteNotice() {
    // Only display the Remote Site Setting warning banner if the UI Connector endpoint health check passed (200 OK)
    const isEndpointHealthPass =
      this.endpointHealthState === "pass" || this.endpointStatusCode === 200;

    const hasUnauthorizedCalloutError =
      (this.registerStatusMessage &&
        (this.registerStatusMessage.includes("Unauthorized endpoint") ||
          this.registerStatusMessage.includes("Remote Site Setting"))) ||
      (this.endpointStatusMessage &&
        this.endpointStatusMessage.includes("Unauthorized endpoint"));

    return isEndpointHealthPass && hasUnauthorizedCalloutError;
  }

  get remoteSiteSettingSetupUrl() {
    return "/lightning/setup/SecurityRemoteProxy/home";
  }

  handleRecheckRegisterEndpoint() {
    this.evaluateRegisterEndpointHealth();
  }

  async evaluateRegisterEndpointHealth() {
    const url = this.currentProfile?.endpointUrl;
    if (
      this.endpointStatusCode === null ||
      this.endpointStatusCode === undefined
    ) {
      await this.evaluateEndpointHealth(url);
    }

    const prereq = validateRegisterPrerequisites(
      url,
      this.endpointStatusCode,
      this.endpointHealthState,
      this.endpointStatusLabel
    );

    if (!prereq.canProceed) {
      this.registerHealthState = prereq.state;
      this.registerStatusCode = prereq.code;
      this.registerStatusLabel = prereq.label;
      this.registerStatusMessage = prereq.message;
      return;
    }

    this.registerHealthState = "pending";
    this.registerStatusCode = 0;
    this.registerStatusLabel = "Checking...";
    this.registerStatusMessage =
      "Checking /register route auth connectivity...";

    const res = await performRegisterEndpointHealthCheck(
      {
        configName: this.currentProfile?.developerName || "Default",
        endpointUrl: prereq.trimmedUrl,
        consumerKey: this.currentProfile?.consumerKey || "",
        consumerSecret: this.currentProfile?.consumerSecret || "",
        clientCredentialsUser: this.currentProfile?.clientCredentialsUser || ""
      },
      registerAuthToken
    );

    this.registerHealthState = res.state;
    this.registerStatusCode = res.code;
    this.registerStatusLabel = res.label;
    this.registerStatusMessage = res.message;
  }

  // ===========================================================================
  // 13. TAB NAVIGATION, MODALS & SIMULATOR MESSAGING
  // ===========================================================================
  handleTabActive(event) {
    const selectedTab = event.target?.value;
    this.debugLog(
      "handleTabActive triggered for tab:",
      selectedTab,
      "isTabsetInitialized:",
      this.isTabsetInitialized
    );

    if (!selectedTab || selectedTab === "undefined" || selectedTab === "null") {
      return;
    }

    this.activeTab = selectedTab;

    if (this.isTabsetInitialized) {
      this.saveToStorage("agent_assist_setup_active_tab", selectedTab);
      this.debugLog("Persisted activeTab to storage:", selectedTab);
    } else {
      this.debugLog("Initial mount activation for:", selectedTab);
    }

    if (selectedTab === "simulator") {
      if (this.wiredConfigsResult) {
        refreshApex(this.wiredConfigsResult)
          .then(() => {
            this.handleReloadSimulator(false);
          })
          .catch((err) => {
            console.error(
              "[SetupWizard] Error refreshing config profiles for simulator:",
              err
            );
            this.handleReloadSimulator(false);
          });
      } else {
        this.handleReloadSimulator(false);
      }
    }
  }

  handleOpenNewProfileModal() {
    this.isTypeModalOpen = true;
  }

  handleCloseTypeModal() {
    this.isTypeModalOpen = false;
  }

  handleSelectTypeFromModal(event) {
    if (event) {
      event.stopPropagation();
    }
    const selectedType = event.currentTarget?.dataset?.type;
    if (!selectedType) return;
    this.isTypeModalOpen = false;
    this.createNewProfile(selectedType);
  }

  handleTypeSwitch(event) {
    const targetType = event.currentTarget.dataset.type;
    this.currentProfile = switchProfileType(this.currentProfile, targetType);
  }

  handleReloadSimulator(showToast = true) {
    if (this.wiredConfigsResult) {
      refreshApex(this.wiredConfigsResult);
    }
    this.simulatorRefreshKey = Date.now();
    const simComp = this.template.querySelector(
      "c-agent-assist-container, c-agent-assist-companion-agent"
    );
    if (simComp && typeof simComp.refreshConfig === "function") {
      simComp.refreshConfig();
    }
    this.isSimulatorMounted = false;
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
      this.isSimulatorMounted = true;
      if (showToast === true) {
        this.showToast(
          "Simulator Reloaded",
          `Re-mounted "${this.simulatorProfileDevName}" component in simulator.`,
          "success"
        );
      }
    }, 50);
  }

  handleSimulatorProfileChange(event) {
    const devName = event.detail.value;
    this.selectProfileByDevName(devName);
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
    const containerEl = this.template.querySelector(
      "c-agent-assist-container, c-agent-assist-companion-agent, c-agent-assist-container-module"
    );
    const convId = resolveConversationId(
      this.simulatorConversationId,
      containerEl
    );
    const payload = buildSimulatedMessagePayload(participantRole, text, convId);
    dispatchSimulatedMessage(payload);
  }

  // ===========================================================================
  // 7. MANUAL DIAGNOSTICS REFRESH
  // ===========================================================================
  async handleRunDiagnostics() {
    this.initPendingDiagnostics();
    logDiagnostic(
      "🔄 User triggered manual diagnostic refresh...",
      "info",
      this.debugMode
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
        this.showToast(
          isHealthy ? "Diagnostics Passed" : "Diagnostics Alert",
          isHealthy
            ? "All Salesforce platform configurations, backend services, presence statuses, and permission sets are verified and healthy."
            : "One or more diagnostic checks failed. Check the instrument panel and browser console for details.",
          isHealthy ? "success" : "error"
        );
      } catch (err) {
        this.processDiagnosticsData(null, true, err);
        this.showErrorToast("Diagnostics Error", err);
      }
    }, 400);
  }

  // ===========================================================================
  // 14. PROFILE SELECTION & FORM FIELD EDITING
  // ===========================================================================
  selectProfileByDevName(devName) {
    const found = this.profiles.find((p) => p.developerName === devName);
    if (found) {
      this.selectedDevName = found.developerName;
      this.currentProfile = { ...found };
    } else if (this.profiles.length > 0) {
      this.selectedDevName = this.profiles[0].developerName;
      this.currentProfile = { ...this.profiles[0] };
    }
    this.simulatorProfileDevName = this.selectedDevName;
    if (this.selectedDevName) {
      this.saveToStorage(
        "agent_assist_setup_selected_profile",
        this.selectedDevName
      );
    }
    this.evaluateEndpointHealth(this.currentProfile?.endpointUrl);
    this.evaluateRegisterEndpointHealth();
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
      ...this.currentProfile
    };

    if (field === "integratedTranscriptActive") {
      updated.disableIntegratedTranscript = !value;
    } else {
      updated[field] = value;
    }

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

    if (
      field === "endpointUrl" ||
      field === "consumerKey" ||
      field === "consumerSecret" ||
      field === "clientCredentialsUser"
    ) {
      clearTimeout(this.endpointDebounceTimeout);
      clearTimeout(this.registerDebounceTimeout);
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      this.endpointDebounceTimeout = setTimeout(() => {
        if (field === "endpointUrl") {
          this.evaluateEndpointHealth(value);
        }
        this.evaluateRegisterEndpointHealth();
      }, 300);
    }

    this.currentProfile = updated;
  }

  // ===========================================================================
  // 15. PROFILE CRUD & TEMPLATE CREATION ACTIONS
  // ===========================================================================
  createNewProfile(profileType) {
    this.activeTab = "configurationProfiles";
    const newProf = createNewProfileTemplate(profileType);
    this.profiles = [newProf, ...this.profiles];
    this.selectProfileByDevName(newProf.developerName);
  }

  buildConfigRecordPayload(profile, overrides = {}) {
    return buildConfigRecordPayload(profile, overrides);
  }

  async handleSaveProfile() {
    try {
      const saved = await saveProfileService(this.currentProfile, saveConfig);
      this.profiles = updateProfileInList(
        this.profiles,
        this.currentProfile,
        saved.Id
      );
      this.showToast(
        "Configuration Saved",
        `Profile "${this.currentProfile.name}" (${this.currentProfile.developerName}) [${this.currentProfile.profileType}] saved successfully.`,
        "success"
      );
      if (this.wiredConfigsResult) {
        await refreshApex(this.wiredConfigsResult);
      }
      this.handleReloadSimulator(false);
    } catch (error) {
      this.showErrorToast("Error Saving Profile", error);
    }
  }

  async handleDeleteProfile() {
    if (this.isDefaultProfile) return;
    try {
      await deleteProfileService(this.currentProfile, deleteConfig);
      this.profiles = removeProfileFromList(
        this.profiles,
        this.currentProfile.developerName
      );
      this.selectProfileByDevName(this.profiles[0]?.developerName || "Default");
      this.showToast(
        "LWC Configuration Profile Deleted",
        "LWC configuration profile removed.",
        "warning"
      );
      if (this.wiredConfigsResult) {
        refreshApex(this.wiredConfigsResult);
      }
    } catch (error) {
      this.showErrorToast("Error Deleting Profile", error);
    }
  }

  async handleResetSingleProfile() {
    if (!this.isDefaultProfile) return;
    try {
      await resetProfileService(this.currentProfile, resetSingleDefaultConfig);
      this.showToast(
        "Profile Reset",
        `Reset default profile "${this.currentProfile.name}" (${this.currentProfile.developerName}) to factory default settings.`,
        "success"
      );
      if (this.wiredConfigsResult) {
        await refreshApex(this.wiredConfigsResult);
      }
      this.selectProfileByDevName(this.currentProfile.developerName);
    } catch (error) {
      this.showErrorToast("Error Resetting Profile", error);
    }
  }

  async handleSaveAsCopy() {
    try {
      const { saved, copyName, copyDevName } = await saveAsCopyProfileService(
        this.currentProfile,
        saveConfig
      );
      this.showToast(
        "Profile Copied",
        `Created new profile copy "${copyName}" (${copyDevName}).`,
        "success"
      );
      if (this.wiredConfigsResult) {
        await refreshApex(this.wiredConfigsResult);
      }
      this.selectProfileByDevName(saved.Developer_Name__c || copyDevName);
    } catch (error) {
      this.showErrorToast("Error Copying Profile", error);
    }
  }
}
