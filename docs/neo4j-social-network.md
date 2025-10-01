# Social Network Neo4j Integration

## Overview

The HITADY social network features have been migrated to use Neo4j graph database for all relationship-based operations while keeping PostgreSQL for content storage. This hybrid approach provides:

- **Fast graph traversal** for social network operations (follows, likes, recommendations)
- **Powerful relationship queries** using Cypher
- **Scalable social features** leveraging Neo4j's graph algorithms
- **Backward compatibility** with PostgreSQL for existing data

## Architecture

### Dual-Database Strategy

1. **PostgreSQL** - Stores content data:
   - Post content, captions, media URLs
   - Story media and text
   - Comment text
   - User profiles
   - Cached engagement counts (for performance)

2. **Neo4j** - Stores relationships:
   - FOLLOWS relationships (follower → following)
   - LIKES relationships (user → post/comment)
   - SAVES relationships (user → post)
   - VIEWED relationships (user → story)
   - COMMENTS_ON relationships (user → post)
   - REPLIES_TO relationships (comment → comment)

### Data Flow

```
User Action → Controller
    ↓
    ├─→ PostgreSQL (content + cached counts)
    └─→ Neo4j (relationships)
```

## Neo4j Graph Schema

### Nodes

#### User Node
```cypher
(:User {
  id: string,
  name: string,
  email: string,
  username: string,
  isProfessional: boolean,
  activityCategory: string
})
```

#### Post Node
```cypher
(:Post {
  id: string,
  authorId: string,
  createdAt: datetime,
  isHidden: boolean,
  isPublic: boolean
})
```

#### Story Node
```cypher
(:Story {
  id: string,
  authorId: string,
  createdAt: datetime,
  expiresAt: datetime
})
```

#### Comment Node
```cypher
(:Comment {
  id: string,
  authorId: string,
  postId: string,
  createdAt: datetime,
  isHidden: boolean
})
```

### Relationships

#### FOLLOWS
```cypher
(follower:User)-[:FOLLOWS {
  followId: string,
  notificationsEnabled: boolean,
  createdAt: datetime
}]->(following:User)
```

#### LIKES
```cypher
(user:User)-[:LIKES {
  likeId: string,
  createdAt: datetime
}]->(post:Post)
```

#### LIKES_COMMENT
```cypher
(user:User)-[:LIKES_COMMENT {
  likeId: string,
  createdAt: datetime
}]->(comment:Comment)
```

#### SAVES
```cypher
(user:User)-[:SAVES {
  saveId: string,
  collectionName: string,
  savedAt: datetime
}]->(post:Post)
```

#### VIEWED
```cypher
(user:User)-[:VIEWED {
  viewId: string,
  viewedAt: datetime
}]->(story:Story)
```

#### COMMENTS_ON
```cypher
(user:User)-[:COMMENTS_ON {
  commentId: string,
  createdAt: datetime
}]->(post:Post)
```

#### REPLIES_TO
```cypher
(user:User)-[:REPLIES_TO {
  commentId: string,
  parentCommentId: string,
  createdAt: datetime
}]->(comment:Comment)
```

## Cypher Query Files

All Cypher queries are stored in `/src/infrastructure/database/neo/neo4j/cypher/social/`

### Follow Operations (8 queries)
- `create-follow.cypher` - Create follow relationship
- `remove-follow.cypher` - Remove follow relationship
- `get-following.cypher` - Get list of users being followed
- `get-followers.cypher` - Get list of followers
- `get-follow-stats.cypher` - Get follower/following counts
- `check-following.cypher` - Check if user follows another
- `update-follow-notifications.cypher` - Toggle notification settings
- `get-follow-recommendations.cypher` - Get recommended users to follow (based on mutual connections)

### Post Interactions (8 queries)
- `create-post-like.cypher` - Like a post
- `remove-post-like.cypher` - Unlike a post
- `check-post-liked.cypher` - Check if user liked a post
- `create-post-save.cypher` - Save a post
- `remove-post-save.cypher` - Unsave a post
- `check-post-saved.cypher` - Check if user saved a post
- `get-saved-posts.cypher` - Get user's saved posts
- `get-post-like-count.cypher` - Get like count for a post

### Story Operations (5 queries)
- `create-story-view.cypher` - Record story view
- `get-story-view-count.cypher` - Get view count
- `get-story-viewers.cypher` - Get list of viewers
- `check-story-viewed.cypher` - Check if user viewed story
- `get-stories-feed.cypher` - Get stories from followed users

### Comment Operations (7 queries)
- `create-comment.cypher` - Create comment on post
- `create-comment-reply.cypher` - Create reply to comment
- `create-comment-like.cypher` - Like a comment
- `remove-comment-like.cypher` - Unlike a comment
- `get-post-comment-count.cypher` - Get comment count
- `get-comment-like-count.cypher` - Get like count for comment
- `delete-comment.cypher` - Delete comment relationship

### Advanced Features (5 queries)
- `get-personalized-feed.cypher` - Get posts from followed users
- `get-trending-posts.cypher` - Get trending posts by engagement
- `get-discovery-feed.cypher` - Get popular posts from non-followed users
- `get-similar-users.cypher` - Find users with similar interests
- `get-user-engagement-stats.cypher` - Get comprehensive user stats

### Sync Operations (5 queries)
- `sync-post.cypher` - Sync post node to Neo4j
- `sync-story.cypher` - Sync story node to Neo4j
- `sync-comment.cypher` - Sync comment node to Neo4j
- `delete-post.cypher` - Delete post and relationships
- `delete-story.cypher` - Delete story and relationships

## Controller Updates

### Follow Controller
- **POST /api/follow/:userId** - Creates relationship in both PostgreSQL and Neo4j
- **DELETE /api/follow/:userId** - Removes from both databases
- **GET /api/follow/stats/:userId** - Queries Neo4j first, falls back to PostgreSQL
- **GET /api/follow/check/:userId** - Uses Neo4j for fast lookup
- **PUT /api/follow/:userId/notifications** - Updates both databases
- **GET /api/follow/recommendations** - Uses Neo4j graph traversal for mutual connection recommendations

### Posts Controller
- **POST /api/posts/create** - Creates post in PostgreSQL, syncs to Neo4j
- **DELETE /api/posts/:postId** - Soft deletes in PostgreSQL, deletes from Neo4j
- **POST /api/posts/:postId/like** - Stores in both databases
- **POST /api/posts/:postId/save** - Stores in both databases

### Stories Controller
- **POST /api/stories/create** - Creates story in PostgreSQL, syncs to Neo4j
- **POST /api/stories/:storyId/view** - Records view in both databases

### Comments Controller
- **POST /api/comments/create** - Creates comment in PostgreSQL, creates relationships in Neo4j
- **DELETE /api/comments/:commentId** - Soft deletes in PostgreSQL, deletes from Neo4j
- **POST /api/comments/:commentId/like** - Stores in both databases

## Usage Examples

### Getting Follow Recommendations
```typescript
const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
const loader = new CypherQueryLoader()

const result = await loader.run('social', 'get-follow-recommendations', {
  userId: user.id,
  limit: 10
})

// Returns users with mutual connections
const recommendations = result.records.map(r => ({
  userId: r.get('userId'),
  mutualConnections: r.get('mutualConnections')
}))
```

### Getting Trending Posts
```cypher
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
       engagementScore
ORDER BY engagementScore DESC
LIMIT $limit
```

### Getting Similar Users
```cypher
MATCH (user:User {id: $userId})-[:LIKES]->(post:Post)
MATCH (similarUser:User)-[:LIKES]->(post)
WHERE similarUser.id <> $userId
  AND NOT (user)-[:FOLLOWS]->(similarUser)
WITH similarUser, count(DISTINCT post) as commonLikes
WHERE commonLikes >= $minCommonLikes
RETURN similarUser.id as userId,
       commonLikes
ORDER BY commonLikes DESC
```

## Error Handling

All Neo4j operations are wrapped in try-catch blocks with fallbacks:

```typescript
try {
  const { CypherQueryLoader } = await import('@/infrastructure/database/neo/CypherQueryLoader')
  const loader = new CypherQueryLoader()
  
  await loader.run('social', 'create-follow', params)
} catch (error) {
  console.error('Error creating follow in Neo4j:', error)
  // PostgreSQL data is already saved, operation continues
}
```

This ensures that:
- Social network features remain functional even if Neo4j is unavailable
- Data consistency is maintained in PostgreSQL
- Neo4j relationships can be rebuilt from PostgreSQL data if needed

## Performance Benefits

1. **Fast relationship queries**: O(1) lookups for follow checks
2. **Efficient graph traversal**: Find friends-of-friends in milliseconds
3. **Real-time recommendations**: Based on graph patterns
4. **Scalable feed generation**: Leverages Neo4j's graph algorithms
5. **Cached counts in PostgreSQL**: Reduces load on Neo4j for read-heavy operations

## Migration Path

To migrate existing data from PostgreSQL to Neo4j:

1. Use the sync queries to populate Neo4j from PostgreSQL data
2. Run bulk import scripts for existing relationships
3. Verify data consistency between databases
4. Enable Neo4j as primary for relationship queries

## Future Enhancements

- Graph-based feed algorithms (collaborative filtering)
- Influence score calculation using PageRank
- Community detection for professional networks
- Path finding for networking introductions
- Social graph analytics dashboard
