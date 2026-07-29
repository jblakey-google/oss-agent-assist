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

import { LightningElement, track, wire } from "lwc";
import { refreshApex } from "@salesforce/apex";
import getOrgDiagnostics from "@salesforce/apex/AgentAssistConfigController.getOrgDiagnostics";

import {
  DEFAULT_DIAGNOSTIC_SECTIONS,
  STATUS_PILL_CLASSES,
  STATUS_LED_CLASSES,
  STATUS_ICONS,
  STATUS_LABELS,
  getFromStorage,
  saveToStorage,
  dispatchToast,
  dispatchErrorToast
} from "c/agentAssistSetupSharedService";

import { evaluateDiagnosticsSuite } from "./diagnosticsUtils";

export default class AgentAssistSetupDiagnosticsPanel extends LightningElement {
  // =============================================================================
  // #region 1. Reactive Properties and State
  // =============================================================================

  @track diagnosticsState = "pending";
  @track diagnosticSections = [];
  @track packageAlertsDisabled =
    getFromStorage("agent_assist_package_alerts_disabled") === "true";

  wiredDiagnosticsResult;

  // #endregion

  // =============================================================================
  // #region 2. Lifecycle and Wires
  // =============================================================================

  connectedCallback() {
    this.initPendingDiagnostics();
  }

  initPendingDiagnostics() {
    this.diagnosticsState = "pending";
    this.diagnosticSections = DEFAULT_DIAGNOSTIC_SECTIONS.map((sec) => ({
      ...sec,
      secPillClass: "status-pill status-pill_pending",
      secStatusText: "Checking...",
      secLedClass: "status-led status-led_pending",
      setupUrl: sec.setupUrl || "",
      setupUrlLabel: sec.setupUrlLabel || "",
      items: sec.items.map((item) => ({
        ...item,
        statusPillClass: "status-pill status-pill_pending",
        ledClass: "status-led status-led_pending",
        statusLabel: "Checking...",
        isPending: true,
        isPass: false,
        isFail: false,
        isWarn: false,
        hasAssignees: false
      }))
    }));
  }

  @wire(getOrgDiagnostics)
  wiredDiagnostics(result) {
    this.wiredDiagnosticsResult = result;
    const { data, error } = result;
    if (data) {
      this.processDiagnosticsData(data, false);
    } else if (error) {
      console.error("[AgentAssist Diagnostics] Apex query error:", error);
      this.processDiagnosticsData(null, false, error);
    }
  }

  processDiagnosticsData(data) {
    const res = evaluateDiagnosticsSuite(data, {
      packageAlertsDisabled: this.packageAlertsDisabled,
      defaultSections: DEFAULT_DIAGNOSTIC_SECTIONS
    });
    this.diagnosticSections = res.sections;
    this.diagnosticsState = res.state;
  }

  // #endregion

  // =============================================================================
  // #region 3. Getters and Computed Properties
  // =============================================================================

  get diagnosticsTabIcon() {
    return STATUS_ICONS[this.diagnosticsState] || STATUS_ICONS.pass;
  }

  get masterStatusLedClass() {
    return STATUS_LED_CLASSES[this.diagnosticsState] || STATUS_LED_CLASSES.pass;
  }

  get masterStatusPillClass() {
    return STATUS_PILL_CLASSES[this.diagnosticsState] || STATUS_PILL_CLASSES.pass;
  }

  get masterStatusLabel() {
    return STATUS_LABELS[this.diagnosticsState] || STATUS_LABELS.pass;
  }

  get detailsStatusLabel() {
    return STATUS_LABELS[this.diagnosticsState] || STATUS_LABELS.pass;
  }

  get topInstrumentCards() {
    return this.diagnosticSections;
  }

  get detailedPrereqSections() {
    return this.diagnosticSections;
  }

  get packageAlertsToggleLabel() {
    return this.packageAlertsDisabled ? "Enable Alerts" : "Disable Alerts";
  }

  get packageAlertsToggleIcon() {
    return this.packageAlertsDisabled
      ? "utility:notification"
      : "utility:volume_off";
  }

  // #endregion

  // =============================================================================
  // #region 4. Event Handlers and Actions
  // =============================================================================

  async togglePackageAlerts() {
    this.packageAlertsDisabled = !this.packageAlertsDisabled;
    saveToStorage(
      "agent_assist_package_alerts_disabled",
      this.packageAlertsDisabled ? "true" : "false"
    );
    if (this.wiredDiagnosticsResult) {
      try {
        await refreshApex(this.wiredDiagnosticsResult);
      } catch {
        // Ignore refresh errors
      }
    }
    if (this.wiredDiagnosticsResult?.data) {
      this.processDiagnosticsData(this.wiredDiagnosticsResult.data);
    }
  }

  async handleRunDiagnostics() {
    this.initPendingDiagnostics();
    // eslint-disable-next-line @lwc/lwc/no-async-operation
    setTimeout(async () => {
      try {
        if (this.wiredDiagnosticsResult) {
          const freshData = await refreshApex(this.wiredDiagnosticsResult);
          if (freshData) {
            this.processDiagnosticsData(freshData);
          }
        }
        const isHealthy = this.diagnosticsState === "healthy" || this.diagnosticsState === "pass";
        dispatchToast(
          this,
          isHealthy ? "Diagnostics Passed" : "Diagnostics Alert",
          isHealthy
            ? "All Salesforce platform configurations, backend services, presence statuses, and permission sets are verified and healthy."
            : "One or more diagnostic checks failed. Check the instrument panel and browser console for details.",
          isHealthy ? "success" : "error"
        );
      } catch (err) {
        this.processDiagnosticsData(null);
        dispatchErrorToast(this, "Diagnostics Error", err);
      }
    }, 400);
  }

  // #endregion
}
