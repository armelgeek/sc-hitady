// Delete post from Neo4j
MATCH (post:Post {id: $postId})
OPTIONAL MATCH (post)<-[r]-()
DELETE r, post
RETURN count(post) as deleted
