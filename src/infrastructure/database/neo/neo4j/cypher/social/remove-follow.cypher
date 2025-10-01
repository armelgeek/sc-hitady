// Remove FOLLOWS relationship between follower and following
MATCH (follower:User {id: $followerId})-[r:FOLLOWS]->(following:User {id: $followingId})
DELETE r
RETURN count(r) as deleted
