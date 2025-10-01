// Get trending posts based on engagement (likes, comments)
MATCH (post:Post)
WHERE post.createdAt > datetime($sinceDate)
  AND post.isHidden = false
OPTIONAL MATCH (user:User)-[like:LIKES]->(post)
OPTIONAL MATCH (commenter:User)-[comment:COMMENTS_ON]->(post)
WITH post, 
     count(DISTINCT like) as likeCount,
     count(DISTINCT comment) as commentCount,
     (count(DISTINCT like) * 1.0 + count(DISTINCT comment) * 2.0) as engagementScore
RETURN post.id as postId,
       post.authorId as authorId,
       post.createdAt as createdAt,
       likeCount,
       commentCount,
       engagementScore
ORDER BY engagementScore DESC, post.createdAt DESC
SKIP $skip
LIMIT $limit
