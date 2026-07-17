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

public without sharing class AgentAssistConfigController {
  public class ConfigWrapper {
    @AuraEnabled
    public String id { get; set; }
    @AuraEnabled
    public String name { get; set; }
    @AuraEnabled
    public String developerName { get; set; }
    @AuraEnabled
    public String profileType { get; set; } // 'Container' or 'Companion Agent'
    @AuraEnabled
    public String title { get; set; }
    @AuraEnabled
    public String endpointUrl { get; set; }
    @AuraEnabled
    public Boolean showSuggestions { get; set; }
    @AuraEnabled
    public Boolean enableAutoAssist { get; set; }
    @AuraEnabled
    public String modelName { get; set; }
    @AuraEnabled
    public String welcomeMessage { get; set; }
    @AuraEnabled
    public Boolean enableAutonomousActions { get; set; }
    @AuraEnabled
    public Boolean isActive { get; set; }
    @AuraEnabled
    public String additionalConfigJson { get; set; }
    @AuraEnabled
    public String resolutionSource { get; set; }
    @AuraEnabled
    public Boolean isFound { get; set; }
  }

  /**
   * Retrieves the resolved configuration state for a container or companion agent instance.
   * Note: cacheable=true methods must be strictly read-only and cannot execute DML.
   */
  @AuraEnabled(cacheable=true)
  public static ConfigWrapper getResolvedConfig(String configName) {
    ConfigWrapper result = new ConfigWrapper();
    String targetDevName = String.isNotBlank(configName)
      ? configName
      : 'Default';
    result.developerName = targetDevName;
    result.name = targetDevName;
    result.profileType = 'Container';
    result.title = 'Google Cloud Agent Assist';
    result.endpointUrl = 'https://api.agentassist.example.com/v1';
    result.showSuggestions = true;
    result.enableAutoAssist = true;
    result.modelName = 'gemini-1.5-pro';
    result.welcomeMessage = 'Hello! I am your AI Companion Agent. How can I assist you with this record today?';
    result.enableAutonomousActions = true;
    result.isActive = true;

    try {
      List<Agent_Assist_Config__c> matchingConfigs = [
        SELECT
          Id,
          Name,
          Developer_Name__c,
          Profile_Type__c,
          Title__c,
          Endpoint_URL__c,
          Show_Suggestions__c,
          Enable_Auto_Assist__c,
          Model_Name__c,
          Welcome_Message__c,
          Enable_Autonomous_Actions__c,
          Is_Active__c,
          Additional_Config_JSON__c
        FROM Agent_Assist_Config__c
        WHERE Developer_Name__c = :targetDevName AND Is_Active__c = TRUE
        LIMIT 1
      ];

      if (!matchingConfigs.isEmpty()) {
        Agent_Assist_Config__c cfg = matchingConfigs[0];
        result.id = cfg.Id;
        result.name = cfg.Name;
        result.developerName = cfg.Developer_Name__c;
        result.profileType = String.isNotBlank(cfg.Profile_Type__c)
          ? cfg.Profile_Type__c
          : (cfg.Developer_Name__c == 'Default_Companion'
              ? 'Companion Agent'
              : 'Container');

        if (String.isNotBlank(cfg.Title__c)) {
          result.title = cfg.Title__c;
        } else if (result.profileType == 'Companion Agent') {
          result.title = 'Google Cloud Companion Agent';
        }

        if (String.isNotBlank(cfg.Endpoint_URL__c)) {
          result.endpointUrl = cfg.Endpoint_URL__c;
        }
        if (cfg.Show_Suggestions__c != null) {
          result.showSuggestions = cfg.Show_Suggestions__c;
        }
        if (cfg.Enable_Auto_Assist__c != null) {
          result.enableAutoAssist = cfg.Enable_Auto_Assist__c;
        }
        if (String.isNotBlank(cfg.Model_Name__c)) {
          result.modelName = cfg.Model_Name__c;
        }
        if (String.isNotBlank(cfg.Welcome_Message__c)) {
          result.welcomeMessage = cfg.Welcome_Message__c;
        }
        if (cfg.Enable_Autonomous_Actions__c != null) {
          result.enableAutonomousActions = cfg.Enable_Autonomous_Actions__c;
        }

        result.additionalConfigJson = cfg.Additional_Config_JSON__c;
        result.resolutionSource =
          'Database Record [' +
          cfg.Name +
          ' (' +
          cfg.Developer_Name__c +
          ') - ' +
          result.profileType +
          ']';
        result.isFound = true;
      } else if (targetDevName == 'Default') {
        result.name = 'Default Profile';
        result.profileType = 'Container';
        result.title = 'Google Cloud Agent Assist';
        result.resolutionSource = 'Built-in Default Container';
        result.isFound = true;
      } else if (targetDevName == 'Default_Companion') {
        result.name = 'Default Companion Agent';
        result.profileType = 'Companion Agent';
        result.title = 'Google Cloud Companion Agent';
        result.resolutionSource = 'Built-in Default Companion Agent';
        result.isFound = true;
      } else {
        result.isFound = false;
        result.title = 'Configuration Profile Deleted';
        result.resolutionSource =
          'Profile "' +
          targetDevName +
          '" Not Found / Deleted';
      }
    } catch (Exception ex) {
      result.isFound = false;
      result.resolutionSource = 'Error: ' + ex.getMessage();
    }

    return result;
  }

  /**
   * Returns all configuration records for the Setup Wizard and Picklist.
   * Note: cacheable=true methods must be strictly read-only and cannot execute DML.
   */
  @AuraEnabled(cacheable=true)
  public static List<Agent_Assist_Config__c> getAllConfigs() {
    try {
      List<Agent_Assist_Config__c> configs = [
        SELECT
          Id,
          Name,
          Developer_Name__c,
          Profile_Type__c,
          Title__c,
          Endpoint_URL__c,
          Show_Suggestions__c,
          Enable_Auto_Assist__c,
          Model_Name__c,
          Welcome_Message__c,
          Enable_Autonomous_Actions__c,
          Is_Active__c,
          Additional_Config_JSON__c,
          LastModifiedDate
        FROM Agent_Assist_Config__c
        ORDER BY Profile_Type__c ASC, Name ASC
      ];

      if (configs.isEmpty()) {
        return new List<Agent_Assist_Config__c>{
          new Agent_Assist_Config__c(
            Name = 'Default Profile',
            Developer_Name__c = 'Default',
            Profile_Type__c = 'Container',
            Title__c = 'Google Cloud Agent Assist',
            Endpoint_URL__c = 'https://api.agentassist.example.com/v1',
            Enable_Auto_Assist__c = true,
            Show_Suggestions__c = true,
            Is_Active__c = true
          ),
          new Agent_Assist_Config__c(
            Name = 'Default Companion Agent',
            Developer_Name__c = 'Default_Companion',
            Profile_Type__c = 'Companion Agent',
            Title__c = 'Google Cloud Companion Agent',
            Endpoint_URL__c = 'https://api.agentassist.example.com/v1',
            Model_Name__c = 'gemini-1.5-pro',
            Welcome_Message__c = 'Hello! I am your AI Companion Agent. How can I assist you with this record today?',
            Enable_Autonomous_Actions__c = true,
            Is_Active__c = true
          )
        };
      }

      return configs;
    } catch (Exception ex) {
      return new List<Agent_Assist_Config__c>();
    }
  }

  /**
   * Seeds default configuration records (Container and Companion Agent) into the database.
   */
  @AuraEnabled
  public static void seedDefaultConfigs() {
    List<Agent_Assist_Config__c> defaults = new List<Agent_Assist_Config__c>{
      new Agent_Assist_Config__c(
        Name = 'Default Profile',
        Developer_Name__c = 'Default',
        Profile_Type__c = 'Container',
        Title__c = 'Google Cloud Agent Assist',
        Endpoint_URL__c = 'https://api.agentassist.example.com/v1',
        Enable_Auto_Assist__c = true,
        Show_Suggestions__c = true,
        Is_Active__c = true
      ),
      new Agent_Assist_Config__c(
        Name = 'Default Companion Agent',
        Developer_Name__c = 'Default_Companion',
        Profile_Type__c = 'Companion Agent',
        Title__c = 'Google Cloud Companion Agent',
        Endpoint_URL__c = 'https://api.agentassist.example.com/v1',
        Model_Name__c = 'gemini-1.5-pro',
        Welcome_Message__c = 'Hello! I am your AI Companion Agent. How can I assist you with this record today?',
        Enable_Autonomous_Actions__c = true,
        Is_Active__c = true
      )
    };

    try {
      upsert defaults Developer_Name__c;
    } catch (Exception ex) {
      // Log or ignore if read-only
    }
  }

  /**
   * Saves or updates a configuration profile from the Setup Wizard.
   */
  @AuraEnabled
  public static Agent_Assist_Config__c saveConfig(
    Agent_Assist_Config__c configRecord
  ) {
    if (configRecord == null) {
      throw new AuraHandledException('Config record cannot be null');
    }
    if (String.isBlank(configRecord.Developer_Name__c)) {
      configRecord.Developer_Name__c = configRecord.Name.replaceAll(
        '[^a-zA-Z0-9]',
        '_'
      );
    }
    if (String.isBlank(configRecord.Profile_Type__c)) {
      configRecord.Profile_Type__c = 'Container';
    }
    if (configRecord.Id != null) {
      update configRecord;
    } else {
      upsert configRecord Developer_Name__c;
    }
    return configRecord;
  }

  /**
   * Deletes a configuration profile.
   */
  @AuraEnabled
  public static void deleteConfig(Id configId) {
    if (configId != null) {
      delete [SELECT Id FROM Agent_Assist_Config__c WHERE Id = :configId];
    }
  }
}
