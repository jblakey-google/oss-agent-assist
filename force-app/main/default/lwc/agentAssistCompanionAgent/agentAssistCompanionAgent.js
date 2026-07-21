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

export default class AgentAssistCompanionAgent extends LightningElement {
  @api recordId;
  @api objectApiName;

  // App Builder Design Property
  @api configName = "Default_Companion";

  // Component Reactive State
  @track resolvedState = {};
  @track isLoading = true;
  @track showConfigDetails = false;
  @track userPrompt = "";
  @track isThinking = false;
  @track messages = [];

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
      this.initWelcomeMessage();
    } else if (error) {
      console.error(
        "Error loading Google Cloud Companion Agent configuration:",
        error
      );
      this.resolvedState = {
        title: "Configuration Error",
        developerName: this.configName || "Default_Companion",
        profileType: "Companion Agent",
        endpointUrl: "https://ui-connector-{id}.{region}.run.app",
        modelName: "gemini-1.5-pro",
        welcomeMessage:
          "Hello! I am your AI Companion Agent. How can I assist you with this record today?",
        enableAutonomousActions: true,
        isFound: false,
        resolutionSource: "Error Loading Configuration"
      };
    }
  }

  initWelcomeMessage() {
    if (this.messages.length === 0 && this.resolvedState?.isFound !== false) {
      const welcome =
        this.resolvedState?.welcomeMessage ||
        "Hello! I am your AI Companion Agent powered by Google Cloud. How can I help you today?";
      this.messages = [
        {
          id: "msg-welcome",
          sender: "companion",
          senderLabel: "Companion AI",
          isCompanion: true,
          rowClass: "chat-msg-row companion-row slds-m-bottom_small",
          badgeLabel: this.resolvedModelName,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }),
          text: welcome,
          hasAction: false
        }
      ];
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
    return this.resolvedState?.title || "Google Cloud Companion Agent";
  }

  get activeProfileName() {
    return (
      this.resolvedState?.name ||
      this.resolvedState?.developerName ||
      this.configName ||
      "Default_Companion"
    );
  }

  get profileTypeLabel() {
    return this.resolvedState?.profileType || "Companion Agent";
  }

  get resolutionSource() {
    return this.resolvedState?.resolutionSource || "Loading Configuration...";
  }

  get resolvedEndpoint() {
    return (
      this.resolvedState?.endpointUrl ||
      "https://ui-connector-{id}.{region}.run.app"
    );
  }

  get resolvedModelName() {
    return this.resolvedState?.modelName || "gemini-1.5-pro";
  }

  get resolvedAutonomousActions() {
    if (
      this.resolvedState &&
      this.resolvedState.enableAutonomousActions !== undefined
    ) {
      return this.resolvedState.enableAutonomousActions;
    }
    return true;
  }

  get autonomousStatusText() {
    return this.resolvedAutonomousActions ? "Enabled" : "Disabled";
  }

  get activeContextDescription() {
    if (this.objectApiName && this.recordId) {
      return `${this.objectApiName} (${this.recordId.substring(0, 8)}...)`;
    }
    return "Global Utility Session";
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

  handlePromptChange(event) {
    this.userPrompt = event.target.value;
  }

  handlePromptKeyDown(event) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      this.handleSendPrompt();
    }
  }

  handleQuickPrompt(event) {
    const promptText = event.currentTarget.dataset.prompt;
    if (promptText) {
      this.userPrompt = promptText;
      this.handleSendPrompt();
    }
  }

  handleSendPrompt() {
    const prompt = (this.userPrompt || "").trim();
    if (!prompt) return;

    const timeStr = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    // Add user message
    const userMsgId = "msg-" + Date.now();
    this.messages = [
      ...this.messages,
      {
        id: userMsgId,
        sender: "user",
        senderLabel: "You (Agent)",
        isCompanion: false,
        rowClass: "chat-msg-row user-row slds-m-bottom_small",
        timestamp: timeStr,
        text: prompt
      }
    ];

    this.userPrompt = "";
    this.isThinking = true;

    // Simulate AI Companion response grounded in current context & model
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(() => {
      this.isThinking = false;
      const companionMsgId = "msg-ai-" + Date.now();

      let replyText = `I analyzed ${this.activeContextDescription} using ${this.resolvedModelName}. `;
      let actionObj = null;

      if (prompt.toLowerCase().includes("summar")) {
        replyText += `Here is a summary of the record activity: Customer requested assistance with account verification and system connectivity. All identity checks passed successfully.`;
        if (this.resolvedAutonomousActions) {
          actionObj = {
            id: "act-" + Date.now(),
            label: "Save Summary to Record Activity",
            isExecuted: false
          };
        }
      } else if (
        prompt.toLowerCase().includes("draft") ||
        prompt.toLowerCase().includes("reply") ||
        prompt.toLowerCase().includes("email")
      ) {
        replyText += `Drafted personalized response:\n"Hello! Thank you for contacting support regarding your account. I have verified your configuration and everything is now active. Please let me know if you need any additional help!"`;
        if (this.resolvedAutonomousActions) {
          actionObj = {
            id: "act-" + Date.now(),
            label: "Copy Response to Active Composer",
            isExecuted: false
          };
        }
      } else if (
        prompt.toLowerCase().includes("next") ||
        prompt.toLowerCase().includes("step")
      ) {
        replyText += `Recommended next steps:\n1. Verify customer contact details\n2. Run automated diagnostics check\n3. Confirm resolution and close ticket.`;
      } else {
        replyText += `I have processed your request for "${prompt}". Relevant CRM context and knowledge base articles have been cross-referenced.`;
        if (this.resolvedAutonomousActions) {
          actionObj = {
            id: "act-" + Date.now(),
            label: "Execute Suggested Action",
            isExecuted: false
          };
        }
      }

      this.messages = [
        ...this.messages,
        {
          id: companionMsgId,
          sender: "companion",
          senderLabel: "Companion AI",
          isCompanion: true,
          rowClass: "chat-msg-row companion-row slds-m-bottom_small",
          badgeLabel: this.resolvedModelName,
          timestamp: new Date().toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit"
          }),
          text: replyText,
          hasAction: !!actionObj,
          action: actionObj
        }
      ];
    }, 450);
  }

  handleExecuteAction(event) {
    const actionId = event.currentTarget.dataset.id;
    this.messages = this.messages.map((msg) => {
      if (msg.action && msg.action.id === actionId) {
        return {
          ...msg,
          action: {
            ...msg.action,
            isExecuted: true
          }
        };
      }
      return msg;
    });

    this.dispatchEvent(
      new ShowToastEvent({
        title: "Autonomous Action Executed",
        message: `Companion Agent completed action on ${this.activeContextDescription}`,
        variant: "success"
      })
    );
  }

  handleClearChat() {
    this.messages = [];
    this.initWelcomeMessage();
  }
}
