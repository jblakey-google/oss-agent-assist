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

import { LightningElement, track } from "lwc";
import getUsersWithPermissionSetStatus from "@salesforce/apex/AgentAssistConfigController.getUsersWithPermissionSetStatus";
import toggleUserPermissionSetAssignment from "@salesforce/apex/AgentAssistConfigController.toggleUserPermissionSetAssignment";

import {
  PERMISSION_SET_OPTIONS,
  PERMISSION_SET_CONFIG,
  dispatchToast,
  dispatchErrorToast
} from "c/agentAssistSetupSharedService";

export default class AgentAssistSetupUsersPanel extends LightningElement {
  // =============================================================================
  // #region 1. REACTIVE PROPERTIES & STATE
  // =============================================================================

  @track agentUsersList = [];
  @track selectedAgentUserId = "";
  @track isSelectedUserAssigned = false;
  @track isUserPermissionLoading = false;
  @track selectedPermissionSetName = "Agent_Assist_User";
  @track userSearchTerm = "";

  // #endregion

  // =============================================================================
  // #region 2. LIFECYCLE & WIRES
  // =============================================================================

  connectedCallback() {
    this.loadAgentUsers();
  }

  // #endregion

  // =============================================================================
  // #region 3. GETTERS & COMPUTED PROPERTIES
  // =============================================================================

  get permissionSetOptions() {
    return PERMISSION_SET_OPTIONS;
  }

  get selectedPermissionSetLabel() {
    return (
      PERMISSION_SET_CONFIG[this.selectedPermissionSetName]?.label ||
      "Google Cloud Agent Assist User"
    );
  }

  get selectedPermissionSetDescription() {
    return (
      PERMISSION_SET_CONFIG[this.selectedPermissionSetName]?.description ||
      ""
    );
  }

  get assignedUsersEmptyMessage() {
    return `No active users are currently assigned the ${this.selectedPermissionSetLabel} permission set.`;
  }

  get filteredUsersList() {
    const term = (this.userSearchTerm || "").toLowerCase().trim();
    const users = term
      ? this.agentUsersList.filter((u) => (u.label || "").toLowerCase().includes(term))
      : [...this.agentUsersList];

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

  get hasFilteredUsers() {
    return this.filteredUsersList.length > 0;
  }

  get assignedAgentUsers() {
    return this.agentUsersList.filter((u) => u.isAssigned);
  }

  get hasAssignedAgentUsers() {
    return this.assignedAgentUsers.length > 0;
  }

  get assignedUsersCount() {
    return this.assignedAgentUsers.length;
  }

  // #endregion

  // =============================================================================
  // #region 4. EVENT HANDLERS & APEX CALLOUTS
  // =============================================================================

  handleUserSearchChange(event) {
    this.userSearchTerm = event.target.value;
  }

  async handlePermissionSetChange(event) {
    this.selectedPermissionSetName = event.detail.value;
    await this.loadAgentUsers();
  }

  async loadAgentUsers() {
    try {
      const data = await getUsersWithPermissionSetStatus({
        permissionSetName: this.selectedPermissionSetName
      });
      if (data && data.length > 0) {
        this.agentUsersList = data;
        if (!this.selectedAgentUserId) {
          this.selectedAgentUserId = data[0].value;
        }
      } else {
        this.agentUsersList = [];
      }
      this.updateSelectedUserStatus();
    } catch (err) {
      console.warn("Could not load agent users", err);
    }
  }

  updateSelectedUserStatus() {
    const found = this.agentUsersList.find((u) => u.value === this.selectedAgentUserId);
    this.isSelectedUserAssigned = found ? found.isAssigned : false;
  }

  async modifyUserPermissionSetAssignment(
    userId,
    assign,
    successMessage,
    errorTitle = "Error Managing Permission Set"
  ) {
    this.isUserPermissionLoading = true;
    try {
      await toggleUserPermissionSetAssignment({
        userId,
        assign,
        permissionSetName: this.selectedPermissionSetName
      });
      dispatchToast(this, "Success", successMessage, "success");
      await this.loadAgentUsers();
    } catch (error) {
      dispatchErrorToast(this, errorTitle, error);
    } finally {
      this.isUserPermissionLoading = false;
    }
  }

  async handleToggleUserInline(event) {
    const userId = event.currentTarget?.dataset?.userId;
    const isAssigned = event.currentTarget?.dataset?.assigned === "true";
    if (!userId) return;
    const message = `Permission set ${this.selectedPermissionSetLabel} ${
      !isAssigned ? "assigned to" : "removed from"
    } user.`;
    await this.modifyUserPermissionSetAssignment(
      userId,
      !isAssigned,
      message
    );
  }

  async handleQuickRemoveUserPermissionSet(event) {
    const userId =
      event.detail?.name ||
      event.target?.name ||
      event.currentTarget?.dataset?.userId;
    if (!userId) return;
    const message = `Permission set ${this.selectedPermissionSetLabel} removed.`;
    await this.modifyUserPermissionSetAssignment(
      userId,
      false,
      message,
      "Error Removing Permission Set"
    );
  }

  // #endregion
}
