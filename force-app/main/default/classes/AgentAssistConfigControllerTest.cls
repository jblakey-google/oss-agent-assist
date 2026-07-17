@IsTest
private class AgentAssistConfigControllerTest {

    @TestSetup
    static void setupTestData() {
        Agent_Assist_Config__c defaultConfig = new Agent_Assist_Config__c(
            Name = 'Default Profile',
            Developer_Name__c = 'Default',
            Title__c = 'Global Agent Assist',
            Endpoint_URL__c = 'https://api.example.com/v1',
            Show_Suggestions__c = true,
            Enable_Auto_Assist__c = true,
            Target_Object__c = 'Global',
            Is_Active__c = true
        );
        insert defaultConfig;

        Agent_Assist_Config__c caseConfig = new Agent_Assist_Config__c(
            Name = 'Case Support Profile',
            Developer_Name__c = 'Case_Config',
            Title__c = 'Case Assist',
            Endpoint_URL__c = 'https://api.example.com/case',
            Show_Suggestions__c = true,
            Enable_Auto_Assist__c = false,
            Target_Object__c = 'Case',
            Is_Active__c = true
        );
        insert caseConfig;
    }

    @IsTest
    static void testGetResolvedConfigByName() {
        Test.startTest();
        AgentAssistConfigController.ConfigWrapper res = AgentAssistConfigController.getResolvedConfig('Case_Config', null, null, null, null);
        Test.stopTest();

        Assert.areEqual('Case Assist', res.title, 'Should load Case_Config title');
        Assert.isFalse(res.enableAutoAssist, 'Should load Case_Config enableAutoAssist');
    }

    @IsTest
    static void testGetResolvedConfigByObjectMatch() {
        Test.startTest();
        AgentAssistConfigController.ConfigWrapper res = AgentAssistConfigController.getResolvedConfig(null, 'Case', null, null, null);
        Test.stopTest();

        Assert.areEqual('Case Assist', res.title, 'Should resolve matching config by Target Object');
    }

    @IsTest
    static void testGetResolvedConfigWithXmlOverrides() {
        Test.startTest();
        AgentAssistConfigController.ConfigWrapper res = AgentAssistConfigController.getResolvedConfig('Default', 'Contact', 'Overridden Title', false, false);
        Test.stopTest();

        Assert.areEqual('Overridden Title', res.title, 'XML Title override should take precedence');
        Assert.isFalse(res.showSuggestions, 'XML showSuggestions override should take precedence');
    }

    @IsTest
    static void testGetAllConfigsAndSaveDelete() {
        Test.startTest();
        List<Agent_Assist_Config__c> configs = AgentAssistConfigController.getAllConfigs();
        Assert.isTrue(configs.size() >= 2, 'Should return all inserted configs');

        Agent_Assist_Config__c newCfg = new Agent_Assist_Config__c(
            Name = 'Contact Sales Profile',
            Developer_Name__c = 'Contact_Config',
            Title__c = 'Contact Sales Assist',
            Target_Object__c = 'Contact',
            Is_Active__c = true
        );
        Agent_Assist_Config__c saved = AgentAssistConfigController.saveConfig(newCfg);
        Assert.isNotNull(saved.Id, 'Saved config should have an ID');

        AgentAssistConfigController.deleteConfig(saved.Id);
        Test.stopTest();
    }
}
