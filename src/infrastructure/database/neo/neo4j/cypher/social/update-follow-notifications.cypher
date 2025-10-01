// Update notification settings for a follow relationship
MATCH (follower:User {id: $followerId})-[r:FOLLOWS]->(following:User {id: $followingId})
SET r.notificationsEnabled = $notificationsEnabled
RETURN r
