@IsTest
private class AgentAssistConfigControllerTest {

    @TestSetup
    static void setupTestData() {
        Agent_Assist_Config__c defaultConfig = new Agent_Assist_Config__c(
            Name = 'Default Profile',
            Developer_Name__c = 'Default',
            Title__c = 'Agent Assist',
            Endpoint_URL__c = 'https://api.example.com/v1',
            Show_Suggestions__c = true,
            Enable_Auto_Assist__c = true,
            Is_Active__c = true
        );
        insert defaultConfig;
    }

    @IsTest
    static void testGetResolvedConfigByName() {
        Test.startTest();
        AgentAssistConfigController.ConfigWrapper res = AgentAssistConfigController.getResolvedConfig('Default');
        Test.stopTest();

        Assert.areEqual('Agent Assist', res.title, 'Should load Default title from DB profile');
        Assert.isTrue(res.enableAutoAssist, 'Should load Default enableAutoAssist from DB profile');
        Assert.isTrue(res.isFound, 'Default profile should be marked as found');
    }

    @IsTest
    static void testGetResolvedConfigDeletedOrMissing() {
        Test.startTest();
        AgentAssistConfigController.ConfigWrapper res = AgentAssistConfigController.getResolvedConfig('NonExistent_Config');
        Test.stopTest();

        Assert.isFalse(res.isFound, 'Missing or deleted profile should return isFound = false');
        Assert.areEqual('Configuration Profile Deleted', res.title, 'Should set title to error state');
    }

    @IsTest
    static void testGetAllConfigsAndSaveDelete() {
        Test.startTest();
        List<Agent_Assist_Config__c> configs = AgentAssistConfigController.getAllConfigs();
        Assert.isTrue(configs.size() >= 1, 'Should return at least the 1 default config');

        Agent_Assist_Config__c newCfg = new Agent_Assist_Config__c(
            Name = 'Contact Sales Profile',
            Developer_Name__c = 'Contact_Config',
            Title__c = 'Contact Sales Assist',
            Is_Active__c = true
        );
        Agent_Assist_Config__c saved = AgentAssistConfigController.saveConfig(newCfg);
        Assert.isNotNull(saved.Id, 'Saved config should have an ID');

        AgentAssistConfigController.deleteConfig(saved.Id);
        Test.stopTest();
    }

    @IsTest
    static void testDynamicPickList() {
        Test.startTest();
        AgentAssistConfigPicklist picklist = new AgentAssistConfigPicklist();
        VisualEditor.DataRow defaultVal = picklist.getDefaultValue();
        VisualEditor.DynamicPickListRows rows = picklist.getValues();
        Test.stopTest();

        Assert.isNotNull(defaultVal, 'Default value should not be null');
        Assert.isTrue(rows.size() >= 1, 'Should return picklist row for default config');
    }
}
