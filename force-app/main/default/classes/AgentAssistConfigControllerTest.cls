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
    List<Agent_Assist_Config__c> testConfigs = new List<Agent_Assist_Config__c>{
      new Agent_Assist_Config__c(
        Name = 'Default Profile',
        Developer_Name__c = 'Default',
        Profile_Type__c = 'Container',
        Title__c = 'Google Cloud Agent Assist',
        Endpoint_URL__c = 'https://api.example.com/v1',
        Conversation_Profile__c = 'projects/test-proj/locations/global/conversationProfiles/cp-123',
        Channel__c = 'chat',
        Platform__c = 'messaging',
        Consumer_Key__c = 'ck_123',
        Consumer_Secret__c = 'cs_123',
        Container_Height__c = '530px',
        Debug_Mode__c = true,
        Show_Dark_Mode_Toggle__c = true,
        Show_Header__c = false,
        Show_Correctness_Feedback__c = false,
        Disabled_Features__c = 'smart-reply',
        Is_Active__c = true
      ),
      new Agent_Assist_Config__c(
        Name = 'Default Companion Agent',
        Developer_Name__c = 'Default_Companion',
        Profile_Type__c = 'Companion Agent',
        Title__c = 'Google Cloud Companion Agent',
        Endpoint_URL__c = 'https://api.example.com/v1',
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
    Assert.areEqual('messaging', res.platform, 'Should load platform');
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
      'Configuration Profile Deleted',
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
}
