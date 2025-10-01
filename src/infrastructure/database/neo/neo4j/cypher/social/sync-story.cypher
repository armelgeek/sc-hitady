// Sync story data to Neo4j
MERGE (story:Story {id: $storyId})
SET story.authorId = $authorId,
    story.createdAt = datetime($createdAt),
    story.expiresAt = datetime($expiresAt)
RETURN story
