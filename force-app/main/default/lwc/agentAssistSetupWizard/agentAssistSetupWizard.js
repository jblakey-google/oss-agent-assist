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
import getAllConfigs from "@salesforce/apex/AgentAssistConfigController.getAllConfigs";
import saveConfig from "@salesforce/apex/AgentAssistConfigController.saveConfig";
import deleteConfig from "@salesforce/apex/AgentAssistConfigController.deleteConfig";
import resetSingleDefaultConfig from "@salesforce/apex/AgentAssistConfigController.resetSingleDefaultConfig";
import sfAgentAssistIcon from "@salesforce/resourceUrl/sf_agent_assist_icon";

import {
  INITIAL_PROFILES,
  VOICE_PLATFORM_OPTIONS,
  CHAT_PLATFORM_OPTIONS,
  getFromStorage,
  saveToStorage,
  dispatchToast,
  dispatchErrorToast
} from "c/agentAssistSetupSharedService";

// =============================================================================
// Parent Orchestrator Component: AgentAssistSetupWizard
// =============================================================================

/**
 * Top-level shell LWC for the Integration Setup Wizard.
 * Manages active tab state, top-level profile selections, modal overlays,
 * and delegates panel logic to sub-component LWCs.
 */
export default class AgentAssistSetupWizard extends LightningElement {
  appIcon = sfAgentAssistIcon;

  // =============================================================================
  // #region 1. Reactive Component State
  // =============================================================================

  @track activeTab = "configurationProfiles";
  @track isTypeModalOpen = false;
  @track profiles = [...INITIAL_PROFILES];
  @track selectedDevName = "Default";
  @track currentProfile = { ...INITIAL_PROFILES[0] };
  @track simulatorProfileDevName = "Default";

  wiredConfigsResult;
  hasInitializedTab = false;
  isTabsetInitialized = false;

  // #endregion

  // =============================================================================
  // #region 2. Lifecycle and Persistence
  // =============================================================================

  connectedCallback() {
    this.restorePersistedState("connectedCallback");
  }

  renderedCallback() {
    if (!this.hasInitializedTab) {
      this.hasInitializedTab = true;
      this.restorePersistedState("renderedCallback");
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      setTimeout(() => {
        this.isTabsetInitialized = true;
      }, 500);
    }
  }

  /**
   * Restores active tab and selected profile from local storage.
   */
  restorePersistedState() {
    const savedTab = getFromStorage("agent_assist_setup_active_tab");
    if (savedTab) {
      this.activeTab = savedTab;
    }
    const savedProfile = getFromStorage("agent_assist_setup_selected_profile");
    if (savedProfile) {
      this.selectedDevName = savedProfile;
      this.simulatorProfileDevName = savedProfile;
    }
  }

  // #endregion

  // =============================================================================
  // #region 3. Apex Data Wires
  // =============================================================================

  /**
   * Wire adapter fetching all Agent_Assist_Config__c records from org.
   */
  @wire(getAllConfigs)
  wiredConfigs(result) {
    this.wiredConfigsResult = result;
    const { data } = result;
    if (data && data.length > 0) {
      this.profiles = data.map((rec) => ({
        id: rec.Id,
        name: rec.Name,
        developerName: rec.Developer_Name__c,
        profileType: rec.Profile_Type__c || "Container",
        title: rec.Title__c,
        endpointUrl: rec.Endpoint_URL__c,
        conversationProfile: rec.Conversation_Profile__c,
        channel: rec.Channel__c,
        platform: rec.Platform__c,
        consumerKey: rec.Consumer_Key__c,
        consumerSecret: rec.Consumer_Secret__c,
        clientCredentialsUser: rec.Client_Credentials_User__c,
        containerHeight: rec.Container_Height__c,
        debugMode: rec.Debug_Mode__c,
        showDarkModeToggle: rec.Show_Dark_Mode_Toggle__c,
        showHeader: rec.Show_Header__c,
        showCorrectnessFeedback: rec.Show_Correctness_Feedback__c,
        disableIntegratedTranscript: rec.Disable_Integrated_Transcript__c || false,
        disabledFeatures: rec.Disabled_Features__c || "",
        modelName: rec.Model_Name__c,
        welcomeMessage: rec.Welcome_Message__c,
        enableAutonomousActions: rec.Enable_Autonomous_Actions__c,
        isActive: rec.Is_Active__c
      }));
      this.syncCurrentProfile();
    }
  }

  /**
   * Synchronizes currentProfile state with selectedDevName.
   */
  syncCurrentProfile() {
    const found = this.profiles.find(
      (p) => p.developerName === this.selectedDevName
    );
    if (found) {
      this.currentProfile = { ...found };
    } else if (this.profiles.length > 0) {
      this.selectedDevName = this.profiles[0].developerName;
      this.currentProfile = { ...this.profiles[0] };
    }
  }

  // #endregion

  // =============================================================================
  // #region 4. Event Handlers and Delegation
  // =============================================================================

  handleTabActive(event) {
    if (!this.isTabsetInitialized) return;
    const tabValue = event.target.value;
    if (tabValue && this.activeTab !== tabValue) {
      this.activeTab = tabValue;
      saveToStorage("agent_assist_setup_active_tab", tabValue);
      if (tabValue === "simulator") {
        this.refreshProfiles();
      }
    }
  }

  handleOpenNewProfileModal() {
    this.isTypeModalOpen = true;
  }

  handleCloseModal() {
    this.isTypeModalOpen = false;
  }

  handleSelectNewProfileType(event) {
    const type = event.currentTarget.dataset.type;
    this.isTypeModalOpen = false;
    const isCompanion = type === "Companion Agent";
    const randomSuffix = Math.floor(Math.random() * 1000);
    const newProfile = {
      id: "temp-" + Date.now(),
      name: isCompanion ? "New Companion Agent" : "New Container Profile",
      developerName:
        (isCompanion ? "Custom_Companion_" : "Custom_Container_") + randomSuffix,
      profileType: type,
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
      disableIntegratedTranscript: false,
      modelName: "gemini-1.5-pro",
      welcomeMessage:
        "Hello! I am your AI Companion Agent. How can I assist you with this record today?",
      enableAutonomousActions: true,
      isActive: true
    };
    this.profiles = [...this.profiles, newProfile];
    this.selectedDevName = newProfile.developerName;
    this.simulatorProfileDevName = newProfile.developerName;
    this.currentProfile = { ...newProfile };
    saveToStorage("agent_assist_setup_selected_profile", newProfile.developerName);
  }

  handleProfileSelect(event) {
    const devName = event.detail.developerName;
    this.selectedDevName = devName;
    this.simulatorProfileDevName = devName;
    saveToStorage("agent_assist_setup_selected_profile", devName);
    this.syncCurrentProfile();
  }

  handleTypeSwitch(event) {
    const targetType = event.detail.profileType;
    if (!this.currentProfile || this.currentProfile.profileType === targetType) {
      return;
    }
    this.currentProfile = {
      ...this.currentProfile,
      profileType: targetType
    };
    if (
      targetType === "Companion Agent" &&
      (!this.currentProfile.title ||
        this.currentProfile.title === "Google Cloud Agent Assist")
    ) {
      this.currentProfile.title = "Google Cloud Companion Agent";
    } else if (
      targetType === "Container" &&
      (!this.currentProfile.title ||
        this.currentProfile.title === "Google Cloud Companion Agent")
    ) {
      this.currentProfile.title = "Google Cloud Agent Assist";
    }
  }

  handleFieldChange(event) {
    const { field, value } = event.detail;
    if (field === "integratedTranscriptActive") {
      this.currentProfile = {
        ...this.currentProfile,
        disableIntegratedTranscript: !value
      };
      return;
    }
    this.currentProfile = {
      ...this.currentProfile,
      [field]: value
    };

    if (field === "channel") {
      const validOptions =
        value === "voice" ? VOICE_PLATFORM_OPTIONS : CHAT_PLATFORM_OPTIONS;
      const isValid = validOptions.some(
        (opt) => opt.value === this.currentProfile.platform
      );
      if (!isValid && validOptions.length > 0) {
        this.currentProfile.platform = validOptions[0].value;
      }
    }
  }

  async handleSaveProfile() {
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
      Show_Correctness_Feedback__c: this.currentProfile.showCorrectnessFeedback,
      Disable_Integrated_Transcript__c:
        this.currentProfile.disableIntegratedTranscript !== undefined
          ? this.currentProfile.disableIntegratedTranscript
          : false,
      Disabled_Features__c: this.currentProfile.disabledFeatures || "",
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

    try {
      const saved = await saveConfig({ configRecord: payload });
      dispatchToast(
        this,
        "Profile Saved",
        `Configuration Profile "${this.currentProfile.name}" was saved successfully.`,
        "success"
      );
      if (this.wiredConfigsResult) {
        await refreshApex(this.wiredConfigsResult);
      }
      if (saved && saved.Id) {
        this.currentProfile = { ...this.currentProfile, id: saved.Id };
        const idx = this.profiles.findIndex(
          (p) => p.developerName === this.currentProfile.developerName
        );
        if (idx >= 0) {
          this.profiles[idx] = { ...this.currentProfile };
          this.profiles = [...this.profiles];
        }
      }
    } catch (err) {
      dispatchErrorToast(this, "Error Saving Profile", err);
    }
  }

  async handleSaveAsCopy() {
    const randomSuffix = Math.floor(Math.random() * 900) + 100;
    const baseDevName = (this.currentProfile.developerName || "Custom_Profile")
      .replace(/^Copy_/, "")
      .substring(0, 30);
    const copyDevName = `Copy_${baseDevName}_${randomSuffix}`.replace(
      /[^a-zA-Z0-9_]/g,
      "_"
    );
    const baseName = (this.currentProfile.name || "Configuration Profile").replace(
      /^Copy of\s*/,
      ""
    );
    const copyName = `Copy of ${baseName}`.substring(0, 80);

    const payload = {
      sobjectType: "Agent_Assist_Config__c",
      Name: copyName,
      Developer_Name__c: copyDevName,
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
      Show_Correctness_Feedback__c: this.currentProfile.showCorrectnessFeedback,
      Disable_Integrated_Transcript__c:
        this.currentProfile.disableIntegratedTranscript !== undefined
          ? this.currentProfile.disableIntegratedTranscript
          : false,
      Disabled_Features__c: this.currentProfile.disabledFeatures || "",
      Model_Name__c: this.currentProfile.modelName,
      Welcome_Message__c: this.currentProfile.welcomeMessage,
      Enable_Autonomous_Actions__c:
        this.currentProfile.enableAutonomousActions,
      Is_Active__c: true
    };

    try {
      const saved = await saveConfig({ configRecord: payload });
      dispatchToast(
        this,
        "Profile Copied",
        `Created copy "${copyName}" successfully.`,
        "success"
      );
      if (this.wiredConfigsResult) {
        await refreshApex(this.wiredConfigsResult);
      }
      const newCopyProfile = {
        ...this.currentProfile,
        id: saved ? saved.Id : "temp-" + Date.now(),
        name: copyName,
        developerName: copyDevName
      };
      this.profiles = [...this.profiles, newCopyProfile];
      this.selectedDevName = copyDevName;
      this.simulatorProfileDevName = copyDevName;
      this.currentProfile = { ...newCopyProfile };
      saveToStorage("agent_assist_setup_selected_profile", copyDevName);
    } catch (err) {
      dispatchErrorToast(this, "Error Copying Profile", err);
    }
  }

  async handleDeleteProfile() {
    if (
      this.currentProfile.developerName === "Default" ||
      this.currentProfile.developerName === "Default_Companion"
    ) {
      dispatchToast(
        this,
        "Action Not Allowed",
        "Default configuration profiles cannot be deleted.",
        "warning"
      );
      return;
    }
    const devName = this.currentProfile.developerName;
    try {
      if (
        this.currentProfile.id &&
        !this.currentProfile.id.startsWith("temp-") &&
        !this.currentProfile.id.startsWith("mock-")
      ) {
        await deleteConfig({ configId: this.currentProfile.id });
      }
      dispatchToast(
        this,
        "Profile Deleted",
        `Profile "${this.currentProfile.name}" was deleted.`,
        "success"
      );
      this.profiles = this.profiles.filter((p) => p.developerName !== devName);
      if (this.profiles.length > 0) {
        this.selectedDevName = this.profiles[0].developerName;
        this.simulatorProfileDevName = this.profiles[0].developerName;
        this.currentProfile = { ...this.profiles[0] };
        saveToStorage("agent_assist_setup_selected_profile", this.profiles[0].developerName);
      }
      if (this.wiredConfigsResult) {
        await refreshApex(this.wiredConfigsResult);
      }
    } catch (err) {
      dispatchErrorToast(this, "Error Deleting Profile", err);
    }
  }

  async handleResetSingleProfile() {
    const devName = this.currentProfile.developerName;
    try {
      await resetSingleDefaultConfig({ developerName: devName });
      dispatchToast(
        this,
        "Profile Reset",
        `Configuration Profile "${this.currentProfile.name}" has been reset to out-of-the-box defaults.`,
        "success"
      );
      if (this.wiredConfigsResult) {
        await refreshApex(this.wiredConfigsResult);
      }
    } catch (err) {
      dispatchErrorToast(this, "Error Resetting Profile", err);
    }
  }

  handleSimulatorProfileChange(event) {
    this.simulatorProfileDevName = event.detail.developerName;
  }

  async refreshProfiles() {
    if (this.wiredConfigsResult) {
      try {
        await refreshApex(this.wiredConfigsResult);
      } catch {
        // Ignore refresh error
      }
    }
  }

  // #endregion
}
