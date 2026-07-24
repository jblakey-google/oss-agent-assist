// Script to deactivate/clean up fake test users created for testing
List<User> fakeUsers = [SELECT Id, IsActive FROM User WHERE Username LIKE '%@agentassist.fake' AND IsActive = true];
for (User u : fakeUsers) {
    u.IsActive = false;
}
update fakeUsers;
System.debug('Deactivated ' + fakeUsers.size() + ' fake users.');
