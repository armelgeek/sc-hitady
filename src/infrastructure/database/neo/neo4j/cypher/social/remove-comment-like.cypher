// Remove LIKES relationship between user and comment
MATCH (user:User {id: $userId})-[r:LIKES_COMMENT]->(comment:Comment {id: $commentId})
DELETE r
RETURN count(r) as deleted
