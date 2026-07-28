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

export function filterAndSortUsers(usersList = [], searchTerm = "") {
  const term = (searchTerm || "").toLowerCase().trim();
  const users = term
    ? usersList.filter((u) => (u.label || "").toLowerCase().includes(term))
    : [...usersList];

  // Sort assigned users to the top, then alphabetically by name
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

export function calculateUserAssignmentStatus(usersList = [], selectedUserId = "") {
  const found = usersList.find((u) => u.value === selectedUserId);
  return found ? found.isAssigned : false;
}

export async function toggleUserPermissionService(params, toggleFn) {
  const { userId, assign, permissionSetName } = params;
  return toggleFn({
    userId,
    assign,
    permissionSetName
  });
}

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
