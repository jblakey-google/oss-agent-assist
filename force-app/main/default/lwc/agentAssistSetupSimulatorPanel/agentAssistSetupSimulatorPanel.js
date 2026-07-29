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
import { dispatchToast } from "c/agentAssistSetupSharedService";

export default class AgentAssistSetupSimulatorPanel extends LightningElement {
  // =============================================================================
  // #region 1. Reactive Properties and State
  // =============================================================================

  @api profiles = [];
  @api simulatorProfileDevName = "Default";

  @track customerMessage = "";
  @track agentMessage = "";
  @track simulatorConversationId = null;
  @track simulatorConversationName = null;
  @track simulatorRefreshKey = Date.now();
  @track isSimulatorMounted = true;

  // #endregion

  // =============================================================================
  // #region 2. Lifecycle and Event Listeners
  // =============================================================================

  connectedCallback() {
    window.addEventListener(
      "active-conversation-selected",
      this.handleConversationEvent
    );
    window.addEventListener(
      "conversation-initialized",
      this.handleConversationEvent
    );
  }

  disconnectedCallback() {
    window.removeEventListener(
      "active-conversation-selected",
      this.handleConversationEvent
    );
    window.removeEventListener(
      "conversation-initialized",
      this.handleConversationEvent
    );
  }

  handleConversationEvent = (event) => {
    if (event?.detail?.conversationName) {
      this.simulatorConversationName = event.detail.conversationName;
      const parts = event.detail.conversationName.split("/");
      this.simulatorConversationId = parts[parts.length - 1];
    } else if (event?.detail?.conversationId) {
      this.simulatorConversationId = event.detail.conversationId;
    }
  };

  // #endregion

  // =============================================================================
  // #region 3. Getters and Computed Properties
  // =============================================================================

  get simulatorProfileOptions() {
    return (this.profiles || []).map((prof) => {
      const typeStr =
        prof.profileType === "Companion Agent" ? "Companion Agent" : "Container";
      return {
        label: `${prof.name} [${typeStr}] (${prof.developerName})`,
        value: prof.developerName
      };
    });
  }

  get simulatorProfile() {
    const prof =
      (this.profiles || []).find(
        (p) => p.developerName === this.simulatorProfileDevName
      ) || this.profiles[0];
    return prof
      ? { ...prof, profileType: prof.profileType || "Container" }
      : { profileType: "Container" };
  }

  get isSimulatorCompanion() {
    return (
      this.isSimulatorMounted &&
      this.simulatorProfile?.profileType === "Companion Agent"
    );
  }

  get isSimulatorContainer() {
    return this.isSimulatorMounted && !this.isSimulatorCompanion;
  }

  // #endregion

  // =============================================================================
  // #region 4. Event Handlers and Simulator Dispatch
  // =============================================================================

  handleSimulatorProfileChange(event) {
    const devName = event.detail.value;
    this.dispatchEvent(
      new CustomEvent("simulatorprofilechange", { detail: { developerName: devName } })
    );
    this.handleReloadSimulator();
  }

  @api
  handleReloadSimulator(showToast = true) {
    this.simulatorRefreshKey = Date.now();
    const simComp = this.template.querySelector(
      "c-agent-assist-container, c-agent-assist-companion-agent"
    );
    if (simComp && typeof simComp.refreshConfig === "function") {
      simComp.refreshConfig();
    }
    this.isSimulatorMounted = false;
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
      this.isSimulatorMounted = true;
      if (showToast === true) {
        dispatchToast(
          this,
          "Simulator Reloaded",
          `Re-mounted "${this.simulatorProfileDevName}" component in simulator.`,
          "success"
        );
      }
    }, 50);
  }

  handleCustomerMessageChange(event) {
    this.customerMessage = event.target.value;
  }

  handleAgentMessageChange(event) {
    this.agentMessage = event.target.value;
  }

  handleSendCustomerMessage() {
    if (!this.customerMessage) return;
    this.sendSimulatedMessage("END_USER", this.customerMessage);
    this.customerMessage = "";
  }

  handleSendAgentMessage() {
    if (!this.agentMessage) return;
    this.sendSimulatedMessage("HUMAN_AGENT", this.agentMessage);
    this.agentMessage = "";
  }

  handleCustomerKeyUp(event) {
    if (event.key === "Enter") {
      this.handleSendCustomerMessage();
    }
  }

  handleAgentKeyUp(event) {
    if (event.key === "Enter") {
      this.handleSendAgentMessage();
    }
  }

  sendSimulatedMessage(participantRole, text) {
    if (!text || !text.trim()) return;
    const containerEl = this.template.querySelector(
      "c-agent-assist-container, c-agent-assist-companion-agent"
    );
    let convId = this.simulatorConversationId;
    if (!convId && containerEl?.conversationId) {
      convId = containerEl.conversationId;
    }
    if (!convId && containerEl?.conversationName) {
      const parts = containerEl.conversationName.split("/");
      convId = parts[parts.length - 1];
    }

    const payload = {
      detail: {
        conversationId: convId || null,
        participantRole: participantRole,
        request: {
          textInput: {
            text: text.trim(),
            languageCode: "us"
          }
        }
      }
    };

    if (typeof window.dispatchAgentAssistEvent === "function") {
      window.dispatchAgentAssistEvent("analyze-content-requested", payload);
    } else {
      window.dispatchEvent(new CustomEvent("analyze-content-requested", payload));
    }
  }

  // #endregion
}
