// Get comment count for a post
MATCH (user:User)-[r:COMMENTS_ON]->(post:Post {id: $postId})
RETURN count(r) as commentCount
