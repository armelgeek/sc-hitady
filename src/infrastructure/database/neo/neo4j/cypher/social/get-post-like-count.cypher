// Get like count for a post
MATCH (user:User)-[r:LIKES]->(post:Post {id: $postId})
RETURN count(r) as likeCount
