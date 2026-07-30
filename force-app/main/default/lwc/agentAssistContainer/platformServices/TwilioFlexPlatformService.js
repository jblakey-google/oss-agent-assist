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

/* global addAgentAssistEventListener */

import BasePlatformService from "./BasePlatformService";

export default class TwilioFlexPlatformService extends BasePlatformService {
  // =============================================================================
  // #region 1. Initialization and Teardown
  // =============================================================================

  pollingTimeout = null;

  constructor(lwc, refs) {
    super(lwc, refs);
    this.handleConversationEndedForTwilioFlex =
      this.handleConversationEndedForTwilioFlex.bind(this);
  }

  async init() {
    // Set up Agent Assist UIM to work with Twilio Flex
    this.lwc.debugLog("initTwilioFlex called");
    this.lwc.conversationName = await this.fetchConversationName(
      this.lwc.contactPhone
    );
    if (
      !this.lwc.conversationName ||
      (await this.isConversationCompleted(this.lwc.contactPhone))
    ) {
      this.pollForConversationNameByIntegrationKey(this.lwc.contactPhone);
    }
    this.listenToAgentAssistEventsForTwilioFlex();
  }

  teardown() {
    // Clean up Agent Assist UIM Twilio Flex
    super.teardown();
    if (this.pollingTimeout) {
      clearTimeout(this.pollingTimeout);
    }
  }

  // #endregion

  // =============================================================================
  // #region 2. Twilio Flex Event Listeners and Handlers
  // =============================================================================

  listenToAgentAssistEventsForTwilioFlex() {
    this.lwc.debugLog("listenToAgentAssistEventsForTwilioFlex called");
    // Handle Agent Assist events
    addAgentAssistEventListener(
      "conversation-completed",
      this.handleConversationEndedForTwilioFlex,
      { namespace: this.lwc.recordId }
    );
  }

  handleConversationEndedForTwilioFlex() {
    // Generate a summary when a Twilio Flex conversation ends
    this.lwc.debugLog("handleConversationEndedForTwilioFlex called");
    this.lwc.triggerSummarization();
    this.pollForConversationNameByIntegrationKey(this.lwc.contactPhone);
  }

  // #endregion
}
