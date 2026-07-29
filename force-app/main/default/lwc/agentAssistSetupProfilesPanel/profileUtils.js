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
// #region 1. Profile Template and Type Factory
// =============================================================================

/**
 * Creates a default profile template object for a new Container or Companion Agent profile.
 *
 * @param {string} profileType - Profile type ('Container' | 'Companion Agent').
 * @returns {Object} Fresh profile template object with default fields.
 */
export function createNewProfileTemplate(profileType) {
  const isCompanion = profileType === "Companion Agent";
  const randomSuffix = Math.floor(Math.random() * 1000);
  return {
    id: "temp-" + Date.now(),
    name: isCompanion ? "New Companion Agent" : "New Container Profile",
    developerName:
      (isCompanion ? "Custom_Companion_" : "Custom_Container_") + randomSuffix,
    profileType: profileType,
    title: isCompanion
      ? "Google Cloud Companion Agent"
      : "Google Cloud Agent Assist",
    endpointUrl: "https://ui-connector-{id}.{region}.run.app",
    conversationProfile:
      "projects/{project-id}/locations/{location-id}/conversationProfiles/{profile-id}",
    channel: "chat",
    platform: "base",
    consumerKey: "",
    consumerSecret: "",
    clientCredentialsUser: "",
    containerHeight: "530px",
    debugMode: true,
    showDarkModeToggle: true,
    showHeader: false,
    showCorrectnessFeedback: false,
    disableIntegratedTranscript: false,
    modelName: "gemini-1.5-pro",
    welcomeMessage:
      "Hello! I am your AI Companion Agent. How can I assist you with this record today?",
    enableAutonomousActions: true,
    isActive: true
  };
}

/**
 * Switches the profile type of an existing profile object, adjusting titles appropriately.
 *
 * @param {Object} currentProfile - Current active profile object.
 * @param {string} targetType - Target profile type ('Container' | 'Companion Agent').
 * @returns {Object} Updated profile object.
 */
export function switchProfileType(currentProfile, targetType) {
  if (!currentProfile || currentProfile.profileType === targetType) {
    return currentProfile;
  }
  const updated = {
    ...currentProfile,
    profileType: targetType
  };
  if (
    targetType === "Companion Agent" &&
    (!updated.title || updated.title === "Google Cloud Agent Assist")
  ) {
    updated.title = "Google Cloud Companion Agent";
  } else if (
    targetType === "Container" &&
    (!updated.title || updated.title === "Google Cloud Companion Agent")
  ) {
    updated.title = "Google Cloud Agent Assist";
  }
  return updated;
}

// #endregion

// =============================================================================
// #region 2. Apex DTO Payload Builder
// =============================================================================

/**
 * Builds the standard Agent_Assist_Config__c sobject payload for Apex save operations.
 *
 * @param {Object} profile - Profile object containing UI form fields.
 * @param {Object} [overrides={}] - Optional field overrides (e.g. for copying profile).
 * @returns {Object} Apex sobject record payload.
 */
export function buildConfigRecordPayload(profile, overrides = {}) {
  return {
    sobjectType: "Agent_Assist_Config__c",
    Name: profile.name,
    Developer_Name__c: profile.developerName,
    Profile_Type__c: profile.profileType || "Container",
    Title__c: profile.title,
    Endpoint_URL__c: profile.endpointUrl,
    Conversation_Profile__c: profile.conversationProfile,
    Channel__c: profile.channel,
    Platform__c: profile.platform,
    Consumer_Key__c: profile.consumerKey,
    Consumer_Secret__c: profile.consumerSecret,
    Client_Credentials_User__c: profile.clientCredentialsUser,
    Container_Height__c: profile.containerHeight,
    Debug_Mode__c: profile.debugMode,
    Show_Dark_Mode_Toggle__c: profile.showDarkModeToggle,
    Show_Header__c: profile.showHeader,
    Show_Correctness_Feedback__c: profile.showCorrectnessFeedback,
    Disable_Integrated_Transcript__c:
      profile.disableIntegratedTranscript !== undefined
        ? profile.disableIntegratedTranscript
        : false,
    Disabled_Features__c: profile.disabledFeatures || "",
    Model_Name__c: profile.modelName,
    Welcome_Message__c: profile.welcomeMessage,
    Enable_Autonomous_Actions__c: profile.enableAutonomousActions,
    Is_Active__c: true,
    ...overrides
  };
}

// #endregion

// =============================================================================
// #region 3. Apex Service Persistence Operations
// =============================================================================

/**
 * Persists changes to an existing or new profile via the Apex saveConfig function.
 *
 * @param {Object} currentProfile - Profile object to save.
 * @param {Function} saveConfigFn - Apex saveConfig function reference.
 * @returns {Promise<Object>} Saved record result.
 */
export async function saveProfileService(currentProfile, saveConfigFn) {
  const payload = buildConfigRecordPayload(currentProfile);
  if (
    currentProfile.id &&
    !currentProfile.id.startsWith("temp-") &&
    !currentProfile.id.startsWith("mock-")
  ) {
    payload.Id = currentProfile.id;
  }
  return saveConfigFn({ configRecord: payload });
}

/**
 * Creates a duplicate copy of an existing profile with a unique developer name.
 *
 * @param {Object} currentProfile - Profile object to copy.
 * @param {Function} saveConfigFn - Apex saveConfig function reference.
 * @returns {Promise<{ saved: Object, copyName: string, copyDevName: string }>} Result containing saved record details.
 */
export async function saveAsCopyProfileService(currentProfile, saveConfigFn) {
  const randomSuffix = Math.floor(Math.random() * 900) + 100;
  const baseDevName = (currentProfile.developerName || "Custom_Profile")
    .replace(/^Copy_/, "")
    .substring(0, 30);
  const copyDevName = `Copy_${baseDevName}_${randomSuffix}`.replace(
    /[^a-zA-Z0-9_]/g,
    "_"
  );
  const baseName = (currentProfile.name || "Configuration Profile").replace(
    /^Copy of\s*/,
    ""
  );
  const copyName = `Copy of ${baseName}`.substring(0, 80);

  const payload = buildConfigRecordPayload(currentProfile, {
    Name: copyName,
    Developer_Name__c: copyDevName
  });
  delete payload.Id;

  const saved = await saveConfigFn({ configRecord: payload });
  return { saved, copyName, copyDevName };
}

/**
 * Deletes a custom configuration profile via the Apex deleteConfig function.
 *
 * @param {Object} currentProfile - Profile object to delete.
 * @param {Function} deleteConfigFn - Apex deleteConfig function reference.
 * @returns {Promise<Object|null>} Apex delete operation result.
 */
export async function deleteProfileService(currentProfile, deleteConfigFn) {
  if (
    currentProfile.id &&
    !currentProfile.id.startsWith("temp-") &&
    !currentProfile.id.startsWith("mock-")
  ) {
    return deleteConfigFn({ configId: currentProfile.id });
  }
  return null;
}

/**
 * Resets a single default configuration profile back to out-of-the-box defaults.
 *
 * @param {Object} currentProfile - Default profile object to reset.
 * @param {Function} resetConfigFn - Apex resetSingleDefaultConfig function reference.
 * @returns {Promise<Object>} Reset record result.
 */
export async function resetProfileService(currentProfile, resetConfigFn) {
  return resetConfigFn({
    developerName: currentProfile.developerName
  });
}

// #endregion

// =============================================================================
// #region 4. List Mutation Helpers
// =============================================================================

/**
 * Updates a profile item inside an array of profiles.
 *
 * @param {Array<Object>} profiles - Existing array of profile objects.
 * @param {Object} currentProfile - Profile object being updated.
 * @param {string} [savedId] - Saved database Id.
 * @returns {Array<Object>} Immutable updated array of profiles.
 */
export function updateProfileInList(profiles, currentProfile, savedId) {
  const idx = profiles.findIndex(
    (p) => p.developerName === currentProfile.developerName
  );
  if (idx >= 0) {
    const updated = [...profiles];
    updated[idx] = {
      ...currentProfile,
      id: savedId || currentProfile.id
    };
    return updated;
  }
  return profiles;
}

/**
 * Removes a profile item from an array of profiles by developer name.
 *
 * @param {Array<Object>} profiles - Existing array of profile objects.
 * @param {string} devName - Developer name of profile to remove.
 * @returns {Array<Object>} Filtered array of profiles.
 */
export function removeProfileFromList(profiles, devName) {
  return profiles.filter((p) => p.developerName !== devName);
}

// #endregion
