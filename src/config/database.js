/**
 * Database Configuration and Optimization
 * Handles database connections, indexing, and query optimization
 */

const { performance } = require('perf_hooks');

// Database configuration
const databaseConfig = {
  // Connection settings
  connection: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    database: process.env.DB_NAME || 'medical_info',
    username: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD,
    ssl: process.env.NODE_ENV === 'production' ? {
      require: true,
      rejectUnauthorized: false
    } : false
  },

  // Pool settings for connection management
  pool: {
    min: parseInt(process.env.DB_POOL_MIN) || 2,
    max: parseInt(process.env.DB_POOL_MAX) || 10,
    acquire: parseInt(process.env.DB_POOL_ACQUIRE) || 30000,
    idle: parseInt(process.env.DB_POOL_IDLE) || 10000,
    evict: parseInt(process.env.DB_POOL_EVICT) || 1000
  },

  // Query optimization settings
  optimization: {
    // Enable query logging in development
    logging: process.env.NODE_ENV === 'development' ? console.log : false,
    
    // Query timeout settings
    timeout: {
      query: parseInt(process.env.DB_QUERY_TIMEOUT) || 30000,
      transaction: parseInt(process.env.DB_TRANSACTION_TIMEOUT) || 60000
    },

    // Performance monitoring
    benchmark: process.env.NODE_ENV === 'development',
    
    // Query result caching
    cache: {
      enabled: process.env.DB_CACHE_ENABLED === 'true',
      ttl: parseInt(process.env.DB_CACHE_TTL) || 300, // 5 minutes
      max_size: parseInt(process.env.DB_CACHE_MAX_SIZE) || 100
    }
  },

  // Retry configuration
  retry: {
    max: parseInt(process.env.DB_RETRY_MAX) || 3,
    delay: parseInt(process.env.DB_RETRY_DELAY) || 1000
  }
};

// Index definitions for optimal query performance
const indexDefinitions = {
  // Medical articles indexes
  medical_articles: [
    {
      name: 'idx_articles_category',
      fields: ['category'],
      type: 'btree',
      description: 'Index for filtering articles by category'
    },
    {
      name: 'idx_articles_title_search',
      fields: ['title'],
      type: 'gin',
      expression: 'to_tsvector(\'english\', title)',
      description: 'Full-text search index for article titles'
    },
    {
      name: 'idx_articles_content_search',
      fields: ['content'],
      type: 'gin',
      expression: 'to_tsvector(\'english\', content)',
      description: 'Full-text search index for article content'
    },
    {
      name: 'idx_articles_published_date',
      fields: ['published_date'],
      type: 'btree',
      description: 'Index for sorting articles by publication date'
    },
    {
      name: 'idx_articles_status_category',
      fields: ['status', 'category'],
      type: 'btree',
      description: 'Composite index for filtering by status and category'
    },
    {
      name: 'idx_articles_author_id',
      fields: ['author_id'],
      type: 'btree',
      description: 'Index for filtering articles by author'
    }
  ],

  // User-related indexes
  users: [
    {
      name: 'idx_users_email',
      fields: ['email'],
      type: 'btree',
      unique: true,
      description: 'Unique index for user email lookup'
    },
    {
      name: 'idx_users_username',
      fields: ['username'],
      type: 'btree',
      unique: true,
      description: 'Unique index for username lookup'
    },
    {
      name: 'idx_users_created_at',
      fields: ['created_at'],
      type: 'btree',
      description: 'Index for user registration analytics'
    },
    {
      name: 'idx_users_role',
      fields: ['role'],
      type: 'btree',
      description: 'Index for filtering users by role'
    }
  ],

  // Search and analytics indexes
  search_logs: [
    {
      name: 'idx_search_query',
      fields: ['query'],
      type: 'btree',
      description: 'Index for search query analytics'
    },
    {
      name: 'idx_search_timestamp',
      fields: ['timestamp'],
      type: 'btree',
      description: 'Index for search analytics by time'
    },
    {
      name: 'idx_search_user_id',
      fields: ['user_id'],
      type: 'btree',
      description: 'Index for user search history'
    }
  ],

  // Comments and interactions
  comments: [
    {
      name: 'idx_comments_article_id',
      fields: ['article_id'],
      type: 'btree',
      description: 'Index for fetching comments by article'
    },
    {
      name: 'idx_comments_user_id',
      fields: ['user_id'],
      type: 'btree',
      description: 'Index for fetching comments by user'
    },
    {
      name: 'idx_comments_created_at',
      fields: ['created_at'],
      type: 'btree',
      description: 'Index for sorting comments by date'
    },
    {
      name: 'idx_comments_parent_id',
      fields: ['parent_id'],
      type: 'btree',
      description: 'Index for threaded comments'
    }
  ],

  // Bookmarks and favorites
  bookmarks: [
    {
      name: 'idx_bookmarks_user_article',
      fields: ['user_id', 'article_id'],
      type: 'btree',
      unique: true,
      description: 'Composite unique index for user bookmarks'
    },
    {
      name: 'idx_bookmarks_created_at',
      fields: ['created_at'],
      type: 'btree',
      description: 'Index for sorting bookmarks by date'
    }
  ]
};

// Optimized query patterns
const queryPatterns = {
  // Article queries
  articles: {
    // Get articles by category with pagination
    byCategory: `
      SELECT id, title, summary, category, published_date, author_id
      FROM medical_articles 
      WHERE status = 'published' AND category = $1
      ORDER BY published_date DESC
      LIMIT $2 OFFSET $3
    `,
    
    // Full-text search across articles
    search: `
      SELECT id, title, summary, category, published_date,
             ts_rank(to_tsvector('english', title || ' ' || content), plainto_tsquery('english', $1)) as rank
      FROM medical_articles 
      WHERE status = 'published' 
        AND (to_tsvector('english', title || ' ' || content) @@ plainto_tsquery('english', $1))
      ORDER BY rank DESC, published_date DESC
      LIMIT $2 OFFSET $3
    `,
    
    // Get article with related content
    withRelated: `
      WITH article_data AS (
        SELECT * FROM medical_articles WHERE id = $1 AND status = 'published'
      ),
      related_articles AS (
        SELECT id, title, summary FROM medical_articles 
        WHERE category = (SELECT category FROM article_data) 
          AND id != $1 AND status = 'published'
        ORDER BY published_date DESC
        LIMIT 5
      )
      SELECT 
        (SELECT row_to_json(article_data) FROM article_data) as article,
        (SELECT json_agg(related_articles) FROM related_articles) as related
    `,
    
    // Get popular articles by view count
    popular: `
      SELECT a.id, a.title, a.summary, a.category, a.published_date,
             COUNT(v.id) as view_count
      FROM medical_articles a
      LEFT JOIN article_views v ON a.id = v.article_id
      WHERE a.status = 'published'
        AND a.published_date >= NOW() - INTERVAL '30 days'
      GROUP BY a.id, a.title, a.summary, a.category, a.published_date
      ORDER BY view_count DESC, a.published_date DESC
      LIMIT $1
    `
  },

  // User queries
  users: {
    // Get user with profile stats
    withStats: `
      SELECT u.*,
             (SELECT COUNT(*) FROM medical_articles WHERE author_id = u.id) as article_count,
             (SELECT COUNT(*) FROM comments WHERE user_id = u.id) as comment_count,
             (SELECT COUNT(*) FROM bookmarks WHERE user_id = u.id) as bookmark_count
      FROM users u
      WHERE u.id = $1
    `,
    
    // Get user activity feed
    activityFeed: `
      (
        SELECT 'article' as type, id, title as content, created_at
        FROM medical_articles 
        WHERE author_id = $1 AND status = 'published'
      )
      UNION ALL
      (
        SELECT 'comment' as type, id, content, created_at
        FROM comments 
        WHERE user_id = $1
      )
      ORDER BY created_at DESC
      LIMIT $2
    `
  },

  // Analytics queries
  analytics: {
    // Get search trends
    searchTrends: `
      SELECT query, COUNT(*) as search_count
      FROM search_logs
      WHERE timestamp >= NOW() - INTERVAL '7 days'
      GROUP BY query
      ORDER BY search_count DESC
      LIMIT $1
    `,
    
    // Get content performance
    contentPerformance: `
      SELECT a.id, a.title, a.category,
             COUNT(DISTINCT v.id) as views,
             COUNT(DISTINCT c.id) as comments,
             COUNT(DISTINCT b.id) as bookmarks
      FROM medical_articles a
      LEFT JOIN article_views v ON a.id = v.article_id
      LEFT JOIN comments c ON a.id = c.article_id
      LEFT JOIN bookmarks b ON a.id = b.article_id
      WHERE a.published_date >= NOW() - INTERVAL '30 days'
      GROUP BY a.id, a.title, a.category
      ORDER BY views DESC
      LIMIT $1
    `
  }
};

// Database optimization utilities
class DatabaseOptimizer {
  constructor(connection) {
    this.connection = connection;
    this.queryCache = new Map();
    this.performanceMetrics = new Map();
  }

  // Execute optimized query with caching
  async executeQuery(queryName, params = [], options = {}) {
    const startTime = performance.now();
    
    try {
      // Check cache if enabled
      if (options.cache && databaseConfig.optimization.cache.enabled) {
        const cacheKey = this.generateCacheKey(queryName, params);
        const cached = this.queryCache.get(cacheKey);
        
        if (cached && (Date.now() - cached.timestamp) < (databaseConfig.optimization.cache.ttl * 1000)) {
          this.recordMetrics(queryName, performance.now() - startTime, true);
          return cached.result;
        }
      }
      
      // Execute query
      const result = await this.connection.query(queryName, params);
      
      // Cache result if enabled
      if (options.cache && databaseConfig.optimization.cache.enabled) {
        this.cacheResult(queryName, params, result);
      }
      
      this.recordMetrics(queryName, performance.now() - startTime, false);
      return result;
      
    } catch (error) {
      this.recordMetrics(queryName, performance.now() - startTime, false, error);
      throw error;
    }
  }

  // Generate cache key for query and parameters
  generateCacheKey(queryName, params) {
    return `${queryName}:${JSON.stringify(params)}`;
  }

  // Cache query result
  cacheResult(queryName, params, result) {
    const cacheKey = this.generateCacheKey(queryName, params);
    
    // Implement LRU cache behavior
    if (this.queryCache.size >= databaseConfig.optimization.cache.max_size) {
      const firstKey = this.queryCache.keys().next().value;
      this.queryCache.delete(firstKey);
    }
    
    this.queryCache.set(cacheKey, {
      result: result,
      timestamp: Date.now()
    });
  }

  // Record performance metrics
  recordMetrics(queryName, duration, fromCache, error = null) {
    if (!this.performanceMetrics.has(queryName)) {
      this.performanceMetrics.set(queryName, {
        count: 0,
        totalDuration: 0,
        cacheHits: 0,
        errors: 0,
        avgDuration: 0
      });
    }
    
    const metrics = this.performanceMetrics.get(queryName);
    metrics.count++;
    metrics.totalDuration += duration;
    
    if (fromCache) {
      metrics.cacheHits++;
    }
    
    if (error) {
      metrics.errors++;
    }
    
    metrics.avgDuration = metrics.totalDuration / metrics.count;
    
    // Log slow queries in development
    if (process.env.NODE_ENV === 'development' && duration > 1000) {
      console.warn(`Slow query detected: ${queryName} took ${duration.toFixed(2)}ms`);
    }
  }

  // Get performance statistics
  getPerformanceStats() {
    const stats = {};
    
    for (const [queryName, metrics] of this.performanceMetrics) {
      stats[queryName] = {
        ...metrics,
        cacheHitRate: metrics.count > 0 ? (metrics.cacheHits / metrics.count) * 100 : 0,
        errorRate: metrics.count > 0 ? (metrics.errors / metrics.count) * 100 : 0
      };
    }
    
    return stats;
  }

  // Clear query cache
  clearCache() {
    this.queryCache.clear();
  }

  // Create database indexes
  async createIndexes(tableName = null) {
    const tables = tableName ? [tableName] : Object.keys(indexDefinitions);
    const results = [];
    
    for (const table of tables) {
      if (!indexDefinitions[table]) continue;
      
      for (const indexDef of indexDefinitions[table]) {
        try {
          const sql = this.generateIndexSQL(table, indexDef);
          await this.connection.query(sql);
          
          results.push({
            table: table,
            index: indexDef.name,
            status: 'created',
            sql: sql
          });
          
        } catch (error) {
          results.push({
            table: table,
            index: indexDef.name,
            status: 'error',
            error: error.message
          });
        }
      }
    }
    
    return results;
  }

  // Generate SQL for creating index
  generateIndexSQL(tableName, indexDef) {
    let sql = `CREATE`;
    
    if (indexDef.unique) {
      sql += ` UNIQUE`;
    }
    
    sql += ` INDEX IF NOT EXISTS ${indexDef.name} ON ${tableName}`;
    
    if (indexDef.type && indexDef.type !== 'btree') {
      sql += ` USING ${indexDef.type.toUpperCase()}`;
    }
    
    if (indexDef.expression) {
      sql += ` (${indexDef.expression})`;
    } else {
      sql += ` (${indexDef.fields.join(', ')})`;
    }
    
    return sql;
  }

  // Analyze query performance
  async analyzeQuery(sql, params = []) {
    try {
      const explainSql = `EXPLAIN (ANALYZE, BUFFERS, FORMAT JSON) ${sql}`;
      const result = await this.connection.query(explainSql, params);
      
      return {
        query: sql,
        analysis: result.rows[0]['QUERY PLAN'][0],
        recommendations: this.generateQueryRecommendations(result.rows[0]['QUERY PLAN'][0])
      };
      
    } catch (error) {
      return {
        query: sql,
        error: error.message
      };
    }
  }

  // Generate query optimization recommendations
  generateQueryRecommendations(queryPlan) {
    const recommendations = [];
    
    // Check for sequential scans
    if (this.hasSequentialScan(queryPlan)) {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        message: 'Query uses sequential scan - consider adding appropriate indexes'
      });
    }
    
    // Check for high cost operations
    if (queryPlan['Total Cost'] > 1000) {
      recommendations.push({
        type: 'performance',
        severity: 'medium',
        message: 'Query has high cost - consider optimization or caching'
      });
    }
    
    // Check execution time
    if (queryPlan['Actual Total Time'] > 100) {
      recommendations.push({
        type: 'performance',
        severity: 'medium',
        message: 'Query execution time is high - consider optimization'
      });
    }
    
    return recommendations;
  }

  // Check if query plan contains sequential scan
  hasSequentialScan(node) {
    if (node['Node Type'] === 'Seq Scan') {
      return true;
    }
    
    if (node.Plans) {
      return node.Plans.some(plan => this.hasSequentialScan(plan));
    }
    
    return false;
  }

  // Health check for database connection
  async healthCheck() {
    try {
      const startTime = performance.now();
      await this.connection.query('SELECT 1');
      const duration = performance.now() - startTime;
      
      return {
        status: 'healthy',
        responseTime: duration,
        timestamp: new Date().toISOString()
      };
      
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }
}

// Connection pool manager
class ConnectionPoolManager {
  constructor(config) {
    this.config = config;
    this.pool = null;
    this.optimizer = null;
  }

  // Initialize connection pool
  async initialize() {
    try {
      // This would typically use a database library like pg or sequelize
      // For now, we'll create a mock implementation
      this.pool = {
        query: async (sql, params) => {
          // Mock implementation - replace with actual database connection
          console.log(`Executing query: ${sql}`);
          return { rows: [], rowCount: 0 };
        },
        end: async () => {
          console.log('Connection pool closed');
        }
      };
      
      this.optimizer = new DatabaseOptimizer(this.pool);
      
      // Create indexes on initialization
      if (process.env.NODE_ENV === 'production') {
        await this.optimizer.createIndexes();
      }
      
      return true;
      
    } catch (error) {
      console.error('Failed to initialize database connection:', error);
      throw error;
    }
  }

  // Get database connection
  getConnection() {
    return this.pool;
  }

  // Get optimizer instance
  getOptimizer() {
    return this.optimizer;
  }

  // Close connection pool
  async close() {
    if (this.pool) {
      await this.pool.end();
    }
  }
}

module.exports = {
  databaseConfig,
  indexDefinitions,
  queryPatterns,
  DatabaseOptimizer,
  ConnectionPoolManager
};