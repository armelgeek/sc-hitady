// Delete comment relationship
MATCH (user:User)-[r:COMMENTS_ON {commentId: $commentId}]->(post:Post)
DELETE r
RETURN count(r) as deleted
