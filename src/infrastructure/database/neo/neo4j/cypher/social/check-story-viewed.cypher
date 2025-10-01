// Check if user viewed a story
MATCH (user:User {id: $viewerId})-[r:VIEWED]->(story:Story {id: $storyId})
RETURN count(r) > 0 as hasViewed
