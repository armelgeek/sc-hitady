// Check if user saved a post
MATCH (user:User {id: $userId})-[r:SAVES]->(post:Post {id: $postId})
RETURN count(r) > 0 as hasSaved
