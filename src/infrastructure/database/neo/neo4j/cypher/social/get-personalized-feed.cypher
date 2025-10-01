// Get personalized feed based on following relationships
MATCH (user:User {id: $userId})-[:FOLLOWS]->(author:User)
MATCH (post:Post {authorId: author.id})
WHERE post.createdAt > datetime($sinceDate)
  AND post.isHidden = false
RETURN DISTINCT post.id as postId, 
       post.authorId as authorId,
       post.createdAt as createdAt
ORDER BY post.createdAt DESC
SKIP $skip
LIMIT $limit
