// Get viewers for a story
MATCH (user:User)-[r:VIEWED]->(story:Story {id: $storyId})
RETURN user.id as userId, 
       r.viewId as viewId,
       r.viewedAt as viewedAt
ORDER BY r.viewedAt DESC
SKIP $skip
LIMIT $limit
