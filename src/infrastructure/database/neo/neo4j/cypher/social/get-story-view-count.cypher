// Get view count for a story
MATCH (user:User)-[r:VIEWED]->(story:Story {id: $storyId})
RETURN count(r) as viewCount
