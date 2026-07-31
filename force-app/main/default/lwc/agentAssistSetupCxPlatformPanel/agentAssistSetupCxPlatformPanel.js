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

import { LightningElement, api, wire } from "lwc";
import platformLogos from "@salesforce/resourceUrl/platform_logos";
import getInstalledPackageStatus from "@salesforce/apex/AgentAssistConfigController.getInstalledPackageStatus";

export default class AgentAssistSetupCxPlatformPanel extends LightningElement {
  // =============================================================================
  // #region 1. Reactive Properties and Wires
  // =============================================================================

  _externalPackageStatus;
  _wiredPackageStatus = {};

  @api
  get packageStatus() {
    return this._externalPackageStatus || this._wiredPackageStatus;
  }
  set packageStatus(value) {
    this._externalPackageStatus = value;
  }

  @wire(getInstalledPackageStatus)
  wiredPackageStatus({ error, data }) {
    if (data) {
      this._wiredPackageStatus = data;
    } else if (error) {
      console.warn("Could not load installed package status", error);
    }
  }

  // #endregion

  // =============================================================================
  // #region 2. Getters and Computed Logo URLs
  // =============================================================================

  get salesforceLogoUrl() {
    return `${platformLogos}/salesforce_logo.svg`;
  }

  get five9LogoUrl() {
    return `${platformLogos}/five9_logo.svg`;
  }

  get niceLogoUrl() {
    return `${platformLogos}/cxone_logo.svg`;
  }

  get genesysLogoUrl() {
    return `${platformLogos}/genesys_logo.svg`;
  }

  get twilioLogoUrl() {
    return `${platformLogos}/twilio_logo.svg`;
  }

  get isFive9PackageInstalled() {
    return !!this.packageStatus?.["04tTN000000C1rZYAS"];
  }

  get isTwilioPackageInstalled() {
    return !!this.packageStatus?.["04t8Z0000012JNXQA2"];
  }

  get isNicePackageInstalled() {
    return !!this.packageStatus?.["04tUi000000L76XIAS"];
  }

  get isGenesysPackageInstalled() {
    return !!this.packageStatus?.["04tQp000000ngyzIAA"];
  }

  // #endregion
}
