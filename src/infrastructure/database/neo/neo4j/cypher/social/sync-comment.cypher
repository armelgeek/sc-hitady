// Sync comment data to Neo4j
MERGE (comment:Comment {id: $commentId})
SET comment.authorId = $authorId,
    comment.postId = $postId,
    comment.createdAt = datetime($createdAt),
    comment.isHidden = $isHidden
RETURN comment
