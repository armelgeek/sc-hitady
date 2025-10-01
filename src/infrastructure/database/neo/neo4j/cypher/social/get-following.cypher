// Get list of users that a user is following
MATCH (follower:User {id: $userId})-[r:FOLLOWS]->(following:User)
RETURN following.id as userId, 
       r.followId as followId,
       r.notificationsEnabled as notificationsEnabled,
       r.createdAt as createdAt
ORDER BY r.createdAt DESC
SKIP $skip
LIMIT $limit
