// Get like count for a comment
MATCH (user:User)-[r:LIKES_COMMENT]->(comment:Comment {id: $commentId})
RETURN count(r) as likeCount
