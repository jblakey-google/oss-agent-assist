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

import { LightningElement, api, track } from "lwc";

/* global dispatchAgentAssistEvent, addAgentAssistEventListener */

/**
 * AgentAssistCustomStarterKit
 *
 * Starter kit LWC component demonstrating how developers can develop a custom
 * chat integration by subscribing to incoming message events from a third-party
 * chat provider and dispatching Agent Assist events (`analyze-content-requested`)
 * to the Agent Assist Connector in their own LWC.
 *
 * NOTE: To use this component, ensure an `agentAssistContainer` or `agentAssistCompanionAgent`
 * component is placed on the same Lightning page to instantiate the Agent Assist Connector.
 *
 * Documentation:
 * - UI Modules Overview: https://docs.cloud.google.com/agent-assist/docs/ui-modules
 * - Events Reference: https://docs.cloud.google.com/agent-assist/docs/ui-modules-events-documentation#AnalyzeContentRequested
 */
export default class AgentAssistCustomStarterKit extends LightningElement {
  @api recordId;
  @api configName = "Default";
  @api debugMode = false;

  get isDebugEnabled() {
    return this.debugMode === true || this.debugMode === "true";
  }

  @track isConnected = false;
  @track statusMessage = "Disconnected - Agent Assist Container component missing from page.";
  @track userMessageInput = "";
  @track agentMessageInput = "";
  @track transcriptLogs = [];

  _connectionTimer;
  _eventConnectionReceived = false;

  get isNotConnected() {
    return !this.isConnected;
  }

  connectedCallback() {
    this.debugLog("AgentAssistCustomStarterKit initialized.");
    this.checkConnectionStatus();
    this.registerAgentAssistEventListeners();

    // Periodically re-check connection status in case container loads asynchronously
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    this._connectionTimer = setInterval(() => {
      this.checkConnectionStatus();
    }, 2000);
  }

  disconnectedCallback() {
    if (this._connectionTimer) {
      clearInterval(this._connectionTimer);
    }
  }

  /**
   * Pings the Agent Assist Connector by requesting conversation profile.
   * If an active Agent Assist Connector is present, it will respond with conversation-profile-received.
   */
  pingConnector() {
    this.dispatchCustomEvent("conversation-profile-requested", {});
  }

  /**
   * Checks if the Agent Assist Connector (container, companion, or transcript component) is present on the page.
   */
  checkConnectionStatus() {
    /* eslint-disable @lwc/lwc/no-document-query */
    const tags = [
      "c-agent-assist-container",
      "c-agent-assist-companion-agent",
      "c-agent-assist-transcript"
    ];
    const hasContainerElement = tags.some(
      (tag) =>
        document.querySelector(tag) ||
        (document.getElementsByTagName && document.getElementsByTagName(tag)?.length > 0)
    );
    /* eslint-enable @lwc/lwc/no-document-query */

    // Ping the Agent Assist Connector via conversation-profile-requested
    this.pingConnector();

    if (hasContainerElement || this._eventConnectionReceived) {
      if (!this.isConnected) {
        this.isConnected = true;
        this.statusMessage = "Connected to Agent Assist Connector.";
      }
    } else {
      if (this.isConnected) {
        this.isConnected = false;
        this.statusMessage =
          "Disconnected - Agent Assist Container component missing from page.";
      }
    }
  }

  /**
   * Registers event listeners on the active Agent Assist Connector event bus.
   */
  registerAgentAssistEventListeners() {
    const namespace = this.recordId;

    const markConnected = () => {
      this._eventConnectionReceived = true;
      if (!this.isConnected) {
        this.isConnected = true;
        this.statusMessage = "Connected to Agent Assist Connector.";
      }
    };

    const events = [
      "api-connector-initialized",
      "event-based-connector-initialized",
      "event-based-connection-established",
      "live-person-connector-initialized",
      "genesys-cloud-connector-initialized",
      "conversation-initialized",
      "suggestion-received",
      "transcript-updated"
    ];

    const addListenerFn =
      typeof addAgentAssistEventListener === "function"
        ? addAgentAssistEventListener
        : (typeof window !== "undefined" && typeof window.addAgentAssistEventListener === "function")
          ? window.addAgentAssistEventListener
          : null;

    const handleEvent = (evtName, e) => {
      markConnected();
      this.debugLog(`📩 EVENT HEARD: '${evtName}'`, e);
    };

    if (addListenerFn) {
      events.forEach((evtName) => {
        addListenerFn(evtName, (e) => handleEvent(evtName, e), { namespace });
      });
    }

    if (
      typeof window !== "undefined" &&
      window._uiModuleEventTarget &&
      typeof window._uiModuleEventTarget.addEventListener === "function"
    ) {
      events.forEach((evtName) => {
        window._uiModuleEventTarget.addEventListener(evtName, (e) => handleEvent(evtName, e));
      });
    }
  }

  /**
   * Dispatches an event to the active Agent Assist Connector event bus with full verbose payload logging.
   */
  dispatchCustomEvent(eventName, payload = {}) {
    const detailData = payload.detail ? payload.detail : payload;
    const fullPayload = { detail: detailData };
    const opts = { namespace: this.recordId };

    this.debugLog(
      `🚀 DISPATCHING EVENT: '${eventName}'`,
      "\nPayload Object:",
      fullPayload,
      "\nOptions:",
      opts
    );

    if (typeof dispatchAgentAssistEvent === "function") {
      dispatchAgentAssistEvent(eventName, fullPayload, opts);
    } else if (typeof window !== "undefined" && typeof window.dispatchAgentAssistEvent === "function") {
      window.dispatchAgentAssistEvent(eventName, fullPayload, opts);
    } else if (
      typeof window !== "undefined" &&
      window._uiModuleEventTarget &&
      typeof window._uiModuleEventTarget.dispatchEvent === "function"
    ) {
      const event = new CustomEvent(eventName, {
        detail: { ...detailData, namespace: this.recordId },
        bubbles: true,
        composed: true
      });
      window._uiModuleEventTarget.dispatchEvent(event);
    } else {
      this.debugLog(
        `⚠️ dispatchAgentAssistEvent function unavailable on page when trying to send '${eventName}'.`
      );
    }
  }

  _sendTurn(text, participantRole, sender, isUser) {
    if (!text || !text.trim()) return;
    const cleanText = text.trim();

    this.transcriptLogs = [
      ...this.transcriptLogs,
      { id: Date.now(), sender, text: cleanText, isUser }
    ];

    const convId = `SF-${this.recordId || Date.now()}`;
    this.dispatchCustomEvent("analyze-content-requested", {
      conversationId: convId,
      participantRole,
      request: {
        textInput: {
          text: cleanText,
          languageCode: "en-US"
        }
      }
    });
  }

  /**
   * Sends an END_USER message turn to Agent Assist for real-time analysis.
   */
  handleSendUserMessage() {
    this._sendTurn(this.userMessageInput, "END_USER", "End User", true);
    this.userMessageInput = "";
  }

  /**
   * Sends a HUMAN_AGENT response message turn to Agent Assist.
   */
  handleSendAgentMessage() {
    this._sendTurn(this.agentMessageInput, "HUMAN_AGENT", "Human Agent", false);
    this.agentMessageInput = "";
  }

  handleUserInputChange(event) {
    this.userMessageInput = event.target.value;
  }

  handleUserInputKeyUp(event) {
    this.userMessageInput = event.target.value;
    if (event.key === "Enter") {
      this.handleSendUserMessage();
    }
  }

  handleAgentInputChange(event) {
    this.agentMessageInput = event.target.value;
  }

  handleAgentInputKeyUp(event) {
    this.agentMessageInput = event.target.value;
    if (event.key === "Enter") {
      this.handleSendAgentMessage();
    }
  }

  debugLog(message, ...extra) {
    if (this.isDebugEnabled) {
      console.log(
        `%c[AgentAssistCustomStarterKit]%c ${message}`,
        "background-color: #0070d2; color: #ffffff; padding: 2px 4px; border-radius: 3px; font-weight: bold;",
        "",
        ...extra
      );
    }
  }
}
