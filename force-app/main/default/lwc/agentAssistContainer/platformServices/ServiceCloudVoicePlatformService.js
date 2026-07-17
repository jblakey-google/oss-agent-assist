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

import scvEventNames from "../data/scvEventNames";
import BasePlatformService from "./BasePlatformService";
import BasePlatformHandler from "./ServiceCloudVoicePlatformHandlers/BasePlatformHandler";
import Five9PlatformHandler from "./ServiceCloudVoicePlatformHandlers/Five9PlatformHandler";
import NicePlatformHandler from "./ServiceCloudVoicePlatformHandlers/NicePlatformHandler";

const SCV_EVENTS_TO_SUBSCRIBE = [
  scvEventNames.callconnected,
  scvEventNames.callended
];

export default class ServiceCloudVoicePlatformService extends BasePlatformService {
  /** @type {BasePlatformHandler} */
  platformHandler;

  constructor(lwc, refs) {
    super(lwc, refs);
    this.telephonyEventListener = this.onTelephonyEvent.bind(this);

    if (this.lwc && this.lwc.platform && this.lwc.platform.includes("five9")) {
      this.platformHandler = new Five9PlatformHandler(this);
    } else if (
      this.lwc &&
      this.lwc.platform &&
      this.lwc.platform.includes("nice")
    ) {
      this.platformHandler = new NicePlatformHandler(this);
    } else {
      this.platformHandler = new BasePlatformHandler(this);
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // Init & Teardown
  ////////////////////////////////////////////////////////////////////////////

  async init() {
    // Set up Agent Assist UIM to work with Service Cloud Voice.
    this.lwc.debugLog("initServiceCloudVoice called");
    this.lwc.debugLog(`this.lwc.vendorCallKey: ${this.lwc.vendorCallKey}`);
    const toolkitApi = this.refs.serviceCloudVoiceToolkitApi;
    if (!toolkitApi) return;
    this.unsubscribeFromVoiceToolkit(toolkitApi, this.telephonyEventListener);
    this.subscribeToVoiceToolkit(toolkitApi, this.telephonyEventListener);

    await this.platformHandler.init();
  }

  teardown() {
    super.teardown();
    // Teardown Agent Assist UIM Service Cloud Voice.
    this.platformHandler.teardown();
  }

  ////////////////////////////////////////////////////////////////////////////
  // Setup Event Listeners and Subscriptions
  ////////////////////////////////////////////////////////////////////////////

  subscribeToVoiceToolkit(toolkitApi, telephonyEventListener) {
    this.lwc.debugLog(`subscribeToVoiceToolkit: ${SCV_EVENTS_TO_SUBSCRIBE}`);
    for (const eventName of SCV_EVENTS_TO_SUBSCRIBE) {
      toolkitApi.addEventListener(eventName, telephonyEventListener);
    }
  }

  unsubscribeFromVoiceToolkit(toolkitApi, telephonyEventListener) {
    this.lwc.debugLog(
      `unsubscribeFromVoiceToolkit: ${SCV_EVENTS_TO_SUBSCRIBE}`
    );
    for (const eventName of SCV_EVENTS_TO_SUBSCRIBE) {
      toolkitApi.removeEventListener(eventName, telephonyEventListener);
    }
  }

  ////////////////////////////////////////////////////////////////////////////
  // Handle Events
  ////////////////////////////////////////////////////////////////////////////

  onTelephonyEvent(event) {
    this.lwc.debugLog(
      `[onTelephonyEvent ${event.type}]: ${JSON.stringify(event)}`
    );

    // If the event has a callId and it doesn't match the current vendorCallKey,
    // ignore the event as it's for a different call instance.
    if (
      event.detail &&
      event.detail.callId &&
      this.lwc.vendorCallKey !== event.detail.callId
    ) {
      this.lwc.debugLog(
        `Ignoring event for different callId. Current: ${this.lwc.vendorCallKey}, Event: ${event.detail.callId}`
      );
      return;
    }

    switch (event.type) {
      case scvEventNames.callconnected:
        this.handleCallConnected(event);
        break;
      case scvEventNames.callended:
        this.handleCallEnded(event);
        break;
      default:
        this.lwc.debugLog(`Unhandled SCV event type: ${event.type}`);
    }
  }

  handleCallConnected(event) {
    // Compare the SCV telephony event's callId to SF VoiceCall record's VendorCallKey.
    // This is most likely also the BYOT telephony platform's external unique call id,
    // which can be used to construct telephony platform specific DF conversationName.
    this.platformHandler.handleCallConnected(event);
  }

  handleCallEnded(event) {
    this.lwc.debugLog("handleConversationEndedForServiceCloudVoice called");
    this.lwc.triggerSummarization();
  }

  handleSessionIdUpdated(sessionId) {
    this.platformHandler.handleSessionIdUpdated(sessionId);
  }

  getVoiceCallFields() {
    if (this.platformHandler) {
      return this.platformHandler.getVoiceCallFields();
    }
    return [];
  }

  getSessionId(voiceCallData) {
    if (this.platformHandler) {
      return this.platformHandler.getSessionId(voiceCallData);
    }
    return null;
  }
}
