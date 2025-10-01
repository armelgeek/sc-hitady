// Get discovery feed - popular content from non-followed users
MATCH (post:Post)
WHERE post.isHidden = false
  AND post.createdAt > datetime($sinceDate)
  AND NOT (post.authorId IN $followedUserIds)
OPTIONAL MATCH (user:User)-[like:LIKES]->(post)
OPTIONAL MATCH (commenter:User)-[comment:COMMENTS_ON]->(post)
WITH post, 
     count(DISTINCT like) as likeCount,
     count(DISTINCT comment) as commentCount
WHERE likeCount > $minEngagement
RETURN post.id as postId,
       post.authorId as authorId,
       post.createdAt as createdAt,
       likeCount,
       commentCount
ORDER BY likeCount DESC, commentCount DESC, post.createdAt DESC
SKIP $skip
LIMIT $limit
