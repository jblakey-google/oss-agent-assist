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
      console.error("Error loading Agent Assist configuration:", error);
      this.resolvedState = {
        title: "Configuration Error",
        developerName: this.configName || "Default",
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
    return this.resolvedState?.title || "Agent Assist";
  }

  get activeProfileName() {
    return (
      this.resolvedState?.name ||
      this.resolvedState?.developerName ||
      this.configName ||
      "Default"
    );
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
        title: "Agent Assist Triggered",
        message: `Synthesizing assistance for ${this.activeContextDescription} using profile [${this.activeProfileName}]`,
        variant: "success"
      })
    );
  }
}
