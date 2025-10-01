// Get list of users following a specific user
MATCH (follower:User)-[r:FOLLOWS]->(following:User {id: $userId})
RETURN follower.id as userId, 
       r.followId as followId,
       r.notificationsEnabled as notificationsEnabled,
       r.createdAt as createdAt
ORDER BY r.createdAt DESC
SKIP $skip
LIMIT $limit
