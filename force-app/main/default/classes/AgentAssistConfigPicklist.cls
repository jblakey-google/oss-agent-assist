public with sharing class AgentAssistConfigPicklist extends VisualEditor.DynamicPickList {
  VisualEditor.DesignTimePageContext context;

  public AgentAssistConfigPicklist() {
  }

  public AgentAssistConfigPicklist(VisualEditor.DesignTimePageContext context) {
    this.context = context;
  }

  public override VisualEditor.DataRow getDefaultValue() {
    return new VisualEditor.DataRow('Default Profile (Default)', 'Default');
  }

  public override VisualEditor.DynamicPickListRows getValues() {
    VisualEditor.DynamicPickListRows myValues = new VisualEditor.DynamicPickListRows();

    try {
      List<Agent_Assist_Config__c> configs = AgentAssistConfigController.getAllConfigs();
      Set<String> addedDevNames = new Set<String>();

      for (Agent_Assist_Config__c cfg : configs) {
        if (
          String.isNotBlank(cfg.Developer_Name__c) &&
          !addedDevNames.contains(cfg.Developer_Name__c)
        ) {
          String label = cfg.Name + ' (' + cfg.Developer_Name__c + ')';
          myValues.addRow(
            new VisualEditor.DataRow(label, cfg.Developer_Name__c)
          );
          addedDevNames.add(cfg.Developer_Name__c);
        }
      }

      if (!addedDevNames.contains('Default')) {
        myValues.addRow(
          new VisualEditor.DataRow('Default Profile (Default)', 'Default')
        );
      }
    } catch (Exception ex) {
      myValues.addRow(
        new VisualEditor.DataRow('Default Profile (Default)', 'Default')
      );
    }

    return myValues;
  }
}
