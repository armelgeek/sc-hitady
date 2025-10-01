// Sync post data to Neo4j
MERGE (post:Post {id: $postId})
SET post.authorId = $authorId,
    post.createdAt = datetime($createdAt),
    post.isHidden = $isHidden,
    post.isPublic = $isPublic
RETURN post
