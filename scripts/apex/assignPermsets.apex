// Intelligently assign Agent_Assist_Admin permission set to all active System Administrator users
List<PermissionSet> permSets = [SELECT Id FROM PermissionSet WHERE Name = 'Agent_Assist_Admin' LIMIT 1];

if (!permSets.isEmpty()) {
    Id permSetId = permSets[0].Id;
    
    // Collect users who already have this permission set
    Set<Id> alreadyAssignedUserIds = new Set<Id>();
    for (PermissionSetAssignment psa : [
        SELECT AssigneeId 
        FROM PermissionSetAssignment 
        WHERE PermissionSetId = :permSetId
    ]) {
        alreadyAssignedUserIds.add(psa.AssigneeId);
    }
    
    // Find all active System Administrator users
    List<User> adminUsers = [
        SELECT Id, Username 
        FROM User 
        WHERE IsActive = true 
        AND Profile.Name = 'System Administrator'
    ];
    
    List<PermissionSetAssignment> toInsert = new List<PermissionSetAssignment>();
    for (User u : adminUsers) {
        if (!alreadyAssignedUserIds.contains(u.Id)) {
            toInsert.add(new PermissionSetAssignment(
                AssigneeId = u.Id, 
                PermissionSetId = permSetId
            ));
        }
    }
    
    if (!toInsert.isEmpty()) {
        insert toInsert;
        System.debug('Successfully assigned Agent_Assist_Admin to ' + toInsert.size() + ' System Administrator user(s).');
    } else {
        System.debug('All active System Administrator users already have Agent_Assist_Admin assigned.');
    }
}
