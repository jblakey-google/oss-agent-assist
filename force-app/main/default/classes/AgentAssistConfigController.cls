public without sharing class AgentAssistConfigController {
  public class ConfigWrapper {
    @AuraEnabled
    public String id { get; set; }
    @AuraEnabled
    public String name { get; set; }
    @AuraEnabled
    public String developerName { get; set; }
    @AuraEnabled
    public String title { get; set; }
    @AuraEnabled
    public String endpointUrl { get; set; }
    @AuraEnabled
    public Boolean showSuggestions { get; set; }
    @AuraEnabled
    public Boolean enableAutoAssist { get; set; }
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
   * Retrieves the resolved configuration state for a container instance.
   * If the assigned profile has been deleted or cannot be found, returns isFound = false.
   */
  @AuraEnabled(cacheable=true)
  public static ConfigWrapper getResolvedConfig(String configName) {
    ConfigWrapper result = new ConfigWrapper();
    String targetDevName = String.isNotBlank(configName)
      ? configName
      : 'Default';
    result.developerName = targetDevName;
    result.name = targetDevName;
    result.title = 'Google Cloud Agent Assist';
    result.endpointUrl = 'https://api.agentassist.example.com/v1';
    result.showSuggestions = true;
    result.enableAutoAssist = true;
    result.isActive = true;

    try {
      List<Agent_Assist_Config__c> matchingConfigs = [
        SELECT
          Id,
          Name,
          Developer_Name__c,
          Title__c,
          Endpoint_URL__c,
          Show_Suggestions__c,
          Enable_Auto_Assist__c,
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
        if (String.isNotBlank(cfg.Title__c))
          result.title = cfg.Title__c;
        if (String.isNotBlank(cfg.Endpoint_URL__c))
          result.endpointUrl = cfg.Endpoint_URL__c;
        if (cfg.Show_Suggestions__c != null)
          result.showSuggestions = cfg.Show_Suggestions__c;
        if (cfg.Enable_Auto_Assist__c != null)
          result.enableAutoAssist = cfg.Enable_Auto_Assist__c;
        result.additionalConfigJson = cfg.Additional_Config_JSON__c;
        result.resolutionSource =
          'Database Record [' +
          cfg.Name +
          ' (' +
          cfg.Developer_Name__c +
          ')]';
        result.isFound = true;
      } else if (targetDevName == 'Default') {
        seedDefaultConfigs();
        result.name = 'Default Profile';
        result.resolutionSource = 'Built-in Default';
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
   * Seeds a single default profile if database table is empty.
   */
  @AuraEnabled(cacheable=true)
  public static List<Agent_Assist_Config__c> getAllConfigs() {
    try {
      List<Agent_Assist_Config__c> configs = [
        SELECT
          Id,
          Name,
          Developer_Name__c,
          Title__c,
          Endpoint_URL__c,
          Show_Suggestions__c,
          Enable_Auto_Assist__c,
          Is_Active__c,
          Additional_Config_JSON__c,
          LastModifiedDate
        FROM Agent_Assist_Config__c
        ORDER BY Name ASC
      ];

      if (configs.isEmpty()) {
        seedDefaultConfigs();
        configs = [
          SELECT
            Id,
            Name,
            Developer_Name__c,
            Title__c,
            Endpoint_URL__c,
            Show_Suggestions__c,
            Enable_Auto_Assist__c,
            Is_Active__c,
            Additional_Config_JSON__c,
            LastModifiedDate
          FROM Agent_Assist_Config__c
          ORDER BY Name ASC
        ];
      }

      return configs;
    } catch (Exception ex) {
      return new List<Agent_Assist_Config__c>();
    }
  }

  /**
   * Seeds a single default configuration record into the database.
   */
  public static void seedDefaultConfigs() {
    List<Agent_Assist_Config__c> defaults = new List<Agent_Assist_Config__c>{
      new Agent_Assist_Config__c(
        Name = 'Default Profile',
        Developer_Name__c = 'Default',
        Title__c = 'Google Cloud Agent Assist',
        Endpoint_URL__c = 'https://api.agentassist.example.com/v1',
        Enable_Auto_Assist__c = true,
        Show_Suggestions__c = true,
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
