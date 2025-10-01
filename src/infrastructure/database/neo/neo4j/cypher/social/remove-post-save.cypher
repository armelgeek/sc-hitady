// Remove SAVES relationship between user and post
MATCH (user:User {id: $userId})-[r:SAVES]->(post:Post {id: $postId})
DELETE r
RETURN count(r) as deleted
