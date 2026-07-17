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

import { LightningElement, api, wire, track } from "lwc";
import { refreshApex } from "@salesforce/apex";
import { ShowToastEvent } from "lightning/platformShowToastEvent";
import getResolvedConfig from "@salesforce/apex/AgentAssistConfigController.getResolvedConfig";

export default class AgentAssistContainer extends LightningElement {
  @api recordId;
  @api objectApiName;

  // XML App Builder Design Property
  @api configName = "Default";

  // Component Reactive State
  @track resolvedState = {};
  @track isLoading = true;
  @track showConfigDetails = false;
  wiredConfigResult;

  @wire(getResolvedConfig, {
    configName: "$configName"
  })
  wiredConfig(result) {
    this.wiredConfigResult = result;
    const { data, error } = result;
    this.isLoading = false;
    if (data) {
      this.resolvedState = data;
    } else if (error) {
      console.error(
        "Error loading Google Cloud Agent Assist configuration:",
        error
      );
      this.resolvedState = {
        title: "Configuration Error",
        developerName: this.configName || "Default",
        profileType: "Container",
        endpointUrl: "https://api.agentassist.example.com/v1",
        showSuggestions: true,
        enableAutoAssist: true,
        isFound: false,
        resolutionSource: "Error Loading Configuration"
      };
    }
  }

  get isProfileMissing() {
    return this.resolvedState && this.resolvedState.isFound === false;
  }

  get isUtilityBar() {
    return !this.recordId && !this.objectApiName;
  }

  get contextBadgeLabel() {
    if (this.objectApiName) {
      return `${this.objectApiName} Record`;
    }
    return "Utility Bar";
  }

  get resolvedTitle() {
    if (this.isProfileMissing) {
      return "Configuration Profile Deleted";
    }
    return this.resolvedState?.title || "Google Cloud Agent Assist";
  }

  get activeProfileName() {
    return (
      this.resolvedState?.name ||
      this.resolvedState?.developerName ||
      this.configName ||
      "Default"
    );
  }

  get profileTypeLabel() {
    return this.resolvedState?.profileType || "Container";
  }

  get resolutionSource() {
    return this.resolvedState?.resolutionSource || "Loading Configuration...";
  }

  get resolvedEndpoint() {
    return (
      this.resolvedState?.endpointUrl ||
      "https://api.agentassist.example.com/v1"
    );
  }

  get resolvedShowSuggestions() {
    if (
      this.resolvedState &&
      this.resolvedState.showSuggestions !== undefined
    ) {
      return this.resolvedState.showSuggestions;
    }
    return true;
  }

  get resolvedEnableAutoAssist() {
    if (
      this.resolvedState &&
      this.resolvedState.enableAutoAssist !== undefined
    ) {
      return this.resolvedState.enableAutoAssist;
    }
    return true;
  }

  get autoAssistStatusText() {
    return this.resolvedEnableAutoAssist ? "Enabled" : "Disabled";
  }

  get suggestionsStatusText() {
    return this.resolvedShowSuggestions ? "Enabled" : "Disabled";
  }

  get activeContextDescription() {
    if (this.objectApiName && this.recordId) {
      return `${this.objectApiName} (${this.recordId.substring(0, 8)}...)`;
    }
    return "Global Utility Session";
  }

  get noFeaturesEnabled() {
    return !this.resolvedShowSuggestions && !this.resolvedEnableAutoAssist;
  }

  get toggleDetailsLabel() {
    return this.showConfigDetails
      ? "Hide Architecture Details"
      : "View Architecture Details";
  }

  toggleConfigDetails() {
    this.showConfigDetails = !this.showConfigDetails;
  }

  handleRefresh() {
    this.isLoading = true;
    if (this.wiredConfigResult) {
      refreshApex(this.wiredConfigResult).finally(() => {
        this.isLoading = false;
      });
    } else {
      this.isLoading = false;
    }
  }

  handleTriggerAssist() {
    this.dispatchEvent(
      new ShowToastEvent({
        title: "Google Cloud Agent Assist Triggered",
        message: `Synthesizing assistance for ${this.activeContextDescription} using profile [${this.activeProfileName}]`,
        variant: "success"
      })
    );
  }
}
