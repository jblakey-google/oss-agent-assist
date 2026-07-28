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

export const COMPONENT_BADGE_STYLE =
  "background-color: #0070d2; color: #ffffff; padding: 2px 4px; border-radius: 3px; font-weight: bold;";

export const DIAGNOSTIC_STYLES = {
  header: "color: #0176d3; font-weight: bold; font-size: 14px;",
  info: "color: #0176d3; font-weight: bold; font-size: 13px;",
  sub: "color: #54698d; font-size: 11px;",
  error: "color: #ea001e; font-weight: bold;",
  warn: "color: #fe9339; font-weight: bold;",
  pending: "color: #eab308;",
  pass: "color: #2e844a; font-weight: bold;"
};

export function logComponentBadge(componentName, message, ...extra) {
  if (typeof message === "string" && message.startsWith("%c")) {
    console.log(message, ...extra);
  } else if (typeof message === "string") {
    console.log(
      `%c[${componentName}]%c ${message}`,
      COMPONENT_BADGE_STYLE,
      "",
      ...extra
    );
  } else {
    console.log(
      `%c[${componentName}]%c`,
      COMPONENT_BADGE_STYLE,
      "",
      message,
      ...extra
    );
  }
}

export function logDiagnostic(message, styleType = "info", debugMode = true) {
  if (!debugMode) return;
  const style = DIAGNOSTIC_STYLES[styleType] || DIAGNOSTIC_STYLES.info;
  if (styleType === "error") {
    console.error(`%c[AgentAssist Diagnostics] ${message}`, style);
  } else if (styleType === "warn") {
    console.warn(`%c[AgentAssist Diagnostics] ${message}`, style);
  } else {
    console.log(`%c[AgentAssist Diagnostics] ${message}`, style);
  }
}

export function logDiagnosticGroup(message, styleType = "info", debugMode = true, debugGroupFn = console.group) {
  if (!debugMode) return;
  const style = DIAGNOSTIC_STYLES[styleType] || DIAGNOSTIC_STYLES.info;
  debugGroupFn(`%c${message}`, style);
}
