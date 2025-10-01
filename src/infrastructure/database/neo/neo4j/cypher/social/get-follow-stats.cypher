// Get follow statistics for a user
MATCH (user:User {id: $userId})
OPTIONAL MATCH (user)-[:FOLLOWS]->(following)
OPTIONAL MATCH (follower)-[:FOLLOWS]->(user)
RETURN count(DISTINCT following) as followingCount,
       count(DISTINCT follower) as followersCount
