// Create a REPLIES_TO relationship between comments
MERGE (user:User {id: $authorId})
CREATE (user)-[r:REPLIES_TO {
  commentId: $commentId,
  parentCommentId: $parentCommentId,
  createdAt: datetime($createdAt)
}]->(:Comment {id: $parentCommentId})
RETURN r
