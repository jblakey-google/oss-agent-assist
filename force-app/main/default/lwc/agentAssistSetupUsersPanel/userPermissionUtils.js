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

// =============================================================================
// #region 1. User Filtering and Sorting Utilities
// =============================================================================

/**
 * Filters a list of user objects by search term and sorts assigned users to the top.
 *
 * @param {Array<Object>} [usersList=[]] - Raw list of user objects.
 * @param {string} [searchTerm=""] - Search term to filter user labels.
 * @returns {Array<Object>} Processed, filtered, and sorted user list with badge UI fields.
 */
export function filterAndSortUsers(usersList = [], searchTerm = "") {
  const term = (searchTerm || "").toLowerCase().trim();
  const users = term
    ? usersList.filter((u) => (u.label || "").toLowerCase().includes(term))
    : [...usersList];

  users.sort((a, b) => {
    if (a.isAssigned !== b.isAssigned) {
      return a.isAssigned ? -1 : 1;
    }
    return (a.label || "").localeCompare(b.label || "");
  });

  return users.map((u) => ({
    ...u,
    badgeClass: u.isAssigned
      ? "slds-badge slds-theme_success"
      : "slds-badge slds-badge_inverse",
    statusText: u.isAssigned ? "Assigned" : "Not Assigned",
    buttonLabel: u.isAssigned ? "Remove" : "Assign",
    buttonVariant: u.isAssigned ? "destructive-text" : "brand",
    buttonIcon: u.isAssigned ? "utility:close" : "utility:add"
  }));
}

/**
 * Processes Apex response for agent users data and updates selected user ID.
 *
 * @param {Array<Object>} data - Apex returned list of user objects.
 * @param {string} currentSelectedUserId - Currently selected user ID.
 * @returns {{ usersList: Array<Object>, selectedUserId: string }} Updated user list and selection.
 */
export function processAgentUsersData(data, currentSelectedUserId) {
  if (data && data.length > 0) {
    const selectedId = !currentSelectedUserId ? data[0].value : currentSelectedUserId;
    return {
      usersList: data,
      selectedUserId: selectedId
    };
  }
  return {
    usersList: [],
    selectedUserId: currentSelectedUserId
  };
}

// #endregion

// =============================================================================
// #region 2. User Assignment Status UI Formatters
// =============================================================================

/**
 * Calculates whether a specific user ID has the permission set assigned.
 *
 * @param {Array<Object>} [usersList=[]] - List of user objects.
 * @param {string} [selectedUserId=""] - Target user ID.
 * @returns {boolean} True if user is assigned.
 */
export function calculateUserAssignmentStatus(usersList = [], selectedUserId = "") {
  const found = usersList.find((u) => u.value === selectedUserId);
  return found ? found.isAssigned : false;
}

/**
 * Formats badge CSS classes, labels, and button variants for a selected user assignment card.
 *
 * @param {boolean} isAssigned - Whether the user is currently assigned.
 * @returns {{ badgeClass: string, statusText: string, buttonLabel: string, buttonVariant: string, buttonIcon: string }} UI button & badge properties.
 */
export function formatSelectedUserUI(isAssigned) {
  return {
    badgeClass: isAssigned
      ? "slds-badge slds-theme_success"
      : "slds-badge slds-badge_inverse",
    statusText: isAssigned ? "Assigned" : "Not Assigned",
    buttonLabel: isAssigned ? "Remove Permission Set" : "Assign Permission Set",
    buttonVariant: isAssigned ? "destructive" : "brand",
    buttonIcon: isAssigned ? "utility:close" : "utility:add"
  };
}

// #endregion
