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

import {
  STATUS_PILL_CLASSES,
  STATUS_LED_CLASSES,
  STATUS_LABELS
} from "c/agentAssistSetupSharedService";

// =============================================================================
// #region 1. HELPER UTILITIES
// =============================================================================

/**
 * Resolves the status key ('fail' | 'warning' | 'pass' | 'pending') based on item flags.
 *
 * @param {boolean} isFail - True if item check failed.
 * @param {boolean} isWarn - True if item check has warning.
 * @param {boolean} isPass - True if item check passed.
 * @returns {string} Status key identifier.
 */
function resolveStatusKey(isFail, isWarn, isPass) {
  if (isFail) return "fail";
  if (isWarn) return "warning";
  if (isPass) return "pass";
  return "pending";
}

/**
 * Calculates section status ('fail' | 'warning' | 'pass') based on item counts.
 *
 * @param {number} secFailCount - Number of failed items in section.
 * @param {number} secWarnCount - Number of warning items in section.
 * @returns {string} Section status key.
 */
function calculateSectionStatus(secFailCount, secWarnCount) {
  if (secFailCount > 0) return "fail";
  if (secWarnCount > 0) return "warning";
  return "pass";
}

// #endregion

// =============================================================================
// #region 2. DIAGNOSTICS SUITE EVALUATOR
// =============================================================================

/**
 * Evaluates the full diagnostics suite returned by Apex or default sections,
 * computing section metrics, status pill CSS classes, and overall system state.
 *
 * @param {Object} data - Diagnostics payload from getOrgDiagnostics Apex wire.
 * @param {Object} options - Configuration options.
 * @param {boolean} [options.packageAlertsDisabled=false] - Whether user suppressed package alert warnings.
 * @param {Array<Object>} [options.defaultSections=[]] - Fallback diagnostic sections.
 * @returns {{ sections: Array<Object>, state: string }} Processed sections and overall health state ('healthy' | 'warning' | 'error').
 */
export function evaluateDiagnosticsSuite(data, options = {}) {
  const { packageAlertsDisabled = false, defaultSections = [] } = options;

  const rawSections = data?.sections || defaultSections;
  let overallState = "healthy";

  const sections = rawSections.map((sec) => {
    const defaultSec = defaultSections.find((d) => d.id === sec.id);
    const setupUrl = sec.setupUrl || defaultSec?.setupUrl || "";
    const setupUrlLabel = sec.setupUrlLabel || defaultSec?.setupUrlLabel || "";
    const isPackageSection = sec.id === "installed_packages";
    const hasAtLeastOnePackage =
      isPackageSection &&
      (sec.items || []).some((i) => i.status === "pass" || i.status === "ok");

    let secPassCount = 0;
    let secFailCount = 0;
    let secWarnCount = 0;

    const items = (sec.items || []).map((item) => {
      const itemStatus = item.status || "pending";
      const isPass = itemStatus === "pass" || itemStatus === "ok";
      let isFail = itemStatus === "fail" || itemStatus === "error";
      let isWarn = itemStatus === "warn" || itemStatus === "warning";

      if (isPackageSection && packageAlertsDisabled && hasAtLeastOnePackage) {
        isFail = false;
        isWarn = false;
      }

      if (isFail) secFailCount++;
      else if (isWarn) secWarnCount++;
      else if (isPass) secPassCount++;

      const statusKey = resolveStatusKey(isFail, isWarn, isPass);
      const assignees = item.assignees || [];
      const hasAssignees = assignees.length > 0;
      const totalCount =
        item.totalCount !== undefined ? item.totalCount : assignees.length;
      const countBadgeText = totalCount > 0 ? `${totalCount} Assigned` : "";

      return {
        ...item,
        statusPillClass:
          STATUS_PILL_CLASSES[statusKey] || STATUS_PILL_CLASSES.pending,
        ledClass: STATUS_LED_CLASSES[statusKey] || STATUS_LED_CLASSES.pending,
        statusLabel: STATUS_LABELS[statusKey] || "Checking...",
        isPending: statusKey === "pending",
        isPass,
        isFail,
        isWarn,
        hasAssignees,
        assignees,
        countBadgeText,
        setupUrl: item.setupUrl || setupUrl
      };
    });

    const secStatus = calculateSectionStatus(secFailCount, secWarnCount);

    if (secStatus === "fail" && overallState !== "error") {
      overallState = "error";
    } else if (secStatus === "warning" && overallState !== "error") {
      overallState = "warning";
    }

    const totalItems = items.length;
    const summaryMetricText = isPackageSection
      ? `${secPassCount} / ${totalItems} Packages Detected`
      : `${secPassCount} / ${totalItems} Verified`;

    return {
      ...sec,
      secPillClass:
        STATUS_PILL_CLASSES[secStatus] || STATUS_PILL_CLASSES.pending,
      secLedClass: STATUS_LED_CLASSES[secStatus] || STATUS_LED_CLASSES.pending,
      secStatusText: STATUS_LABELS[secStatus] || "Checking...",
      setupUrl,
      setupUrlLabel,
      isPackageSection,
      summaryMetricText,
      items
    };
  });

  return {
    sections,
    state: overallState
  };
}

// #endregion
