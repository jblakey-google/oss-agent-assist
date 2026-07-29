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

import { LightningElement, api, track, wire } from "lwc";
import checkEndpointHealth from "@salesforce/apex/AgentAssistConfigController.checkEndpointHealth";
import registerAuthToken from "@salesforce/apex/AgentAssistConfigController.registerAuthToken";

import {
  CHANNEL_OPTIONS,
  CHAT_PLATFORM_OPTIONS,
  VOICE_PLATFORM_OPTIONS,
  STATUS_PILL_CLASSES,
  STATUS_LED_CLASSES,
  isValidEndpointUrl,
  performEndpointHealthCheck,
  performRegisterEndpointHealthCheck,
  validateRegisterPrerequisites
} from "c/agentAssistSetupSharedService";
import getActiveUsers from "@salesforce/apex/AgentAssistConfigController.getActiveUsers";

export default class AgentAssistSetupProfilesPanel extends LightningElement {
  // =============================================================================
  // #region 1. Reactive Properties and State
  // =============================================================================

  @api profiles = [];
  @api selectedDevName = "Default";
  @api currentProfile = {};

  @track endpointHealthState = "pending";
  @track endpointStatusCode = 200;
  @track endpointStatusLabel = "Checking...";
  @track endpointStatusMessage = "";
  endpointDebounceTimeout;

  @track registerHealthState = "pending";
  @track registerStatusCode = 200;
  @track registerStatusLabel = "Checking...";
  @track registerStatusMessage = "";
  registerDebounceTimeout;

  @track userOptions = [];

  // #endregion

  // =============================================================================
  // #region 2. Lifecycle and Wires
  // =============================================================================

  connectedCallback() {
    this.evaluateEndpointHealth(this.currentProfile?.endpointUrl);
    this.evaluateRegisterEndpointHealth();
  }

  @wire(getActiveUsers)
  wiredActiveUsers({ data, error }) {
    if (data) {
      this.userOptions = [
        { label: "-- None (Use App Default) --", value: "" },
        ...data
      ];
    } else if (error) {
      console.warn("Could not load active users for picklist:", error);
    }
  }

  // #endregion

  // =============================================================================
  // #region 3. Getters and Computed Properties
  // =============================================================================

  channelOptions = CHANNEL_OPTIONS;

  get platformOptions() {
    if (this.currentProfile?.channel === "voice") {
      return VOICE_PLATFORM_OPTIONS;
    }
    return CHAT_PLATFORM_OPTIONS;
  }

  get profileList() {
    return (this.profiles || []).map((prof) => {
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

  get isIntegratedTranscriptActive() {
    return !this.currentProfile?.disableIntegratedTranscript;
  }

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
    if (this.endpointHealthState === "fail") return "endpoint-msg-fail";
    if (this.endpointHealthState === "warning") return "endpoint-msg-warn";
    return "slds-text-body_small slds-text-color_weak slds-m-top_xxx-small";
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
    if (this.registerHealthState === "fail") return "endpoint-msg-fail";
    if (this.registerHealthState === "warning") return "endpoint-msg-warn";
    return "slds-text-body_small slds-text-color_weak slds-m-top_xxx-small";
  }

  get showRemoteSiteNotice() {
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

  // #endregion

  // =============================================================================
  // #region 4. Event Handlers
  // =============================================================================

  handleOpenNewProfileModal() {
    this.dispatchEvent(new CustomEvent("opennewprofilemodal"));
  }

  handleSelectProfile(event) {
    const devName = event.currentTarget.dataset.id;
    this.dispatchEvent(
      new CustomEvent("profileselect", { detail: { developerName: devName } })
    );
  }

  handleTypeSwitch(event) {
    const targetType = event.currentTarget.dataset.type;
    this.dispatchEvent(
      new CustomEvent("typeswitch", { detail: { profileType: targetType } })
    );
  }

  handleFieldChange(event) {
    const field = event.target.dataset.field;
    const value =
      event.target.type === "toggle" || event.target.type === "checkbox"
        ? event.target.checked
        : event.target.value;

    this.dispatchEvent(
      new CustomEvent("fieldchange", { detail: { field, value } })
    );

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
  }

  handleRecheckEndpoint() {
    this.evaluateEndpointHealth(this.currentProfile?.endpointUrl);
  }

  handleRecheckRegisterEndpoint() {
    this.evaluateRegisterEndpointHealth();
  }

  handleSaveProfile() {
    this.dispatchEvent(new CustomEvent("saveprofile"));
  }

  handleSaveAsCopy() {
    this.dispatchEvent(new CustomEvent("saveascopy"));
  }

  handleDeleteProfile() {
    this.dispatchEvent(new CustomEvent("deleteprofile"));
  }

  handleResetSingleProfile() {
    this.dispatchEvent(new CustomEvent("resetprofile"));
  }

  // #endregion

  // =============================================================================
  // #region 5. Health Check Evaluation
  // =============================================================================

  @api
  async evaluateEndpointHealth(url) {
    const targetUrl =
      url !== undefined ? url : this.currentProfile?.endpointUrl;
    const check = isValidEndpointUrl(targetUrl);
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

  @api
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

  // #endregion
}
