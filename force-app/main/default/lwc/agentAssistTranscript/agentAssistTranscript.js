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
import { loadScript } from "lightning/platformResourceLoader";
import getResolvedConfig from "@salesforce/apex/AgentAssistConfigController.getResolvedConfig";

// Static Resources
import ui_modules from "@salesforce/resourceUrl/ui_modules";

// Prevent Zone.js monkey patching for Lightning Web Security (LWS)
window.__Zone_disable_on_property = true;

export default class AgentAssistTranscript extends LightningElement {
  @api recordId;
  @api objectApiName;
  @api configName = "Default";
  @api containerHeight;

  // Runtime reactive state properties
  @track loadError = null;
  @track resolvedState = {};
  @track isLoading = true;

  _appliedHeight = null;
  _transcriptMounted = false;
  _scriptsLoaded = false;

  get transcriptContainerClass() {
    return "transcript-container";
  }

  get isProfileMissing() {
    return this.resolvedState && this.resolvedState.isFound === false;
  }

  @api get debugMode() {
    return this.resolvedState?.debugMode !== undefined
      ? this.resolvedState.debugMode
      : true;
  }

  get resolvedContainerHeight() {
    return (
      this.containerHeight || this.resolvedState?.containerHeight || "530px"
    );
  }

  @wire(getResolvedConfig, { configName: "$configName" })
  wiredConfig(result) {
    this.wiredConfigResult = result;
    const { data, error } = result;
    this.isLoading = false;
    if (data) {
      this.resolvedState = data;
    } else if (error) {
      console.error(
        "Error loading Agent Assist Transcript configuration:",
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
    this.debugLog("AgentAssistTranscript connectedCallback called");
  }

  async renderedCallback() {
    this.debugLog("AgentAssistTranscript renderedCallback called");

    if (this.resolvedContainerHeight !== this._appliedHeight) {
      this.applyHeightOverride();
    }

    try {
      if (
        localStorage.getItem("agent_assist_dark_mode") === "true" ||
        document.body.classList.contains("dark-mode")
      ) {
        const comp = this.template.querySelector(".agent-assist-component");
        comp?.classList.add("dark-mode");
        const transcriptContainer = this.refs.transcriptContainer;
        transcriptContainer?.classList.add("dark-mode");
      }
    } catch {
      // ignore local storage restrictions
    }

    if (this.resolvedState?.isFound && !this._scriptsLoaded) {
      this._scriptsLoaded = true;
      try {
        this.debugLog("Loading Transcript UI Module scripts...");
        await loadScript(this, ui_modules + "/transcript.js");
        await loadScript(this, ui_modules + "/common.js");
        this.debugLog("Transcript UI Module scripts loaded successfully.");

        this.mountTranscriptModule();
        this.initEventListeners();
      } catch (err) {
        this.loadError = err;
        this.debugLog(`Transcript init error: ${err.message}`);
      }
    }
  }

  mountTranscriptModule() {
    if (this._transcriptMounted) {
      return;
    }
    const transcriptContainerEl = this.refs.agentAssistTranscript;
    if (transcriptContainerEl) {
      // Clear container safely using replaceChildren
      transcriptContainerEl.replaceChildren();
      const transcriptEl = document.createElement("agent-assist-transcript");
      if (this.recordId) {
        transcriptEl.setAttribute("namespace", this.recordId);
      }
      transcriptContainerEl.appendChild(transcriptEl);
      this._transcriptMounted = true;
      this.debugLog("agent-assist-transcript element mounted.");
    }
  }

  initEventListeners() {
    if (typeof window.addAgentAssistEventListener === "function") {
      window.addAgentAssistEventListener(
        "dark-mode-toggled",
        (event) => this.handleDarkModeToggled(event),
        { namespace: this.recordId }
      );
    }
  }

  @api
  handleDarkModeToggled(event) {
    const isDark = !!(event?.detail?.on ?? event?.detail);
    const containerEl = this.refs.transcriptContainer;
    if (containerEl) {
      if (isDark) {
        containerEl.classList.add("dark-mode");
      } else {
        containerEl.classList.remove("dark-mode");
      }
    }
    const componentEl = this.template.querySelector(".agent-assist-component");
    if (componentEl) {
      if (isDark) {
        componentEl.classList.add("dark-mode");
      } else {
        componentEl.classList.remove("dark-mode");
      }
    }
  }

  applyHeightOverride() {
    const height = this.resolvedContainerHeight;
    if (!height || isNaN(parseInt(height, 10))) {
      return;
    }
    this.template.host?.style.setProperty("--aa-container-height", height);
    this._appliedHeight = height;
  }

  disconnectedCallback() {
    this.debugLog("AgentAssistTranscript disconnectedCallback called");

    // Clear event target listeners if window._uiModuleEventTarget exists
    if (window._uiModuleEventTarget) {
      window._uiModuleEventTarget = window._uiModuleEventTarget.cloneNode(true);
    }
  }

  @api
  debugLog(message, ...extra) {
    if (this.debugMode) {
      console.log(
        `%c[AgentAssistTranscript]%c ${message}`,
        "background-color: #0070d2; color: #ffffff; padding: 2px 4px; border-radius: 3px; font-weight: bold;",
        "",
        ...extra
      );
    }
  }
}
