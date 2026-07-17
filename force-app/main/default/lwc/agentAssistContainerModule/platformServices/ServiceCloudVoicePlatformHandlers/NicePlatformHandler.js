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

import BasePlatformHandler from "./BasePlatformHandler";

// SCV telephony config for Nice CXone
const CONFIG = {
  // For this.platform = "servicecloudvoice-nice", the Nice Business Unit Number
  // https://help.nicecxone.com/content/acd/businessunits/managebusinessunit.htm
  niceBusNo: 1234567 // TODO: make sure this matches your Nice CXone Business Unit Number.
};

export default class NicePlatformHandler extends BasePlatformHandler {
  constructor(service) {
    super(service);
  }

  handleCallConnected(event) {
    // Generate Nice CXone (Agent Assist Hub) formatted conversationName.
    const prefix = this.lwc.projectLocationName;
    this.lwc.conversationId = `BusNo-${CONFIG.niceBusNo}_ContactId-${event.detail.callId}`;
    this.lwc.conversationName = `${prefix}/conversations/${this.lwc.conversationId}`;
  }
}
