// Script to create fake Salesforce users for testing user search & picklist UX
Profile p = [SELECT Id FROM Profile WHERE UserLicense.Name = 'Salesforce Platform' OR Name = 'Standard Platform User' LIMIT 1];
if (p == null) {
    p = [SELECT Id FROM Profile WHERE UserLicense.Name = 'Salesforce' OR Name = 'Standard User' LIMIT 1];
}

List<User> fakeUsers = new List<User>();
Long ts = System.currentTimeMillis();

// Creates up to 3 Salesforce Platform users (matching license limit in dev orgs)
for (Integer i = 1; i <= 3; i++) {
    String numStr = String.valueOf(i);
    fakeUsers.add(new User(
        FirstName = 'Agent',
        LastName = 'PlatformUser ' + numStr,
        Email = 'platformuser' + numStr + '@example.com',
        Username = 'platformuser' + numStr + '.' + ts + '@agentassist.fake',
        Alias = 'plt' + numStr,
        CommunityNickname = 'platformuser' + numStr + '_' + ts,
        TimeZoneSidKey = 'America/Los_Angeles',
        LocaleSidKey = 'en_US',
        EmailEncodingKey = 'UTF-8',
        LanguageLocaleKey = 'en_US',
        ProfileId = p.Id,
        IsActive = true
    ));
}

insert fakeUsers;
System.debug('Created ' + fakeUsers.size() + ' fake users with Salesforce Platform license successfully.');
