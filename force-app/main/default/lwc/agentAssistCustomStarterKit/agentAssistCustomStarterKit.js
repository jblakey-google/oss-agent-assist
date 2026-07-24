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

  @track statusMessage = "Connected to Agent Assist Connector.";
  @track userMessageInput = "";
  @track agentMessageInput = "";
  @track transcriptLogs = [];

  connectedCallback() {
    this.log("AgentAssistCustomStarterKit connected to Agent Assist Connector.");
    this.registerAgentAssistEventListeners();
  }

  /**
   * Registers event listeners on the active Agent Assist Connector event bus.
   */
  registerAgentAssistEventListeners() {
    const namespace = this.recordId;

    if (typeof addAgentAssistEventListener === "function") {
      // 1. Suggestion Received
      addAgentAssistEventListener(
        "suggestion-received",
        (event) => {
          this.log("Received 'suggestion-received' event:", event);
        },
        { namespace }
      );

      // 2. Transcript Updated
      addAgentAssistEventListener(
        "transcript-updated",
        (event) => {
          this.log("Received 'transcript-updated' event:", event);
        },
        { namespace }
      );
    }
  }

  /**
   * Dispatches an event to the active Agent Assist Connector event bus.
   */
  dispatchCustomEvent(eventName, payload = {}) {
    const detailData = payload.detail ? payload.detail : payload;
    const fullPayload = { detail: detailData };
    const opts = { namespace: this.recordId };

    this.log(`Dispatching Agent Assist Event '${eventName}':`, fullPayload);

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
      console.warn("dispatchAgentAssistEvent function unavailable on page.");
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
    this.dispatchCustomEvent("analyze-content-requested", {
      conversationId: convId,
      participantRole: "END_USER",
      request: {
        textInput: {
          text: text,
          languageCode: "en-US"
        }
      }
    });

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
    this.dispatchCustomEvent("analyze-content-requested", {
      conversationId: convId,
      participantRole: "HUMAN_AGENT",
      request: {
        textInput: {
          text: text,
          languageCode: "en-US"
        }
      }
    });

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
