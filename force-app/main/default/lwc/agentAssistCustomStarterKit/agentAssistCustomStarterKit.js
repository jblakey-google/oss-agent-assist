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

  @track isConnected = false;
  @track statusMessage = "Disconnected - Agent Assist Container component missing from page.";
  @track userMessageInput = "";
  @track agentMessageInput = "";
  @track transcriptLogs = [];

  _connectionTimer;

  get isNotConnected() {
    return !this.isConnected;
  }

  connectedCallback() {
    this.log("AgentAssistCustomStarterKit initialized.");
    this.checkConnectionStatus();
    this.registerAgentAssistEventListeners();

    // Periodically re-check connection status in case container loads asynchronously
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
   * Checks if the Agent Assist Connector (container or companion component) is present on the page.
   */
  checkConnectionStatus() {
    const hasGlobalFunctions =
      typeof addAgentAssistEventListener === "function" ||
      typeof window.addAgentAssistEventListener === "function" ||
      typeof dispatchAgentAssistEvent === "function" ||
      typeof window.dispatchAgentAssistEvent === "function" ||
      !!window._uiModuleEventTarget;

    const hasContainerElement = !!(
      document.querySelector("c-agent-assist-container") ||
      document.querySelector("c-agent-assist-companion-agent") ||
      document.querySelector(".agent-assist-component")
    );

    if (hasGlobalFunctions && hasContainerElement) {
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
      this.isConnected = true;
      this.statusMessage = "Connected to Agent Assist Connector.";
    };

    if (typeof addAgentAssistEventListener === "function") {
      // Connector Lifecycle Events
      addAgentAssistEventListener("api-connector-initialized", (e) => {
        markConnected();
        this.log("📩 EVENT HEARD: 'api-connector-initialized'", e);
      }, { namespace });

      addAgentAssistEventListener("event-based-connector-initialized", (e) => {
        markConnected();
        this.log("📩 EVENT HEARD: 'event-based-connector-initialized'", e);
      }, { namespace });

      addAgentAssistEventListener("event-based-connection-established", (e) => {
        markConnected();
        this.log("📩 EVENT HEARD: 'event-based-connection-established'", e);
      }, { namespace });

      addAgentAssistEventListener("conversation-initialized", (e) => {
        markConnected();
        this.log("📩 EVENT HEARD: 'conversation-initialized'", e);
      }, { namespace });

      // 1. Suggestion Received
      addAgentAssistEventListener(
        "suggestion-received",
        (event) => {
          markConnected();
          this.log("📩 RECEIVED EVENT: 'suggestion-received' Payload:", event);
        },
        { namespace }
      );

      // 2. Transcript Updated
      addAgentAssistEventListener(
        "transcript-updated",
        (event) => {
          markConnected();
          this.log("📩 RECEIVED EVENT: 'transcript-updated' Payload:", event);
        },
        { namespace }
      );
    }
  }

  /**
   * Dispatches an event to the active Agent Assist Connector event bus with full verbose payload logging.
   */
  dispatchCustomEvent(eventName, payload = {}) {
    const detailData = payload.detail ? payload.detail : payload;
    const fullPayload = { detail: detailData };
    const opts = { namespace: this.recordId };

    console.log(
      `[AgentAssistCustomStarterKit] 🚀 DISPATCHING EVENT: '${eventName}'`,
      "\nPayload Object:", fullPayload,
      "\nOptions:", opts
    );

    if (typeof dispatchAgentAssistEvent === "function") {
      dispatchAgentAssistEvent(eventName, fullPayload, opts);
    } else if (typeof window.dispatchAgentAssistEvent === "function") {
      window.dispatchAgentAssistEvent(eventName, fullPayload, opts);
    } else if (
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
      console.warn(
        `[AgentAssistCustomStarterKit] ⚠️ dispatchAgentAssistEvent function unavailable on page when trying to send '${eventName}'.`
      );
    }
  }

  /**
   * Sends an END_USER message turn to Agent Assist for real-time analysis.
   */
  handleSendUserMessage() {
    if (!this.userMessageInput.trim()) return;
    const text = this.userMessageInput.trim();

    this.transcriptLogs = [
      ...this.transcriptLogs,
      { id: Date.now(), sender: "End User", text, isUser: true }
    ];

    const convId = `SF-${this.recordId || Date.now()}`;
    const payload = {
      conversationId: convId,
      participantRole: "END_USER",
      request: {
        textInput: {
          text: text,
          languageCode: "en-US"
        }
      }
    };

    this.dispatchCustomEvent("analyze-content-requested", payload);

    this.userMessageInput = "";
  }

  /**
   * Sends a HUMAN_AGENT response message turn to Agent Assist.
   */
  handleSendAgentMessage() {
    if (!this.agentMessageInput.trim()) return;
    const text = this.agentMessageInput.trim();

    this.transcriptLogs = [
      ...this.transcriptLogs,
      { id: Date.now(), sender: "Human Agent", text, isUser: false }
    ];

    const convId = `SF-${this.recordId || Date.now()}`;
    const payload = {
      conversationId: convId,
      participantRole: "HUMAN_AGENT",
      request: {
        textInput: {
          text: text,
          languageCode: "en-US"
        }
      }
    };

    this.dispatchCustomEvent("analyze-content-requested", payload);

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

  log(...args) {
    if (this.debugMode) {
      console.log("[AgentAssistCustomStarterKit]", ...args);
    }
  }
}
