// Create a LIKES relationship between user and comment
MERGE (user:User {id: $userId})
MERGE (comment:Comment {id: $commentId})
MERGE (user)-[r:LIKES_COMMENT {
  likeId: $likeId,
  createdAt: datetime($createdAt)
}]->(comment)
RETURN r
