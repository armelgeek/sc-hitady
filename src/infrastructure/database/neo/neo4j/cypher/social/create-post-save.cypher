// Create a SAVES relationship between user and post
MERGE (user:User {id: $userId})
MERGE (post:Post {id: $postId})
MERGE (user)-[r:SAVES {
  saveId: $saveId,
  collectionName: $collectionName,
  savedAt: datetime($savedAt)
}]->(post)
RETURN r
