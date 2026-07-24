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

@IsTest
private class AgentAssistConfigControllerTest {
  @TestSetup
  static void setupTestData() {
    List<PermissionSetAssignment> existing = [
      SELECT Id
      FROM PermissionSetAssignment
      WHERE
        AssigneeId = :UserInfo.getUserId()
        AND PermissionSet.Name = 'Agent_Assist_Admin'
    ];
    if (existing.isEmpty()) {
      PermissionSet ps = [
        SELECT Id
        FROM PermissionSet
        WHERE Name = 'Agent_Assist_Admin'
        LIMIT 1
      ];
      insert new PermissionSetAssignment(
        AssigneeId = UserInfo.getUserId(),
        PermissionSetId = ps.Id
      );
    }

    List<Agent_Assist_Config__c> testConfigs = new List<Agent_Assist_Config__c>{
      new Agent_Assist_Config__c(
        Name = 'Default Profile',
        Developer_Name__c = 'Default',
        Profile_Type__c = 'Container',
        Title__c = 'Google Cloud Agent Assist',
        Endpoint_URL__c = 'https://ui-connector-{id}.{region}.run.app',
        Conversation_Profile__c = 'projects/test-proj/locations/global/conversationProfiles/cp-123',
        Channel__c = 'chat',
        Platform__c = 'base',
        Consumer_Key__c = 'ck_123',
        Consumer_Secret__c = 'cs_123',
        Container_Height__c = '530px',
        Debug_Mode__c = true,
        Show_Dark_Mode_Toggle__c = true,
        Show_Header__c = false,
        Show_Correctness_Feedback__c = false,
        Disable_Integrated_Transcript__c = false,
        Disabled_Features__c = 'smart-reply',
        Is_Active__c = true
      ),
      new Agent_Assist_Config__c(
        Name = 'Default Companion Agent',
        Developer_Name__c = 'Default_Companion',
        Profile_Type__c = 'Companion Agent',
        Title__c = 'Google Cloud Companion Agent',
        Endpoint_URL__c = 'https://ui-connector-{id}.{region}.run.app',
        Model_Name__c = 'gemini-1.5-pro',
        Welcome_Message__c = 'Hello! I am your AI Companion Agent.',
        Enable_Autonomous_Actions__c = true,
        Is_Active__c = true
      )
    };
    insert testConfigs;
  }

  @IsTest
  static void testGetResolvedConfigContainer() {
    Test.startTest();
    AgentAssistConfigController.ConfigWrapper res = AgentAssistConfigController.getResolvedConfig(
      'Default'
    );
    Test.stopTest();

    Assert.areEqual(
      'Google Cloud Agent Assist',
      res.title,
      'Should load Default title from Container DB profile'
    );
    Assert.areEqual(
      'Container',
      res.profileType,
      'Should identify profileType as Container'
    );
    Assert.areEqual(
      'projects/test-proj/locations/global/conversationProfiles/cp-123',
      res.conversationProfile,
      'Should load conversationProfile'
    );
    Assert.areEqual('chat', res.channel, 'Should load channel');
    Assert.areEqual('base', res.platform, 'Should load platform');
    Assert.isTrue(res.debugMode, 'Should load debugMode');
    Assert.isTrue(res.isFound, 'Default profile should be marked as found');
  }

  @IsTest
  static void testGetResolvedConfigCompanionAgent() {
    Test.startTest();
    AgentAssistConfigController.ConfigWrapper res = AgentAssistConfigController.getResolvedConfig(
      'Default_Companion'
    );
    Test.stopTest();

    Assert.areEqual(
      'Google Cloud Companion Agent',
      res.title,
      'Should load Companion Agent title'
    );
    Assert.areEqual(
      'Companion Agent',
      res.profileType,
      'Should identify profileType as Companion Agent'
    );
    Assert.areEqual(
      'gemini-1.5-pro',
      res.modelName,
      'Should load modelName for Companion Agent'
    );
    Assert.isTrue(
      res.enableAutonomousActions,
      'Should enable autonomous actions for Companion Agent'
    );
    Assert.isTrue(res.isFound, 'Companion profile should be marked as found');
  }

  @IsTest
  static void testGetResolvedConfigDeletedOrMissing() {
    Test.startTest();
    AgentAssistConfigController.ConfigWrapper res = AgentAssistConfigController.getResolvedConfig(
      'NonExistent_Config'
    );
    Test.stopTest();

    Assert.isFalse(
      res.isFound,
      'Missing or deleted profile should return isFound = false'
    );
    Assert.areEqual(
      'LWC Configuration Profile Deleted',
      res.title,
      'Should set title to error state'
    );
  }

  @IsTest
  static void testGetAllConfigsAndSaveDelete() {
    Test.startTest();
    List<Agent_Assist_Config__c> configs = AgentAssistConfigController.getAllConfigs();
    Assert.isTrue(
      configs.size() >= 2,
      'Should return at least the 2 default configs'
    );

    Agent_Assist_Config__c newCompanion = new Agent_Assist_Config__c(
      Name = 'Support Companion',
      Developer_Name__c = 'Support_Companion',
      Profile_Type__c = 'Companion Agent',
      Title__c = 'Tier 2 Support Companion',
      Model_Name__c = 'gemini-1.5-flash',
      Welcome_Message__c = 'Welcome to Support Companion.',
      Enable_Autonomous_Actions__c = true,
      Is_Active__c = true
    );
    Agent_Assist_Config__c saved = AgentAssistConfigController.saveConfig(
      newCompanion
    );
    Assert.isNotNull(saved.Id, 'Saved config should have an ID');

    AgentAssistConfigController.deleteConfig(saved.Id);
    Test.stopTest();
  }

  @IsTest
  static void testDynamicPickLists() {
    Test.startTest();
    AgentAssistConfigPicklist containerPicklist = new AgentAssistConfigPicklist();
    VisualEditor.DataRow containerDefault = containerPicklist.getDefaultValue();
    VisualEditor.DynamicPickListRows containerRows = containerPicklist.getValues();

    AgentAssistCompanionPicklist companionPicklist = new AgentAssistCompanionPicklist();
    VisualEditor.DataRow companionDefault = companionPicklist.getDefaultValue();
    VisualEditor.DynamicPickListRows companionRows = companionPicklist.getValues();
    Test.stopTest();

    Assert.isNotNull(containerDefault, 'Container default should not be null');
    Assert.isTrue(
      containerRows.size() >= 1,
      'Should return picklist rows for container config'
    );

    Assert.isNotNull(companionDefault, 'Companion default should not be null');
    Assert.isTrue(
      companionRows.size() >= 1,
      'Should return picklist rows for companion config'
    );
  }

  @IsTest
  static void testGetActiveUsers() {
    Test.startTest();
    List<Map<String, String>> users = AgentAssistConfigController.getActiveUsers();
    Test.stopTest();

    Assert.isNotNull(users, 'Active users list should not be null');
  }

  @IsTest
  static void testGetOrgDiagnostics() {
    Test.startTest();
    AgentAssistConfigController.OrgDiagnosticsWrapper diag = AgentAssistConfigController.getOrgDiagnostics();

    // Model unit test for constructor overloads
    AgentAssistConfigController.DiagnosticItemDetail item1 = new AgentAssistConfigController.DiagnosticItemDetail();
    AgentAssistConfigController.DiagnosticItemDetail item2 = new AgentAssistConfigController.DiagnosticItemDetail(
      'id1',
      'lbl',
      'sub',
      'pass',
      'err',
      new List<String>{ 'user1' }
    );
    AgentAssistConfigController.DiagnosticItemDetail item3 = new AgentAssistConfigController.DiagnosticItemDetail(
      'id2',
      'lbl',
      'sub',
      'warning',
      'err',
      new List<String>{ 'user1' },
      5
    );
    AgentAssistConfigController.DiagnosticItemDetail item4 = new AgentAssistConfigController.DiagnosticItemDetail(
      'id3',
      'lbl',
      'sub',
      'fail',
      'err',
      new List<String>{ 'user1' },
      10,
      '/url'
    );

    AgentAssistConfigController.DiagnosticSection sec = new AgentAssistConfigController.DiagnosticSection();
    Test.stopTest();

    Assert.isNotNull(diag, 'Diagnostics wrapper should not be null');
    Assert.isTrue(
      diag.sections.size() >= 5,
      'Should return at least 5 diagnostic sections'
    );
    Assert.isTrue(diag.isHealthy, 'Org should be reported as healthy');
    Assert.areEqual('pass', item1.status, 'Default status should be pass');
    Assert.areEqual(
      1,
      item2.totalCount,
      'Item2 should infer count from assignees list'
    );
    Assert.areEqual(5, item3.totalCount, 'Item3 should preserve custom count');
    Assert.areEqual('/url', item4.setupUrl, 'Item4 should preserve setup URL');
    Assert.areEqual(
      'OK',
      sec.statusBadge,
      'Section default badge should be OK'
    );
  }

  @IsTest
  static void testCheckEndpointHealth() {
    Test.startTest();
    Map<String, Object> resEmpty = AgentAssistConfigController.checkEndpointHealth(
      ''
    );
    Map<String, Object> res200 = AgentAssistConfigController.checkEndpointHealth(
      'https://ui-connector-test.run.app'
    );
    Map<String, Object> res404 = AgentAssistConfigController.checkEndpointHealth(
      'https://api.example.com/404'
    );
    Map<String, Object> res500 = AgentAssistConfigController.checkEndpointHealth(
      'https://api.example.com/500'
    );
    Map<String, Object> resBlocked = AgentAssistConfigController.checkEndpointHealth(
      'https://unauthorized-blocked-domain.com/endpoint'
    );
    Test.stopTest();

    Assert.areEqual(
      'warning',
      resEmpty.get('status'),
      'Empty endpoint should return warning'
    );
    Assert.areEqual(
      'pass',
      res200.get('status'),
      '200 endpoint should return pass'
    );
    Assert.areEqual(
      'warning',
      res404.get('status'),
      '404 endpoint should return warning'
    );
    Assert.areEqual(
      'fail',
      res500.get('status'),
      '500 endpoint should return fail'
    );
    Assert.areEqual(
      'fail',
      resBlocked.get('status'),
      'Blocked endpoint should return fail status'
    );
  }

  @IsTest
  static void testRegisterAuthToken() {
    Test.startTest();
    Map<String, Object> res = AgentAssistConfigController.registerAuthToken(
      'Default',
      'https://ui-connector-test.run.app',
      'test-key',
      'test-secret',
      'test-user'
    );
    Test.stopTest();

    Assert.areEqual(
      'success',
      res.get('status'),
      'registerAuthToken should return success in test context'
    );
    Assert.isNotNull(res.get('token'), 'JWT token should be returned');
  }

  @IsTest
  static void testRegisterAuthTokenWithoutEcaDetails() {
    Test.startTest();
    Map<String, Object> res = AgentAssistConfigController.registerAuthToken(
      'Default',
      'https://ui-connector-test.run.app',
      '',
      '',
      ''
    );
    Test.stopTest();

    Assert.areEqual(
      'success',
      res.get('status'),
      'registerAuthToken should return success even without ECA details in test context'
    );
    Assert.isNotNull(res.get('token'), 'JWT token should be returned');
  }

  @IsTest
  static void testUserPermissionSetManagement() {
    Test.startTest();
    List<Map<String, Object>> userList = AgentAssistConfigController.getUsersWithPermissionSetStatus();
    Assert.isNotNull(userList, 'User list with permission set status should not be null');

    Map<String, Object> assignRes = AgentAssistConfigController.toggleUserPermissionSetAssignment(
      UserInfo.getUserId(),
      true
    );
    Assert.isTrue((Boolean) assignRes.get('success'), 'Assign permission set should succeed');

    Map<String, Object> unassignRes = AgentAssistConfigController.toggleUserPermissionSetAssignment(
      UserInfo.getUserId(),
      false
    );
    Assert.isTrue((Boolean) unassignRes.get('success'), 'Unassign permission set should succeed');
    Test.stopTest();
  }
}
