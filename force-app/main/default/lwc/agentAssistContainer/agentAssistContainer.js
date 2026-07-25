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

/* global dispatchAgentAssistEvent, addAgentAssistEventListener */

import { LightningElement, api, wire, track } from "lwc";
import { loadScript } from "lightning/platformResourceLoader";
import { getRecord, getFieldValue } from "lightning/uiRecordApi";
import { MessageContext } from "lightning/messageService";
import { refreshApex } from "@salesforce/apex";
import getResolvedConfig from "@salesforce/apex/AgentAssistConfigController.getResolvedConfig";

// Static Resources
import ui_modules from "@salesforce/resourceUrl/ui_modules";

// Platform Services & Config
import BasePlatformService from "./platformServices/BasePlatformService";
import MessagingPlatformService from "./platformServices/MessagingPlatformService";
import TwilioFlexPlatformService from "./platformServices/TwilioFlexPlatformService";
import ServiceCloudVoicePlatformService from "./platformServices/ServiceCloudVoicePlatformService";
import sampleContext from "./data/sampleContext";
import {
  DIALOGFLOW_API_VERSION,
  TOKEN_REFRESH_CHECK_INTERVAL_MS,
  CONTEXT_INJECTION_DELAY_MS
} from "./config";

const VENDOR_CALL_KEY_FIELD = "VoiceCall.VendorCallKey";

// Prevent Zone.js monkey patching for Lightning Web Security (LWS)
window.__Zone_disable_on_property = true;

export default class AgentAssistContainer extends LightningElement {
  @api recordId;
  @api objectApiName;
  @api configName = "Default";

  // Runtime reactive state properties
  @track loadError = null;
  @api conversationId = null;
  @api conversationName = null;
  @track isConversationInitialized = false;
  @track cancelSummarizationTimeout = null;
  @track token = null;
  @track showTranscript = false;
  @track _resolvedState = {};
  @api configOverride;

  get resolvedState() {
    return this.configOverride || this._resolvedState;
  }
  set resolvedState(value) {
    this._resolvedState = value;
  }
  @track isLoading = true;

  get showEmptyState() {
    return (
      !this.isConversationInitialized &&
      !this.loadError &&
      !this.isProfileMissing
    );
  }

  get containerClass() {
    return this.showEmptyState
      ? "agent-assist-container slds-hide"
      : "agent-assist-container";
  }

  get transcriptContainerClass() {
    return this.showEmptyState
      ? "transcript-container hidden slds-hide"
      : "transcript-container hidden";
  }

  platformService = null;
  wiredConfigResult;
  _appliedHeight = null;
  tokenRefreshInterval = null;
  conversationNamePollingInterval = null;

  @wire(MessageContext) messageContext;
  @wire(getRecord, { recordId: "$recordId", fields: ["Contact.Phone"] })
  contact;

  // Getters resolving from Apex configuration profile state
  @api get endpoint() {
    const ep =
      this.resolvedState?.endpointUrl ||
      "https://ui-connector-{id}.{region}.run.app";
    return ep.endsWith("/") ? ep.slice(0, -1) : ep;
  }
  @api get conversationProfile() {
    return (
      this.resolvedState?.conversationProfile ||
      "projects/{project-id}/locations/{location-id}/conversationProfiles/{profile-id}"
    );
  }
  @api get channel() {
    return this.resolvedState?.channel || "chat";
  }
  @api get platform() {
    return this.resolvedState?.platform || "base";
  }
  @api get consumerKey() {
    return this.resolvedState?.consumerKey || "";
  }
  @api get consumerSecret() {
    return this.resolvedState?.consumerSecret || "";
  }
  @api get clientCredentialsUser() {
    return this.resolvedState?.clientCredentialsUser || "";
  }
  @api get containerHeight() {
    return this.resolvedState?.containerHeight || "530px";
  }
  @api get debugMode() {
    return this.resolvedState?.debugMode !== undefined
      ? this.resolvedState.debugMode
      : true;
  }
  @api get showDarkModeToggle() {
    return this.resolvedState?.showDarkModeToggle !== undefined
      ? this.resolvedState.showDarkModeToggle
      : true;
  }
  @api get showHeader() {
    return this.resolvedState?.showHeader !== undefined
      ? this.resolvedState.showHeader
      : false;
  }
  @api get showCorrectnessFeedback() {
    return this.resolvedState?.showCorrectnessFeedback !== undefined
      ? this.resolvedState.showCorrectnessFeedback
      : false;
  }
  @api get disableIntegratedTranscript() {
    return this.resolvedState?.disableIntegratedTranscript !== undefined
      ? this.resolvedState.disableIntegratedTranscript
      : false;
  }

  get voiceCallFields() {
    if (this.objectApiName !== "VoiceCall") {
      return undefined;
    }
    const fields = [VENDOR_CALL_KEY_FIELD];
    if (this.platformService) {
      fields.push(...this.platformService.getVoiceCallFields());
    }
    return fields;
  }

  @wire(getRecord, {
    recordId: "$recordId",
    fields: "$voiceCallFields"
  })
  wiredVoiceCall({ error, data }) {
    if (data) {
      this.voiceCallData = data;
      this.debugLog(`Wired VoiceCall record updated: ${JSON.stringify(data)}`);
      const sessionId = this.sessionId;
      if (sessionId && this.platformService) {
        this.platformService.handleSessionIdUpdated(sessionId);
      }
    } else if (error) {
      this.debugLog(`Error wiring VoiceCall record: ${JSON.stringify(error)}`);
    }
  }

  @api get contactPhone() {
    return getFieldValue(this.contact?.data, "Contact.Phone");
  }
  @api get vendorCallKey() {
    return getFieldValue(this.voiceCallData, VENDOR_CALL_KEY_FIELD);
  }
  @api get sessionId() {
    if (this.platformService) {
      return this.platformService.getSessionId(this.voiceCallData);
    }
    return null;
  }
  @api get projectLocationName() {
    if (
      this.conversationProfile &&
      this.conversationProfile.includes("/conversationProfiles")
    ) {
      return this.conversationProfile.split("/conversationProfiles")[0];
    }
    return "projects/default-project/locations/global";
  }

  get isProfileMissing() {
    return this.resolvedState && this.resolvedState.isFound === false;
  }

  _refreshKey;
  @api
  get refreshKey() {
    return this._refreshKey;
  }
  set refreshKey(value) {
    this._refreshKey = value;
    if (this.wiredConfigResult) {
      refreshApex(this.wiredConfigResult);
    }
  }

  @wire(getResolvedConfig, { configName: "$configName" })
  wiredConfig(result) {
    this.wiredConfigResult = result;
    const { data, error } = result;
    this.isLoading = false;
    if (data) {
      this.resolvedState = data;
      if (data.isFound) {
        this.showTranscript = !this.disableIntegratedTranscript;
      }
    } else if (error) {
      console.error(
        "Error loading Agent Assist Container configuration:",
        error
      );
      const errorMsg =
        error?.body?.message ||
        error?.message ||
        "Access denied to AgentAssistConfigController Apex class.";
      this.loadError = new Error(`Configuration access error: ${errorMsg}`);
      this.resolvedState = { isFound: true };
    }
  }

  connectedCallback() {
    this.debugLog("connectedCallback called");
    if (this.wiredConfigResult) {
      refreshApex(this.wiredConfigResult);
    }
    this.showTranscript = !this.disableIntegratedTranscript;
  }

  @api
  async refreshConfig() {
    if (this.wiredConfigResult) {
      return refreshApex(this.wiredConfigResult);
    }
    return Promise.resolve();
  }

  async renderedCallback() {
    this.debugLog("renderedCallback called");
    if (this.containerHeight !== this._appliedHeight) {
      this.applyHeightOverride();
    }

    try {
      if (
        localStorage.getItem("agent_assist_dark_mode") === "true" ||
        document.body.classList.contains("dark-mode")
      ) {
        const comp = this.template.querySelector(".agent-assist-component");
        comp?.classList.add("dark-mode");
      }
    } catch {
      // ignore
    }

    if (
      this.resolvedState?.isFound &&
      !this.platformService &&
      this.refs.agentAssistContainer
    ) {
      await this.initPlatformService();
    }
  }

  async initPlatformService() {
    this.debugLog("initPlatformService called");
    const refs = {
      conversationToolkitApi: this.refs.conversationToolkitApi,
      serviceCloudVoiceToolkitApi: this.refs.serviceCloudVoiceToolkitApi
    };

    this.debugLog(`Platform: ${this.platform}`);
    if (this.platform === "messaging") {
      this.platformService = new MessagingPlatformService(this, refs);
    } else if (this.platform === "twilioflex") {
      this.platformService = new TwilioFlexPlatformService(this, refs);
    } else if (this.platform && this.platform.includes("servicecloudvoice")) {
      this.platformService = new ServiceCloudVoicePlatformService(this, refs);
    } else if (
      !this.platform ||
      this.platform === "chat" ||
      this.platform === "base" ||
      this.platform === "custom"
    ) {
      this.platformService = new BasePlatformService(this, refs);
    } else {
      this.loadError = new Error(`Unsupported platform: ${this.platform}`);
      this.debugLog(this.loadError.message);
    }

    if (this.platformService && !this.platformService.initialized) {
      this.platformService.initialized = true;

      try {
        this.token = await this.platformService.registerAuthToken();

        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.tokenRefreshInterval = setInterval(async () => {
          if (this.platformService) {
            await this.platformService.checkAndRefreshToken();
          }
        }, TOKEN_REFRESH_CHECK_INTERVAL_MS);

        await this.platformService.checkAndRefreshToken();

        this.debugLog("Loading UI Modules scripts...");
        await loadScript(this, ui_modules + "/transcript.js");
        await loadScript(this, ui_modules + "/container.js");
        await loadScript(this, ui_modules + "/common.js");
        this.debugLog("UI Modules scripts loaded.");

        if (this.debugMode) {
          console.log("agentAssistContainer:");
          console.log(this);
          console.log(`dispatchAgentAssistEvent:`);
          console.log(dispatchAgentAssistEvent);
          console.log("addAgentAssistEventListener");
          console.log(addAgentAssistEventListener);
          this.platformService.initEventDragnet();
        }

        // Initialize Agent Assist UI Modules
        this.platformService.initAgentAssistEvents();

        // Initialize platform service logic
        await this.platformService.init();

        // Wait for a conversationName before initializing UI Modules
        if (!this.conversationName) {
          await this.waitForConversationName();
        } else {
          this.platformService.initUIModules();
        }
      } catch (err) {
        this.loadError = err;
        this.debugLog(`Container init error: ${err.message}`);
      }
    }
  }

  disconnectedCallback() {
    this.debugLog("disconnectedCallback called");

    if (this.platformService) {
      this.platformService.teardown();
    }
    if (this.conversationNamePollingInterval) {
      clearInterval(this.conversationNamePollingInterval);
    }
    if (this.tokenRefreshInterval) {
      clearInterval(this.tokenRefreshInterval);
    }

    // Clears all listeners (_uiModuleEventTarget is not attached to the DOM)
    if (window._uiModuleEventTarget) {
      window._uiModuleEventTarget = window._uiModuleEventTarget.cloneNode(true);
    }
  }

  async waitForConversationName() {
    this.debugLog(`waiting for a conversationName to init UI Modules...`);
    return new Promise((resolve) => {
      // eslint-disable-next-line @lwc/lwc/no-async-operation
      this.conversationNamePollingInterval = setInterval(() => {
        if (this.conversationName) {
          clearInterval(this.conversationNamePollingInterval);
          this.conversationNamePollingInterval = null;
          this.debugLog(`this.conversationId: ${this.conversationId}`);
          this.debugLog(`this.conversationName: ${this.conversationName}`);
          if (this.platformService) {
            this.platformService.initUIModules();
          }
          resolve();
        }
      }, 1000);
    });
  }

  applyHeightOverride() {
    if (!this.containerHeight || isNaN(parseInt(this.containerHeight, 10))) {
      return;
    }
    this.template.host?.style.setProperty(
      "--aa-container-height",
      this.containerHeight
    );
    this._appliedHeight = this.containerHeight;
  }

  @api
  debugLog(message) {
    if (this.debugMode) {
      console.log(
        `%c[AgentAssist]%c ${message}`,
        "background-color: #0070d2; color: #ffffff; padding: 2px 4px; border-radius: 3px; font-weight: bold;",
        ""
      );
    }
  }

  @api
  triggerSummarization() {
    const uiModulesElement = this.template.querySelector(
      "agent-assist-ui-modules-v2"
    );
    if (uiModulesElement) {
      const summarizationButton = uiModulesElement.querySelector(
        '[data-test-id="generate-summary-button"]'
      );
      if (summarizationButton && !summarizationButton.disabled) {
        summarizationButton.dispatchEvent(new CustomEvent("click"));
      }
    }
  }

  @api
  ingestDemoContextReferences() {
    if (!this.platformService || !this.conversationName) return;
    const injectContext = () => {
      let url = `${this.endpoint}/${DIALOGFLOW_API_VERSION}/${this.conversationName}:ingestContextReferences`;
      let body = JSON.stringify({
        contextReferences: {
          context: {
            contextContents: [
              { content: sampleContext, contentFormat: "JSON" }
            ],
            languageCode: "en-us",
            updateMode: "OVERWRITE"
          }
        }
      });
      fetch(url, this.platformService.createRequestOptions("POST", body))
        .then((res) => res.text())
        .then(() => {
          this.debugLog("ingestDemoContextReferences ran successfully");
        })
        .catch((err) => {
          this.debugLog(`ingestDemoContextReferences failed: ${err.message}`);
        });
    };
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(injectContext, CONTEXT_INJECTION_DELAY_MS);
  }
}
