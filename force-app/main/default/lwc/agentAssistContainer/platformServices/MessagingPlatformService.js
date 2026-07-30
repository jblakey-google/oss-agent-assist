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

/* global addAgentAssistEventListener, dispatchAgentAssistEvent */

import {
  APPLICATION_SCOPE,
  subscribe,
  unsubscribe
} from "lightning/messageService";

import conversationAgentSendChannel from "@salesforce/messageChannel/lightning__conversationAgentSend";
import conversationEndUserMessageChannel from "@salesforce/messageChannel/lightning__conversationEndUserMessage";
import conversationEndedChannel from "@salesforce/messageChannel/lightning__conversationEnded";
import tabClosedChannel from "@salesforce/messageChannel/lightning__tabClosed";

import BasePlatformService from "./BasePlatformService";
import { DIALOGFLOW_API_VERSION } from "../config";

export default class MessagingPlatformService extends BasePlatformService {
  // =============================================================================
  // #region 1. Initialization and Teardown
  // =============================================================================

  subscriptions = [];

  init() {
    // Set up Agent Assist UIM to work with Enhanced Chat
    this.generateConversationName();
    this.subscribeToMessageChannels();
    this.listenToAgentAssistEventsForMessaging();
  }

  teardown() {
    super.teardown();
    if (this.lwc.cancelSummarizationTimeout) {
      clearTimeout(this.lwc.cancelSummarizationTimeout);
    }
    // Clean up Agent Assist UIM Enhanced Chat
    this.unsubscribeFromMessagingChannels();
  }

  // #endregion

  // =============================================================================
  // #region 2. Lightning Message Channel Subscriptions
  // =============================================================================

  listenToAgentAssistEventsForMessaging() {
    // Handle Agent Assist events
    addAgentAssistEventListener(
      "smart-reply-selected",
      (event) =>
        this.handleAgentAssistEventForMessaging("smart-reply-selected", event),
      { namespace: this.lwc.recordId }
    );
    addAgentAssistEventListener(
      "agent-coaching-response-selected",
      (event) =>
        this.handleAgentAssistEventForMessaging(
          "agent-coaching-response-selected",
          event
        ),
      { namespace: this.lwc.recordId }
    );
  }

  subscribeToMessageChannels() {
    // Attach handler functions to Messaging events
    this.subscriptions.push(
      subscribe(
        this.lwc.messageContext,
        conversationAgentSendChannel,
        (event) => this.handleMessageSendForMessaging("HUMAN_AGENT", event),
        { scope: APPLICATION_SCOPE }
      )
    );
    this.subscriptions.push(
      subscribe(
        this.lwc.messageContext,
        conversationEndUserMessageChannel,
        (event) => this.handleMessageSendForMessaging("END_USER", event),
        { scope: APPLICATION_SCOPE }
      )
    );
    this.subscriptions.push(
      subscribe(
        this.lwc.messageContext,
        conversationEndedChannel,
        (event) => this.handleConversationEndedForMessaging(event),
        { scope: APPLICATION_SCOPE }
      )
    );
    this.subscriptions.push(
      subscribe(
        this.lwc.messageContext,
        tabClosedChannel,
        (event) => this.handleTabClosedForMessaging(event),
        { scope: APPLICATION_SCOPE }
      )
    );
  }

  unsubscribeFromMessagingChannels() {
    this.subscriptions.forEach((subscription) => unsubscribe(subscription));
    this.subscriptions = [];
  }

  // #endregion

  // =============================================================================
  // #region 3. Agent Assist Messaging Event Handlers
  // =============================================================================

  handleAgentAssistEventForMessaging(eventName, event) {
    let messageText;
    if (eventName === "smart-reply-selected") {
      messageText =
        event.detail?.answer?.reply ||
        event.detail?.answerRecord?.reply?.text ||
        event.detail?.reply?.text ||
        event.detail?.text;
    } else if (eventName === "agent-coaching-response-selected") {
      messageText =
        event.detail?.selectedResponse ||
        event.detail?.action?.suggestionAnswerRecord?.reply?.text ||
        event.detail?.reply?.text ||
        event.detail?.text;
    }
    if (messageText) {
      this.sendSmartReplyForMessaging(messageText);
    }
  }

  handleMessageSendForMessaging(participantRole, event) {
    if (event.recordId === this.lwc.recordId) {
      if (typeof dispatchAgentAssistEvent === "function") {
        dispatchAgentAssistEvent(
          "analyze-content-requested",
          {
            detail: {
              conversationId: this.lwc.conversationId,
              participantRole: participantRole,
              request: {
                textInput: {
                  text: event.content,
                  languageCode: "us"
                }
              }
            }
          },
          { namespace: this.lwc.recordId }
        );
      }
    }
  }

  handleConversationEndedForMessaging(event) {
    if (event.recordId === this.lwc.recordId || event.tabId) {
      if (typeof dispatchAgentAssistEvent === "function") {
        dispatchAgentAssistEvent(
          "complete-conversation-requested",
          { detail: { conversationName: this.lwc.conversationName } },
          { namespace: this.lwc.recordId }
        );
      }
      this.completeConversationForMessaging();
      if (this.lwc.triggerSummarization) {
        // eslint-disable-next-line @lwc/lwc/no-async-operation
        this.lwc.cancelSummarizationTimeout = setTimeout(
          () => this.lwc.triggerSummarization(),
          1000
        );
      }
    }
  }

  handleTabClosedForMessaging(event) {
    if (this.lwc.cancelSummarizationTimeout) {
      clearTimeout(this.lwc.cancelSummarizationTimeout);
      this.lwc.cancelSummarizationTimeout = null;
    }
  }

  async completeConversationForMessaging() {
    let url = `${this.lwc.endpoint}/${DIALOGFLOW_API_VERSION}/${this.lwc.conversationName}:complete`;
    fetch(url, this.createRequestOptions("POST", JSON.stringify({})))
      .then((res) => res.text())
      .then(() => {
        this.lwc.debugLog("completeConversationForMessaging ran successfully");
      })
      .catch((err) => {
        this.lwc.debugLog(
          `completeConversationForMessaging failed: ${err.message}`
        );
      });
  }

  async sendSmartReplyForMessaging(messageText) {
    const toolkitApi = this.refs.conversationToolkitApi;
    if (toolkitApi && typeof toolkitApi.setAgentInput === "function") {
      toolkitApi.setAgentInput(this.lwc.recordId, { text: messageText });
    } else if (toolkitApi && typeof toolkitApi.sendChat === "function") {
      toolkitApi.sendChat(this.lwc.recordId, messageText);
    }
  }

  // #endregion
}
