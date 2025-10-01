// Create a LIKES relationship between user and post
MERGE (user:User {id: $userId})
MERGE (post:Post {id: $postId})
MERGE (user)-[r:LIKES {
  likeId: $likeId,
  createdAt: datetime($createdAt)
}]->(post)
RETURN r
