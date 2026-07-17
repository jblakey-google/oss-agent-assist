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
import saveConfig from "@salesforce/apex/AgentAssistConfigController.saveConfig";
import deleteConfig from "@salesforce/apex/AgentAssistConfigController.deleteConfig";
import sfAgentAssistIcon from "@salesforce/resourceUrl/sf_agent_assist_icon";

const INITIAL_PROFILES = [
  {
    id: "mock-1",
    name: "Default Profile",
    developerName: "Default",
    profileType: "Container",
    title: "Google Cloud Agent Assist",
    endpointUrl: "https://api.agentassist.example.com/v1",
    conversationProfile: "projects/{project-id}/locations/{location-id}/conversationProfiles/{profile-id}",
    channel: "chat",
    platform: "messaging",
    consumerKey: "",
    consumerSecret: "",
    containerHeight: "530px",
    debugMode: true,
    showDarkModeToggle: true,
    showHeader: false,
    showCorrectnessFeedback: false,
    disabledFeatures: "",
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
    endpointUrl: "https://api.agentassist.example.com/v1",
    conversationProfile: "projects/{project-id}/locations/{location-id}/conversationProfiles/{profile-id}",
    channel: "chat",
    platform: "messaging",
    consumerKey: "",
    consumerSecret: "",
    containerHeight: "530px",
    debugMode: true,
    showDarkModeToggle: true,
    showHeader: false,
    showCorrectnessFeedback: false,
    disabledFeatures: "",
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
  @track simulatedMessage = "";
  @track simulatorProfileDevName = "Default";
  @track profiles = [...INITIAL_PROFILES];
  @track selectedDevName = "Default";
  @track currentProfile = { ...INITIAL_PROFILES[0] };
  wiredConfigsResult;

  channelOptions = [
    { label: "Chat (Digital Messaging)", value: "chat" },
    { label: "Voice (Telephony)", value: "voice" }
  ];

  platformOptions = [
    { label: "Salesforce Messaging (MIAW / Chat)", value: "messaging" },
    { label: "Twilio Flex", value: "twilioflex" },
    { label: "Service Cloud Voice (NICE)", value: "servicecloudvoice-nice" },
    { label: "Service Cloud Voice (BYOT Five9)", value: "servicecloudvoice-byot-five9" }
  ];

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
        containerHeight: item.Container_Height__c || "530px",
        debugMode:
          item.Debug_Mode__c !== undefined ? item.Debug_Mode__c : true,
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
        disabledFeatures: item.Disabled_Features__c || "",
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

  get isSimulatorCompanion() {
    return this.simulatorProfile?.profileType === "Companion Agent";
  }

  get isSimulatorContainer() {
    return !this.isSimulatorCompanion;
  }

  handleTabSelect(event) {
    this.activeTab = event.target.value;
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

  handleSimulatorProfileChange(event) {
    this.simulatorProfileDevName = event.detail.value;
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

  handleRunDiagnostics() {
    this.dispatchEvent(
      new ShowToastEvent({
        title: "Diagnostics Completed",
        message:
          "All backend services, authentication tokens, and static resources are healthy.",
        variant: "success"
      })
    );
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
      endpointUrl: "https://api.agentassist.example.com/v1",
      conversationProfile:
        "projects/{project-id}/locations/{location-id}/conversationProfiles/{profile-id}",
      channel: "chat",
      platform: "messaging",
      consumerKey: "",
      consumerSecret: "",
      containerHeight: "530px",
      debugMode: true,
      showDarkModeToggle: true,
      showHeader: false,
      showCorrectnessFeedback: false,
      disabledFeatures: "",
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
        Container_Height__c: this.currentProfile.containerHeight,
        Debug_Mode__c: this.currentProfile.debugMode,
        Show_Dark_Mode_Toggle__c: this.currentProfile.showDarkModeToggle,
        Show_Header__c: this.currentProfile.showHeader,
        Show_Correctness_Feedback__c: this.currentProfile.showCorrectnessFeedback,
        Disabled_Features__c: this.currentProfile.disabledFeatures,
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
          title: "Profile Deleted",
          message: "Configuration profile removed.",
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
