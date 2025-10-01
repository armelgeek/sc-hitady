// Check if user liked a post
MATCH (user:User {id: $userId})-[r:LIKES]->(post:Post {id: $postId})
RETURN count(r) > 0 as hasLiked
