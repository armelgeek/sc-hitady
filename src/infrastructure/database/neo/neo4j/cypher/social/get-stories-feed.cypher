// Get stories from followed users for feed
MATCH (user:User {id: $userId})-[:FOLLOWS]->(author:User)
MATCH (story:Story {authorId: author.id})
WHERE story.expiresAt > datetime($now)
RETURN story.id as storyId, 
       story.authorId as authorId,
       story.createdAt as createdAt
ORDER BY story.createdAt DESC
SKIP $skip
LIMIT $limit
