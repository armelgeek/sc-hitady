// Create a VIEWED relationship between user and story
MERGE (user:User {id: $viewerId})
MERGE (story:Story {id: $storyId})
MERGE (user)-[r:VIEWED {
  viewId: $viewId,
  viewedAt: datetime($viewedAt)
}]->(story)
RETURN r
