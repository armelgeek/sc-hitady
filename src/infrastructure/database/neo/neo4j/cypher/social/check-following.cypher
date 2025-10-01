// Check if a user is following another user
MATCH (follower:User {id: $followerId})-[r:FOLLOWS]->(following:User {id: $followingId})
RETURN count(r) > 0 as isFollowing
