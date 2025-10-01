// Create a FOLLOWS relationship between follower and following
MERGE (follower:User {id: $followerId})
MERGE (following:User {id: $followingId})
MERGE (follower)-[r:FOLLOWS {
  followId: $followId,
  notificationsEnabled: $notificationsEnabled,
  createdAt: datetime($createdAt)
}]->(following)
RETURN r
