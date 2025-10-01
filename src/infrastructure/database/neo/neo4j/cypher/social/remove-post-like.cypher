// Remove LIKES relationship between user and post
MATCH (user:User {id: $userId})-[r:LIKES]->(post:Post {id: $postId})
DELETE r
RETURN count(r) as deleted
