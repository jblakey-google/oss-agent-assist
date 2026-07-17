public with sharing class AgentAssistConfigController {

    public class ConfigWrapper {
        @AuraEnabled public String id { get; set; }
        @AuraEnabled public String name { get; set; }
        @AuraEnabled public String developerName { get; set; }
        @AuraEnabled public String title { get; set; }
        @AuraEnabled public String endpointUrl { get; set; }
        @AuraEnabled public Boolean showSuggestions { get; set; }
        @AuraEnabled public Boolean enableAutoAssist { get; set; }
        @AuraEnabled public String targetObject { get; set; }
        @AuraEnabled public Boolean isActive { get; set; }
        @AuraEnabled public String additionalConfigJson { get; set; }
        @AuraEnabled public String resolutionSource { get; set; }
    }

    /**
     * Retrieves the resolved configuration state for a container instance.
     * Evaluates App Builder XML overrides > Named Profile > SObject Match > Org Default.
     */
    @AuraEnabled(cacheable=true)
    public static ConfigWrapper getResolvedConfig(
        String configName,
        String objectApiName,
        String xmlTitle,
        Boolean xmlShowSuggestions,
        Boolean xmlEnableAutoAssist
    ) {
        ConfigWrapper result = new ConfigWrapper();
        result.developerName = String.isNotBlank(configName) ? configName : 'Default';
        result.name = 'Default Profile';
        result.title = 'Agent Assist';
        result.endpointUrl = 'https://api.agentassist.example.com/v1';
        result.showSuggestions = true;
        result.enableAutoAssist = true;
        result.targetObject = String.isNotBlank(objectApiName) ? objectApiName : 'Global';
        result.isActive = true;
        result.resolutionSource = 'Built-in In-Memory Default';

        try {
            List<Agent_Assist_Config__c> matchingConfigs = new List<Agent_Assist_Config__c>();
            
            // 1. Try finding by explicit developer name
            if (String.isNotBlank(configName)) {
                matchingConfigs = [
                    SELECT Id, Name, Developer_Name__c, Title__c, Endpoint_URL__c,
                           Show_Suggestions__c, Enable_Auto_Assist__c, Target_Object__c,
                           Is_Active__c, Additional_Config_JSON__c
                    FROM Agent_Assist_Config__c
                    WHERE Developer_Name__c = :configName AND Is_Active__c = true
                    WITH USER_MODE
                    LIMIT 1
                ];
            }

            // 2. Try finding by Target Object if not found by name
            if (matchingConfigs.isEmpty() && String.isNotBlank(objectApiName)) {
                matchingConfigs = [
                    SELECT Id, Name, Developer_Name__c, Title__c, Endpoint_URL__c,
                           Show_Suggestions__c, Enable_Auto_Assist__c, Target_Object__c,
                           Is_Active__c, Additional_Config_JSON__c
                    FROM Agent_Assist_Config__c
                    WHERE Target_Object__c = :objectApiName AND Is_Active__c = true
                    WITH USER_MODE
                    LIMIT 1
                ];
            }

            // 3. Fallback to Default profile
            if (matchingConfigs.isEmpty()) {
                matchingConfigs = [
                    SELECT Id, Name, Developer_Name__c, Title__c, Endpoint_URL__c,
                           Show_Suggestions__c, Enable_Auto_Assist__c, Target_Object__c,
                           Is_Active__c, Additional_Config_JSON__c
                    FROM Agent_Assist_Config__c
                    WHERE Developer_Name__c = 'Default' AND Is_Active__c = true
                    WITH USER_MODE
                    LIMIT 1
                ];
            }

            // Apply database record values if found
            if (!matchingConfigs.isEmpty()) {
                Agent_Assist_Config__c cfg = matchingConfigs[0];
                result.id = cfg.Id;
                result.name = cfg.Name;
                result.developerName = cfg.Developer_Name__c;
                if (String.isNotBlank(cfg.Title__c)) result.title = cfg.Title__c;
                if (String.isNotBlank(cfg.Endpoint_URL__c)) result.endpointUrl = cfg.Endpoint_URL__c;
                if (cfg.Show_Suggestions__c != null) result.showSuggestions = cfg.Show_Suggestions__c;
                if (cfg.Enable_Auto_Assist__c != null) result.enableAutoAssist = cfg.Enable_Auto_Assist__c;
                if (String.isNotBlank(cfg.Target_Object__c)) result.targetObject = cfg.Target_Object__c;
                result.additionalConfigJson = cfg.Additional_Config_JSON__c;
                result.resolutionSource = 'Database Record [' + cfg.Name + ' (' + cfg.Developer_Name__c + ')]';
            }
        } catch (Exception ex) {
            result.resolutionSource = 'Fallback Default (Exception: ' + ex.getMessage() + ')';
        }

        // Apply XML Design Property Overrides if specified in App Builder
        if (String.isNotBlank(xmlTitle)) {
            result.title = xmlTitle;
            result.resolutionSource += ' + XML Title Override';
        }
        if (xmlShowSuggestions != null) {
            result.showSuggestions = xmlShowSuggestions;
        }
        if (xmlEnableAutoAssist != null) {
            result.enableAutoAssist = xmlEnableAutoAssist;
        }

        return result;
    }

    /**
     * Returns all configuration records for the Setup Wizard.
     */
    @AuraEnabled(cacheable=true)
    public static List<Agent_Assist_Config__c> getAllConfigs() {
        try {
            return [
                SELECT Id, Name, Developer_Name__c, Title__c, Endpoint_URL__c,
                       Show_Suggestions__c, Enable_Auto_Assist__c, Target_Object__c,
                       Is_Active__c, Additional_Config_JSON__c, LastModifiedDate
                FROM Agent_Assist_Config__c
                WITH USER_MODE
                ORDER BY Name ASC
            ];
        } catch (Exception ex) {
            return new List<Agent_Assist_Config__c>();
        }
    }

    /**
     * Saves or upserts a configuration profile from the Setup Wizard.
     */
    @AuraEnabled
    public static Agent_Assist_Config__c saveConfig(Agent_Assist_Config__c configRecord) {
        if (configRecord == null) {
            throw new AuraHandledException('Config record cannot be null');
        }
        if (String.isBlank(configRecord.Developer_Name__c)) {
            configRecord.Developer_Name__c = configRecord.Name.replaceAll('[^a-zA-Z0-9]', '_');
        }
        upsert as user configRecord Developer_Name__c;
        return configRecord;
    }

    /**
     * Deletes a configuration profile.
     */
    @AuraEnabled
    public static void deleteConfig(Id configId) {
        if (configId != null) {
            delete as user [SELECT Id FROM Agent_Assist_Config__c WHERE Id = :configId WITH USER_MODE];
        }
    }
}
