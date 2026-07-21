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

import agentAssistEventNames from "../data/agentAssistEventNames";
import sampleContext from "../data/sampleContext";
import {
  DIALOGFLOW_API_VERSION,
  TOKEN_EXPIRATION_THRESHOLD_SEC,
  TOKEN_WAIT_INTERVAL_MS,
  TOKEN_HEALTHY_LOG_INTERVAL_MS,
  POLL_MAX_RETRIES,
  POLL_INITIAL_DELAY_MS,
  POLL_DELAY_INCREMENT_MS
} from "../config";

let lastTokenHealthyLogTimeMs = 0;

export default class BasePlatformService {
  lwc;
  refs = {};
  uiModulesInitialized = false;

  constructor(lwc, refs = {}) {
    this.lwc = lwc;
    this.refs = refs;
  }

  generateConversationName() {
    // Generate a Dialogflow conversation name.
    // Works when the Dialogflow conversation isn't created outside SF.
    let prefix = this.lwc.projectLocationName;
    this.lwc.conversationId = `SF-${this.lwc.recordId || Date.now()}`;
    this.lwc.conversationName = `${prefix}/conversations/${this.lwc.conversationId}`;
    this.lwc.debugLog(
      `this.lwc.conversationName - ${this.lwc.conversationName}`
    );
  }

  init() {
    // Base initialization logic for chat using raw api connector calls
    if (!this.lwc.conversationName) {
      this.generateConversationName();
    }
  }

  handleSessionIdUpdated(sessionId) {
    // Base hook for sessionId updates, can be overridden by subclasses
  }

  getVoiceCallFields() {
    return [];
  }

  getSessionId(voiceCallData) {
    return null;
  }

  teardown() {
    // Base teardown logic, can be overridden by subclasses
    this.uiModulesInitialized = false;
    if (this.pollController) {
      this.pollController.abort();
      this.pollController = null;
    }
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // AUTH & INIT UI MODULES
  ////////////////////////////////////////////////////////////////////////////

  async registerAuthToken() {
    try {
      this.lwc.debugLog(
        "Requesting UI Connector JWT token via secure Apex callout..."
      );
      const result = await registerAuthTokenApex({
        configName: this.lwc.configName || "Default",
        endpointUrl: this.lwc.endpoint || "",
        consumerKey: this.lwc.consumerKey || "",
        consumerSecret: this.lwc.consumerSecret || "",
        clientCredentialsUser: this.lwc.clientCredentialsUser || ""
      });

      if (result && result.token) {
        this.lwc.debugLog(
          "UI Modules JWT Token successfully retrieved via Apex callout."
        );
        return result.token;
      } else if (result && result.error) {
        console.error("Apex registerAuthToken error:", result.error);
        this.lwc.loadError = new Error(result.error);
      }
    } catch (err) {
      console.error("Failed to execute Apex registerAuthToken callout:", err);
      this.lwc.loadError = err;
    }

    // Direct browser fetch fallback (for local test/mock environments or if Apex callout is unconfigured)
    if (typeof fetch === "undefined") {
      return null;
    }

    const tokenParams = {
      grant_type: "client_credentials",
      client_id: this.lwc.consumerKey,
      client_secret: this.lwc.consumerSecret
    };
    if (this.lwc.clientCredentialsUser) {
      tokenParams.client_credentials_user = this.lwc.clientCredentialsUser;
      tokenParams.username = this.lwc.clientCredentialsUser;
    }

    try {
      const access_token = await fetch(
        `/services/oauth2/token?` + new URLSearchParams(tokenParams)
      )
        .then((res) => {
          if (!res.ok)
            throw new Error(`OAuth token request failed: ${res.statusText}`);
          return res.json();
        })
        .then((data) => data.access_token)
        .catch((err) => {
          console.error("Failed to register auth token:", err);
          this.lwc.loadError = err;
          return null;
        });

      if (!access_token) {
        return null;
      }

      return await fetch(`${this.lwc.endpoint}/register`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${access_token}`
        }
      })
        .then((res) => {
          if (!res.ok)
            throw new Error(
              `UI Connector registration failed: ${res.statusText}`
            );
          return res.json();
        })
        .then((data) => {
          this.lwc.debugLog(`UI Modules JWT Token successfully retrieved.`);
          return data.token;
        })
        .catch((err) => {
          console.error("Failed to get UI Connector token:", err);
          this.lwc.loadError = err;
          return null;
        });
    } catch (fallbackErr) {
      return null;
    }
  }

  async checkAndRefreshToken() {
    try {
      if (!this.lwc.token) return;
      const payloadBase64Url = this.lwc.token.split(".")[1];
      const base64 = payloadBase64Url.replace(/-/g, "+").replace(/_/g, "/");
      const binaryString = atob(base64);

      const bytes = new Uint8Array(binaryString.length);
      for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }

      const jsonPayload = new TextDecoder().decode(bytes);
      const payload = JSON.parse(jsonPayload);

      if (payload && payload.exp) {
        const currentTimeSec = Math.floor(Date.now() / 1000);
        const timeUntilExpSec = payload.exp - currentTimeSec;

        // Refresh if token is within 1 minute (60s) of expiring
        if (timeUntilExpSec < TOKEN_EXPIRATION_THRESHOLD_SEC) {
          this.lwc.debugLog(
            `Token is expiring in ${timeUntilExpSec}s (threshold ${TOKEN_EXPIRATION_THRESHOLD_SEC}s). Refreshing...`
          );
          this.lwc.token = await this.registerAuthToken();
          if (this.connector) {
            this.connector.setAuthToken(this.lwc.token);
            this.lwc.debugLog(
              "Auth token successfully updated on UiModulesConnector instance."
            );
          }
        } else {
          const currentTimeMs = Date.now();
          if (
            currentTimeMs - lastTokenHealthyLogTimeMs >=
            TOKEN_HEALTHY_LOG_INTERVAL_MS
          ) {
            this.lwc.debugLog(
              `Token is healthy. Expires in ${timeUntilExpSec}s.`
            );
            lastTokenHealthyLogTimeMs = currentTimeMs;
          }
        }
      }
    } catch (err) {
      this.lwc.debugLog(
        `Failed to dynamically verify token expiration: ${err.message}.`
      );
    }
  }

  initUIModules() {
    this.lwc.debugLog("initUIModules called");
    if (this.uiModulesInitialized) {
      this.lwc.debugLog(
        "UI Modules already initialized. Ignoring duplicate init request."
      );
      return;
    }
    this.uiModulesInitialized = true;

    // Clear DOM containers to ensure pristine, duplicate-free visual mount states
    const uiModulesWrapperEl = this.lwc.refs.agentAssistContainer;
    if (uiModulesWrapperEl) {
      uiModulesWrapperEl.innerHTML = "";
    }

    // Create Transcript UI Module.
    if (this.lwc.showTranscript) {
      const transcriptContainerEl = this.lwc.refs.agentAssistTranscript;
      if (transcriptContainerEl) {
        transcriptContainerEl.innerHTML = "";
        const transcriptEl = document.createElement("agent-assist-transcript");
        if (this.lwc.recordId) {
          transcriptEl.setAttribute("namespace", this.lwc.recordId);
        }
        transcriptContainerEl.appendChild(transcriptEl);
      }
    }

    // Create Container UI Module element.
    const containerEl = document.createElement("agent-assist-ui-modules-v2");
    containerEl.generalConfig = { clipboardMode: "EVENT_ONLY" };
    containerEl.classList.add("agent-assist-ui-modules");

    // Required attributes for UI Modules
    containerEl.setAttribute("use-configured-features", true);
    if (this.lwc.recordId) {
      containerEl.setAttribute("namespace", this.lwc.recordId);
    }

    // Optional attributes for UI Modules
    containerEl.setAttribute(
      "show-dark-mode-toggle",
      this.lwc.showDarkModeToggle
    );
    containerEl.setAttribute("show-header", this.lwc.showHeader);
    containerEl.setAttribute(
      "show-correctness-feedback",
      this.lwc.showCorrectnessFeedback
    );

    // Create the UI Modules Connector.
    this.connector = new UiModulesConnector();
    const config = {
      // Basic config
      channel: this.lwc.channel,
      agentDesktop: "Custom",
      conversationProfileName: this.lwc.conversationProfile,

      // Connector options
      apiConfig: {
        authToken: this.lwc.token,
        customApiEndpoint: this.lwc.endpoint
      },
      eventBasedConfig: {
        notifierServerEndpoint: this.lwc.endpoint,
        library: "SocketIo"
      },

      // Salesforce specific config
      uiModuleEventOptions: {
        namespace: this.lwc.recordId
      },
      omitScriptNonce: true
    };

    // Initialize the UI Modules
    if (this.lwc.conversationName) {
      uiModulesWrapperEl.appendChild(containerEl);
      this.connector.init(config);
      if (this.lwc.debugMode) {
        this.lwc.debugLog("UiModulesConnector initialized with config:");
        console.log(config);
      }

      // Check if Dark Mode is (still) on from another UIM instance
      if (document.body.classList.contains("dark-mode")) {
        this.handleDarkModeToggled({ detail: { on: true } });
      }

      // Make the UI Modules visible
      uiModulesWrapperEl.classList.remove("hidden");
      if (this.lwc.showTranscript) {
        const transcriptContainerEl = this.lwc.refs.transcriptContainer;
        transcriptContainerEl.classList.remove("hidden");
      }
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // GENERATE CONVERSATION NAME OR FETCH ONE FROM UI CONNECTOR
  ////////////////////////////////////////////////////////////////////////////

  createRequestOptions(method, body = null) {
    // Construct fetch authed request options object
    const options = {
      method: method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `${this.lwc.token}`
      }
    };
    if (body) options.body = body;
    return options;
  }

  ////////////////////////////////////////////////////////////////////////////
  // HANDLE UI MODULE EVENTS
  ////////////////////////////////////////////////////////////////////////////

  initAgentAssistEvents() {
    this.lwc.debugLog("initAgentAssistEvents called");
    if (typeof addAgentAssistEventListener !== "function") {
      return;
    }
    // Add event listeners for Agent Assist UI Modules events.
    if (this.lwc.channel === "chat") {
      this.lwc.debugLog("initAgentAssistEvents - this.lwc.channel is 'chat'");
      addAgentAssistEventListener(
        "api-connector-initialized",
        async () => await this.handleConnectorInitialized(),
        { namespace: this.lwc.recordId }
      );
    } else if (this.lwc.channel === "voice") {
      this.lwc.debugLog("initAgentAssistEvents - this.lwc.channel is 'voice'");
      addAgentAssistEventListener(
        "event-based-connector-initialized",
        async () => await this.handleConnectorInitialized(),
        { namespace: this.lwc.recordId }
      );
    }
    addAgentAssistEventListener(
      "copy-to-clipboard",
      (event) => this.handleCopyToClipboard(event),
      { namespace: this.lwc.recordId }
    );
    addAgentAssistEventListener(
      "dark-mode-toggled",
      (event) => this.handleDarkModeToggled(event),
      { namespace: this.lwc.recordId }
    );
  }

  async handleConnectorInitialized() {
    this.lwc.debugLog("handleConnectorInitialized called");

    // Ensure we have a token before proceeding.
    this.lwc.debugLog("waiting for ui connector token...");
    while (!this.lwc.token) {
      await new Promise((resolve) =>
        setTimeout(resolve, TOKEN_WAIT_INTERVAL_MS)
      );
    }
    this.lwc.debugLog(`ui connector token: ${this.lwc.token}`);

    // Poll until Dialogflow confirms the existence of the conversationName.
    if (this.lwc.channel !== "chat") {
      await this.pollDialogflowForConversationExistence();
    }

    // Set the active conversation for UIM on connector initialization.
    if (typeof dispatchAgentAssistEvent === "function") {
      dispatchAgentAssistEvent(
        "active-conversation-selected",
        { detail: { conversationName: this.lwc.conversationName } },
        { namespace: this.lwc.recordId }
      );
    }
  }

  async pollDialogflowForConversationExistence(
    maxRetries = POLL_MAX_RETRIES,
    initialDelay = POLL_INITIAL_DELAY_MS
  ) {
    // Poll for this.conversationName until Dialogflow confirms it exists.
    let delayMs = initialDelay;
    for (let i = 0; i < maxRetries; i++) {
      try {
        const response = await fetch(
          `${this.lwc.endpoint}/${DIALOGFLOW_API_VERSION}/${this.lwc.conversationName}`,
          this.createRequestOptions("GET")
        );
        this.lwc.debugLog(
          `pollDialogflowForConversationExistence: ${response.status}...`
        );
        if (response.ok) return true; // Conversation exists, exit polling
        await new Promise((resolve) => setTimeout(resolve, delayMs));
        delayMs += POLL_DELAY_INCREMENT_MS;
      } catch (error) {
        this.lwc.debugLog(
          `pollDialogflowForConversationExistence - error: ${error}`
        );
      }
    }
    this.lwc.debugLog(
      `pollDialogflowForConversationExistence - failed ${maxRetries} times`
    );
    return false;
  }

  async fetchConversationName(
    conversationIntegrationKey,
    timeout = 5000,
    parentSignal = null
  ) {
    // Gets conversationName from Redis using conversationIntegrationKey.
    // Presence intended to trigger UI Module init for CTI add-on based integrations.
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeout);

    if (parentSignal?.aborted) {
      controller.abort();
    }

    const onParentAbort = () => controller.abort();
    if (parentSignal) {
      parentSignal.addEventListener("abort", onParentAbort);
    }

    try {
      const response = await fetch(
        `${this.lwc.endpoint}/conversation-name?conversationIntegrationKey=${conversationIntegrationKey}`,
        { ...this.createRequestOptions("GET"), signal: controller.signal }
      );

      if (response?.ok) {
        const data = await response.json();
        return data.conversationName;
      } else if (response && response.status !== 404) {
        this.lwc.debugLog(
          `Error fetching conversation name: ${response.status} ${response.statusText}`
        );
      }
    } catch (error) {
      if (error.name === "AbortError") {
        // Re-throw the abort error so the poller can catch it and stop.
        throw error;
      } else {
        this.lwc.debugLog(
          `Network error fetching conversation name: ${error.code || error.name} - ${error.message}`
        );
      }
    } finally {
      clearTimeout(timeoutId);
      if (parentSignal) {
        parentSignal.removeEventListener("abort", onParentAbort);
      }
    }
    return null;
  }

  async pollForConversationNameByIntegrationKey(
    conversationIntegrationKey,
    { initialDelay = 1000, maxDelay = 10000, requestTimeoutMs = 9900 } = {}
  ) {
    // Poll continuously for a conversationName with a backoff.
    // It starts polling rapidly, then cools down to a 10-second interval.
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
      this.pollingTimeout = null;
    }
    if (this.pollController) {
      this.pollController.abort();
    }
    this.pollController = new AbortController();
    const signal = this.pollController.signal;

    this.lwc.conversationName = undefined;
    let attempt = 0;

    const poll = async (delayMs) => {
      if (signal.aborted) return;
      attempt++;
      this.lwc.debugLog(
        `Polling for conversationName... (attempt ${attempt}, delay: ${delayMs}ms)`
      );

      try {
        this.lwc.conversationName = await this.fetchConversationName(
          conversationIntegrationKey,
          requestTimeoutMs,
          signal
        );
      } catch (error) {
        if (error.name === "AbortError") {
          this.lwc.debugLog("Polling loop aborted.");
          return;
        }
        this.lwc.debugLog(`Polling encountered error: ${error.message}`);
      }

      if (signal.aborted) return;

      if (
        this.lwc.conversationName &&
        !(await this.isConversationCompleted(conversationIntegrationKey))
      ) {
        this.lwc.debugLog(
          `Found conversationName: ${this.lwc.conversationName}. Initializing UI Modules.`
        );
        this.handleConnectorInitialized();
        this.initUIModules();
        return; // Stop polling on success
      } else {
        this.lwc.debugLog("Conversation not found or already completed.");
      }

      // Calculate the next delay with a linear increase, capped at maxDelay.
      // This reaches maxDelay in ~10 attempts.
      const increment = (maxDelay - initialDelay) / 10;
      const nextDelay = Math.min(maxDelay, delayMs + increment);

      // Schedule the next poll.
      this.pollingTimeout = setTimeout(() => poll(nextDelay), delayMs);
    };

    poll(initialDelay);
  }

  async deleteConversationName(conversationIntegrationKey) {
    // Deletes conversationIntegrationKey:conversationName pair from Redis.
    return await fetch(
      this.lwc.endpoint +
        "/conversation-name?conversationIntegrationKey=" +
        conversationIntegrationKey,
      this.createRequestOptions("DELETE")
    )
      .then((res) => this.lwc.debugLog(`deleteConversationName: ${res.status}`))
      .catch((err) => console.error(err));
  }

  async fetchConversationLifecycleState() {
    return await fetch(
      `${this.lwc.endpoint}/${DIALOGFLOW_API_VERSION}/${this.lwc.conversationName}`,
      this.createRequestOptions("GET")
    )
      .then((res) => res.json())
      .then((conversation) => conversation.lifecycleState);
  }

  async handleCopyToClipboard(event) {
    // Handle copy to clipboard event from UI Modules.
    navigator.clipboard.writeText(event.detail.textToCopy);
  }

  handleDarkModeToggled(event) {
    // Toggle dark mode for the transcript container.
    if (event.detail.on) {
      this.lwc.refs.transcriptContainer.classList.add("dark-mode");
    } else {
      this.lwc.refs.transcriptContainer.classList.remove("dark-mode");
    }
  }

  async isConversationCompleted(conversationIntegrationKey) {
    // Checks if this.conversationName is COMPLETED.
    const lifecycleState = await this.fetchConversationLifecycleState();
    if (lifecycleState === "COMPLETED") {
      this.lwc.debugLog(`conversation COMPLETED, deleting key from redis.`);
      this.deleteConversationName(conversationIntegrationKey);
      return true;
    }
    return false;
  }

  ////////////////////////////////////////////////////////////////////////////
  // DEBUG & DEMO
  ////////////////////////////////////////////////////////////////////////////

  initEventDragnet() {
    if (typeof addAgentAssistEventListener !== "function") {
      return;
    }
    // A debug utility to listen for and log every Agent Assist event type.
    this.lwc.debugLog(
      `InitEventDragnet - listening for ${agentAssistEventNames.length} event types...`
    );
    agentAssistEventNames.forEach((eventName) => {
      // this.lwc.debugLog(`initEventDragnet - listening for ${eventName}`);
      try {
        addAgentAssistEventListener(
          eventName,
          (event) => {
            this.lwc.debugLog(`initEventDragnet - heard: ${event.type}`);
            if (event.detail) {
              console.log(event.detail);
            }
          },
          { namespace: this.lwc.recordId }
        );
      } catch (error) {
        console.error(error);
      }
    });
  }
}
