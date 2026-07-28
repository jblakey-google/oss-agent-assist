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

import { DIAGNOSTIC_STYLES, logDiagnostic, logDiagnosticGroup } from "c/agentAssistLogger";

export function evaluateDiagnosticsSuite(data, options = {}) {
  const {
    isManualRun = false,
    queryError = null,
    debugMode = false,
    packageAlertsDisabled = false,
    defaultSections = [],
    debugGroup = console.group,
    debugGroupEnd = console.groupEnd
  } = options;

  if (debugMode) {
    logDiagnostic("========================================================", "header", debugMode);
    logDiagnostic(
      `🚀 ${isManualRun ? "Manual Refresh" : "Live Evaluation"} - Running Diagnostic Instrument Suite...`,
      "info",
      debugMode
    );
    logDiagnostic("⏱️ Timestamp: " + new Date().toLocaleString(), "sub", debugMode);
  }

  if (queryError && debugMode) {
    logDiagnostic(
      "💥 Apex Diagnostic Controller Error: " +
        (queryError.body ? queryError.body.message : queryError.message),
      "error",
      debugMode
    );
  }

  const rawSections = data?.sections || defaultSections;
  let totalPass = 0;
  let totalFail = 0;
  let totalWarn = 0;

  const sections = rawSections.map((sec) => {
    const defaultSec = defaultSections.find(
      (d) => d.id === sec.id
    );
    const setupUrl = sec.setupUrl || defaultSec?.setupUrl || "";
    const setupUrlLabel =
      sec.setupUrlLabel || defaultSec?.setupUrlLabel || "";

    if (debugMode) {
      logDiagnosticGroup(
        `🔍 [Instrument Section] ${sec.title}`,
        "info",
        debugMode,
        debugGroup
      );
    }

    const isPackageSection = sec.id === "installed_packages";
    const hasAtLeastOnePackage =
      isPackageSection &&
      (sec.items || []).some((i) => i.status === "pass" || i.status === "ok");

    const items = (sec.items || []).map((item) => {
      let status = item.status;
      if (queryError) status = "fail";

      let statusPillClass = "status-pill status-pill_pass";
      let ledClass = "status-led status-led_pass";
      let statusLabel = "OK";
      const isFail = status === "fail";
      let isWarn = status === "warning";
      const isPending = status === "pending";

      const isPass = status === "pass" || (!isFail && !isWarn && !isPending);

      if (isFail) {
        totalFail++;
        statusPillClass = "status-pill status-pill_fail";
        ledClass = "status-led status-led_fail";
        statusLabel = "Fail";
        logDiagnostic(
          `❌ [FAIL] ${item.label}\n   └─ Reason: ${item.errorMessage || item.subLabel || "Check failed in org metadata."}`,
          "error",
          debugMode
        );
      } else if (isWarn) {
        if (
          !isPackageSection ||
          (!hasAtLeastOnePackage && !packageAlertsDisabled)
        ) {
          totalWarn++;
        }
        statusPillClass = "status-pill status-pill_warn";
        ledClass = "status-led status-led_warn";
        statusLabel = "Attention Needed";
        logDiagnostic(
          `⚠️ [WARN] ${item.label}\n   └─ Note: ${item.errorMessage || item.subLabel}`,
          "warn",
          debugMode
        );
      } else if (isPending) {
        statusPillClass = "status-pill status-pill_pending";
        ledClass = "status-led status-led_pending";
        statusLabel = "Checking...";
        logDiagnostic(`⏳ [CHECKING] ${item.label}...`, "pending", debugMode);
      } else {
        totalPass++;
        statusPillClass = "status-pill status-pill_pass";
        ledClass = "status-led status-led_pass";
        statusLabel = "OK";
        logDiagnostic(`✅ [OK] ${item.label} ─ ${item.subLabel}`, "pass", debugMode);
        if (debugMode && item.assignees && item.assignees.length > 0) {
          console.log("   └─ Active Assignees:", item.assignees.join(", "));
        }
      }

      const totalCount =
        item.totalCount || (item.assignees ? item.assignees.length : 0);
      const hasAssignees = item.assignees && item.assignees.length > 0;
      const hasMore =
        totalCount > (item.assignees ? item.assignees.length : 0);
      const moreCount =
        totalCount - (item.assignees ? item.assignees.length : 0);
      const countBadgeText = totalCount > 0 ? `${totalCount} Total` : "";
      const itemSetupUrl = item.setupUrl || setupUrl || "";

      return {
        ...item,
        statusPillClass,
        ledClass,
        statusLabel,
        isFail,
        isWarn,
        isPass,
        isPending,
        hasAssignees,
        hasMore,
        moreCount,
        countBadgeText,
        setupUrl: itemSetupUrl
      };
    });

    if (debugMode) {
      debugGroupEnd();
    }

    const secHasFail = items.some((i) => i.isFail);
    const secHasWarn = items.some((i) => i.isWarn);
    const secHasPending = items.some((i) => i.isPending);
    const secPassCount = items.filter((i) => i.isPass).length;
    const secTotalCount = items.length;

    let secPillClass = "status-pill status-pill_pass";
    let secStatusText = "OK";
    let secLedClass = "status-led status-led_pass";

    if (secHasFail) {
      secPillClass = "status-pill status-pill_fail";
      secStatusText = "Action Required";
      secLedClass = "status-led status-led_fail";
    } else if (
      secHasWarn &&
      !hasAtLeastOnePackage &&
      !packageAlertsDisabled
    ) {
      secPillClass = "status-pill status-pill_warn";
      secStatusText = "Attention Needed";
      secLedClass = "status-led status-led_warn";
    } else if (secHasPending) {
      secPillClass = "status-pill status-pill_pending";
      secStatusText = "Checking...";
      secLedClass = "status-led status-led_pending";
    }

    const summaryMetricText = isPackageSection
      ? `${secPassCount} of ${secTotalCount} Installed`
      : secHasPending
        ? "Evaluating..."
        : `${secPassCount} of ${secTotalCount} OK`;

    return {
      ...sec,
      setupUrl,
      setupUrlLabel,
      secPillClass,
      secStatusText,
      secLedClass,
      summaryMetricText,
      isPackageSection,
      items
    };
  });

  if (debugMode) {
    logDiagnostic(
      `🏁 Diagnostic Suite Summary: ${totalPass} Checks OK | ${totalFail} Failed | ${totalWarn} Warnings`,
      totalFail > 0 ? "error" : "pass",
      debugMode
    );
    logDiagnostic("========================================================", "header", debugMode);
  }

  let state = "healthy";
  if (totalFail > 0) {
    state = "error";
  } else if (totalWarn > 0) {
    state = "warning";
  }

  return { sections, state };
}
