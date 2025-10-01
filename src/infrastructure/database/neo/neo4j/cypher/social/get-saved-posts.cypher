// Get saved posts for a user
MATCH (user:User {id: $userId})-[r:SAVES]->(post:Post)
RETURN post.id as postId, 
       r.saveId as saveId,
       r.collectionName as collectionName,
       r.savedAt as savedAt
ORDER BY r.savedAt DESC
SKIP $skip
LIMIT $limit
