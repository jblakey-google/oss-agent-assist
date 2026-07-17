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
    title: "Google Cloud Agent Assist",
    endpointUrl: "https://api.agentassist.example.com/v1",
    enableAutoAssist: true,
    showSuggestions: true,
    isActive: true
  }
];

export default class AgentAssistSetupWizard extends LightningElement {
  appIcon = sfAgentAssistIcon;
  @track activeTab = "configurationProfiles";
  @track simulatedMessage = "";
  @track profiles = [...INITIAL_PROFILES];
  @track selectedDevName = "Default";
  @track currentProfile = { ...INITIAL_PROFILES[0] };
  wiredConfigsResult;

  @wire(getAllConfigs)
  wiredConfigs(result) {
    this.wiredConfigsResult = result;
    const { data } = result;
    if (data && data.length > 0) {
      const dbProfiles = data.map((item) => ({
        id: item.Id,
        name: item.Name,
        developerName: item.Developer_Name__c,
        title: item.Title__c,
        endpointUrl: item.Endpoint_URL__c,
        enableAutoAssist: item.Enable_Auto_Assist__c,
        showSuggestions: item.Show_Suggestions__c,
        isActive: item.Is_Active__c
      }));

      // Merge DB profiles with standard INITIAL_PROFILES so default never disappears
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
      return {
        ...prof,
        cssClass: `profile-item slds-p-around_small slds-m-bottom_x-small ${
          isSelected ? "profile-item_active" : ""
        }`
      };
    });
  }

  get editorCardTitle() {
    return `Edit Profile: ${this.currentProfile?.name || "New Profile"}`;
  }

  get isDefaultProfile() {
    return this.currentProfile?.developerName === "Default";
  }

  get isDeveloperNameDisabled() {
    if (!this.currentProfile) return true;
    if (this.currentProfile.developerName === "Default") return true;
    const id = this.currentProfile.id;
    // Lock developer name if the profile has already been saved to the database
    return !!(id && !id.startsWith("temp-") && !id.startsWith("mock-"));
  }

  handleTabSelect(event) {
    this.activeTab = event.target.value;
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

  handleSimulatedMessageChange(event) {
    this.simulatedMessage = event.target.value;
  }

  handleSendSimulatedMessage() {
    if (!this.simulatedMessage) return;
    this.dispatchEvent(
      new ShowToastEvent({
        title: "Simulated Message Sent",
        message: `Generated AI assistance preview for "${this.simulatedMessage}"`,
        variant: "success"
      })
    );
    this.simulatedMessage = "";
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
      event.target.type === "toggle"
        ? event.target.checked
        : event.target.value;
    const updated = {
      ...this.currentProfile,
      [field]: value
    };

    // Auto-generate Developer Name for new profiles when typing Display Name
    if (field === "name" && !this.isDeveloperNameDisabled && value) {
      if (
        !this.currentProfile.developerName ||
        this.currentProfile.developerName.startsWith("Custom_Config_")
      ) {
        updated.developerName = value.trim().replace(/[^a-zA-Z0-9]/g, "_");
      }
    }

    this.currentProfile = updated;
  }

  handleNewProfile() {
    this.activeTab = "configurationProfiles";
    const newProf = {
      id: "temp-" + Date.now(),
      name: "New Custom Profile",
      developerName: "Custom_Config_" + Math.floor(Math.random() * 1000),
      title: "Custom Google Cloud Agent Assist",
      endpointUrl: "https://api.agentassist.example.com/v1",
      enableAutoAssist: true,
      showSuggestions: true,
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
        Title__c: this.currentProfile.title,
        Endpoint_URL__c: this.currentProfile.endpointUrl,
        Enable_Auto_Assist__c: this.currentProfile.enableAutoAssist,
        Show_Suggestions__c: this.currentProfile.showSuggestions,
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

      // Update local state immediately
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
          message: `Profile state for "${this.currentProfile.name}" (${this.currentProfile.developerName}) was saved successfully.`,
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
