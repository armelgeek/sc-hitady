// Create a COMMENTS_ON relationship between user and post
MERGE (user:User {id: $authorId})
MERGE (post:Post {id: $postId})
CREATE (user)-[r:COMMENTS_ON {
  commentId: $commentId,
  createdAt: datetime($createdAt)
}]->(post)
RETURN r
