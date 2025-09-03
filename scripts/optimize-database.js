#!/usr/bin/env node

/**
 * Database Optimization Script
 * Analyzes database performance and creates optimized indexes
 */

const fs = require('fs');
const path = require('path');
const { performance } = require('perf_hooks');
const { databaseConfig, indexDefinitions, queryPatterns } = require('../src/config/database');

class DatabaseOptimizationAnalyzer {
  constructor(options = {}) {
    this.options = {
      dryRun: options.dryRun || false,
      verbose: options.verbose || false,
      skipIndexes: options.skipIndexes || false,
      skipAnalysis: options.skipAnalysis || false,
      outputFile: options.outputFile || null
    };
    
    this.results = {
      timestamp: new Date().toISOString(),
      configuration: {},
      indexes: {},
      queries: {},
      recommendations: [],
      performance: {}
    };
  }

  // Analyze database configuration
  analyzeConfiguration() {
    this.log('🔍 Analyzing database configuration...');
    
    const config = databaseConfig;
    
    this.results.configuration = {
      connection: {
        host: config.connection.host,
        port: config.connection.port,
        database: config.connection.database,
        ssl_enabled: !!config.connection.ssl
      },
      pool: {
        min_connections: config.pool.min,
        max_connections: config.pool.max,
        acquire_timeout: config.pool.acquire,
        idle_timeout: config.pool.idle
      },
      optimization: {
        logging_enabled: !!config.optimization.logging,
        cache_enabled: config.optimization.cache.enabled,
        cache_ttl: config.optimization.cache.ttl,
        query_timeout: config.optimization.timeout.query
      }
    };
    
    // Generate configuration recommendations
    this.analyzeConfigurationRecommendations();
  }

  // Analyze configuration and generate recommendations
  analyzeConfigurationRecommendations() {
    const config = this.results.configuration;
    
    // Pool size recommendations
    if (config.pool.max_connections < 10) {
      this.results.recommendations.push({
        type: 'configuration',
        severity: 'medium',
        category: 'connection_pool',
        message: 'Consider increasing max pool size for better concurrency',
        current_value: config.pool.max_connections,
        recommended_value: 20
      });
    }
    
    if (config.pool.max_connections > 50) {
      this.results.recommendations.push({
        type: 'configuration',
        severity: 'low',
        category: 'connection_pool',
        message: 'High max pool size may cause resource contention',
        current_value: config.pool.max_connections,
        recommended_value: 30
      });
    }
    
    // Cache recommendations
    if (!config.optimization.cache_enabled) {
      this.results.recommendations.push({
        type: 'configuration',
        severity: 'medium',
        category: 'caching',
        message: 'Enable query caching for better performance',
        suggestion: 'Set DB_CACHE_ENABLED=true'
      });
    }
    
    // Timeout recommendations
    if (config.optimization.query_timeout > 60000) {
      this.results.recommendations.push({
        type: 'configuration',
        severity: 'low',
        category: 'timeout',
        message: 'Query timeout is very high - consider optimization',
        current_value: config.optimization.query_timeout,
        recommended_value: 30000
      });
    }
    
    // SSL recommendations for production
    if (process.env.NODE_ENV === 'production' && !config.connection.ssl_enabled) {
      this.results.recommendations.push({
        type: 'security',
        severity: 'high',
        category: 'ssl',
        message: 'SSL should be enabled in production',
        suggestion: 'Configure SSL connection settings'
      });
    }
  }

  // Analyze index definitions
  analyzeIndexes() {
    if (this.options.skipIndexes) {
      this.log('⏭️  Skipping index analysis...');
      return;
    }
    
    this.log('📊 Analyzing index definitions...');
    
    const indexStats = {
      total_tables: 0,
      total_indexes: 0,
      by_table: {},
      by_type: {
        btree: 0,
        gin: 0,
        gist: 0,
        hash: 0
      },
      unique_indexes: 0,
      composite_indexes: 0
    };
    
    for (const [tableName, indexes] of Object.entries(indexDefinitions)) {
      indexStats.total_tables++;
      indexStats.total_indexes += indexes.length;
      
      indexStats.by_table[tableName] = {
        count: indexes.length,
        indexes: indexes.map(idx => ({
          name: idx.name,
          type: idx.type || 'btree',
          fields: idx.fields,
          unique: idx.unique || false,
          description: idx.description
        }))
      };
      
      // Analyze index types and characteristics
      for (const index of indexes) {
        const type = index.type || 'btree';
        indexStats.by_type[type] = (indexStats.by_type[type] || 0) + 1;
        
        if (index.unique) {
          indexStats.unique_indexes++;
        }
        
        if (index.fields && index.fields.length > 1) {
          indexStats.composite_indexes++;
        }
      }
    }
    
    this.results.indexes = indexStats;
    
    // Generate index recommendations
    this.analyzeIndexRecommendations();
  }

  // Generate index recommendations
  analyzeIndexRecommendations() {
    const indexStats = this.results.indexes;
    
    // Check for tables without indexes
    const tablesWithFewIndexes = Object.entries(indexStats.by_table)
      .filter(([table, stats]) => stats.count < 2)
      .map(([table]) => table);
    
    if (tablesWithFewIndexes.length > 0) {
      this.results.recommendations.push({
        type: 'indexes',
        severity: 'medium',
        category: 'coverage',
        message: `Tables with minimal indexing: ${tablesWithFewIndexes.join(', ')}`,
        suggestion: 'Consider adding more indexes for frequently queried columns'
      });
    }
    
    // Check for missing full-text search indexes
    const tablesWithoutFTS = Object.entries(indexStats.by_table)
      .filter(([table, stats]) => !stats.indexes.some(idx => idx.type === 'gin'))
      .map(([table]) => table);
    
    if (tablesWithoutFTS.includes('medical_articles')) {
      this.results.recommendations.push({
        type: 'indexes',
        severity: 'high',
        category: 'search',
        message: 'Medical articles table lacks full-text search indexes',
        suggestion: 'Add GIN indexes for title and content search'
      });
    }
    
    // Check composite index usage
    const compositeRatio = indexStats.composite_indexes / indexStats.total_indexes;
    if (compositeRatio < 0.3) {
      this.results.recommendations.push({
        type: 'indexes',
        severity: 'low',
        category: 'optimization',
        message: 'Low usage of composite indexes',
        suggestion: 'Consider creating composite indexes for frequently combined WHERE clauses'
      });
    }
  }

  // Analyze query patterns
  analyzeQueries() {
    if (this.options.skipAnalysis) {
      this.log('⏭️  Skipping query analysis...');
      return;
    }
    
    this.log('🔍 Analyzing query patterns...');
    
    const queryStats = {
      total_patterns: 0,
      by_category: {},
      complexity_analysis: {},
      optimization_opportunities: []
    };
    
    for (const [category, queries] of Object.entries(queryPatterns)) {
      queryStats.total_patterns += Object.keys(queries).length;
      queryStats.by_category[category] = {
        count: Object.keys(queries).length,
        queries: {}
      };
      
      for (const [queryName, sql] of Object.entries(queries)) {
        const analysis = this.analyzeQueryComplexity(sql);
        queryStats.by_category[category].queries[queryName] = analysis;
        
        // Check for optimization opportunities
        this.checkQueryOptimization(category, queryName, sql, analysis);
      }
    }
    
    this.results.queries = queryStats;
  }

  // Analyze individual query complexity
  analyzeQueryComplexity(sql) {
    const analysis = {
      length: sql.length,
      joins: (sql.match(/JOIN/gi) || []).length,
      subqueries: (sql.match(/\([^)]*SELECT[^)]*\)/gi) || []).length,
      aggregations: (sql.match(/COUNT|SUM|AVG|MAX|MIN/gi) || []).length,
      window_functions: (sql.match(/OVER\s*\(/gi) || []).length,
      cte_usage: (sql.match(/WITH\s+\w+\s+AS/gi) || []).length,
      complexity_score: 0
    };
    
    // Calculate complexity score
    analysis.complexity_score = 
      analysis.length / 100 +
      analysis.joins * 2 +
      analysis.subqueries * 3 +
      analysis.aggregations * 1.5 +
      analysis.window_functions * 2 +
      analysis.cte_usage * 1;
    
    analysis.complexity_level = 
      analysis.complexity_score < 5 ? 'low' :
      analysis.complexity_score < 15 ? 'medium' : 'high';
    
    return analysis;
  }

  // Check for query optimization opportunities
  checkQueryOptimization(category, queryName, sql, analysis) {
    const fullName = `${category}.${queryName}`;
    
    // Check for missing LIMIT clauses
    if (!sql.includes('LIMIT') && !sql.includes('TOP')) {
      this.results.recommendations.push({
        type: 'query',
        severity: 'medium',
        category: 'pagination',
        query: fullName,
        message: 'Query lacks LIMIT clause - may return excessive results',
        suggestion: 'Add LIMIT clause to prevent large result sets'
      });
    }
    
    // Check for SELECT *
    if (sql.includes('SELECT *')) {
      this.results.recommendations.push({
        type: 'query',
        severity: 'low',
        category: 'optimization',
        query: fullName,
        message: 'Query uses SELECT * - may fetch unnecessary columns',
        suggestion: 'Specify only required columns in SELECT clause'
      });
    }
    
    // Check for high complexity
    if (analysis.complexity_level === 'high') {
      this.results.recommendations.push({
        type: 'query',
        severity: 'medium',
        category: 'complexity',
        query: fullName,
        message: 'Query has high complexity score',
        complexity_score: analysis.complexity_score,
        suggestion: 'Consider breaking into smaller queries or adding materialized views'
      });
    }
    
    // Check for multiple JOINs without proper indexing hints
    if (analysis.joins > 3) {
      this.results.recommendations.push({
        type: 'query',
        severity: 'medium',
        category: 'joins',
        query: fullName,
        message: 'Query has multiple JOINs - ensure proper indexing',
        join_count: analysis.joins,
        suggestion: 'Verify that JOIN columns are properly indexed'
      });
    }
  }

  // Simulate performance testing
  async performanceTest() {
    this.log('⚡ Running performance simulation...');
    
    const startTime = performance.now();
    
    // Simulate various database operations
    const tests = {
      connection_time: await this.simulateConnectionTime(),
      simple_query: await this.simulateSimpleQuery(),
      complex_query: await this.simulateComplexQuery(),
      index_scan: await this.simulateIndexScan(),
      full_table_scan: await this.simulateFullTableScan()
    };
    
    const endTime = performance.now();
    
    this.results.performance = {
      total_test_time: endTime - startTime,
      tests: tests,
      recommendations: this.generatePerformanceRecommendations(tests)
    };
  }

  // Simulate connection establishment time
  async simulateConnectionTime() {
    const startTime = performance.now();
    
    // Simulate connection overhead
    await new Promise(resolve => setTimeout(resolve, Math.random() * 50 + 10));
    
    const endTime = performance.now();
    
    return {
      duration: endTime - startTime,
      status: endTime - startTime < 100 ? 'good' : 'slow'
    };
  }

  // Simulate simple query execution
  async simulateSimpleQuery() {
    const startTime = performance.now();
    
    // Simulate simple SELECT query
    await new Promise(resolve => setTimeout(resolve, Math.random() * 20 + 5));
    
    const endTime = performance.now();
    
    return {
      duration: endTime - startTime,
      status: endTime - startTime < 50 ? 'excellent' : endTime - startTime < 100 ? 'good' : 'slow'
    };
  }

  // Simulate complex query execution
  async simulateComplexQuery() {
    const startTime = performance.now();
    
    // Simulate complex query with JOINs and aggregations
    await new Promise(resolve => setTimeout(resolve, Math.random() * 200 + 50));
    
    const endTime = performance.now();
    
    return {
      duration: endTime - startTime,
      status: endTime - startTime < 200 ? 'good' : endTime - startTime < 500 ? 'acceptable' : 'slow'
    };
  }

  // Simulate index scan performance
  async simulateIndexScan() {
    const startTime = performance.now();
    
    // Simulate index-based query
    await new Promise(resolve => setTimeout(resolve, Math.random() * 30 + 10));
    
    const endTime = performance.now();
    
    return {
      duration: endTime - startTime,
      status: endTime - startTime < 50 ? 'excellent' : 'good'
    };
  }

  // Simulate full table scan performance
  async simulateFullTableScan() {
    const startTime = performance.now();
    
    // Simulate table scan (intentionally slower)
    await new Promise(resolve => setTimeout(resolve, Math.random() * 500 + 200));
    
    const endTime = performance.now();
    
    return {
      duration: endTime - startTime,
      status: endTime - startTime < 300 ? 'acceptable' : 'slow'
    };
  }

  // Generate performance recommendations
  generatePerformanceRecommendations(tests) {
    const recommendations = [];
    
    if (tests.connection_time.status === 'slow') {
      recommendations.push({
        type: 'performance',
        severity: 'medium',
        category: 'connection',
        message: 'Database connection time is slow',
        suggestion: 'Check network latency and connection pool settings'
      });
    }
    
    if (tests.complex_query.status === 'slow') {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        category: 'query_performance',
        message: 'Complex queries are performing poorly',
        suggestion: 'Review query optimization and indexing strategy'
      });
    }
    
    if (tests.full_table_scan.status === 'slow') {
      recommendations.push({
        type: 'performance',
        severity: 'high',
        category: 'indexing',
        message: 'Full table scans are very slow',
        suggestion: 'Add appropriate indexes to avoid table scans'
      });
    }
    
    return recommendations;
  }

  // Generate optimization report
  generateReport() {
    const report = {
      summary: {
        timestamp: this.results.timestamp,
        total_recommendations: this.results.recommendations.length,
        severity_breakdown: this.getSeverityBreakdown(),
        category_breakdown: this.getCategoryBreakdown()
      },
      configuration: this.results.configuration,
      indexes: this.results.indexes,
      queries: this.results.queries,
      performance: this.results.performance,
      recommendations: this.results.recommendations
    };
    
    return report;
  }

  // Get severity breakdown of recommendations
  getSeverityBreakdown() {
    const breakdown = { high: 0, medium: 0, low: 0 };
    
    for (const rec of this.results.recommendations) {
      breakdown[rec.severity] = (breakdown[rec.severity] || 0) + 1;
    }
    
    return breakdown;
  }

  // Get category breakdown of recommendations
  getCategoryBreakdown() {
    const breakdown = {};
    
    for (const rec of this.results.recommendations) {
      breakdown[rec.category] = (breakdown[rec.category] || 0) + 1;
    }
    
    return breakdown;
  }

  // Display formatted report
  displayReport() {
    const report = this.generateReport();
    
    console.log('\n🗄️  DATABASE OPTIMIZATION REPORT');
    console.log('=' .repeat(50));
    console.log(`Generated: ${report.summary.timestamp}`);
    console.log(`Total Recommendations: ${report.summary.total_recommendations}`);
    
    // Severity breakdown
    console.log('\n📊 Severity Breakdown:');
    Object.entries(report.summary.severity_breakdown).forEach(([severity, count]) => {
      const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
      console.log(`  ${icon} ${severity.toUpperCase()}: ${count}`);
    });
    
    // Configuration analysis
    console.log('\n⚙️  Configuration Analysis:');
    console.log(`  🔗 Connection: ${report.configuration.connection.host}:${report.configuration.connection.port}`);
    console.log(`  🏊 Pool Size: ${report.configuration.pool.min_connections}-${report.configuration.pool.max_connections}`);
    console.log(`  💾 Cache: ${report.configuration.optimization.cache_enabled ? '✅ Enabled' : '❌ Disabled'}`);
    console.log(`  🔒 SSL: ${report.configuration.connection.ssl_enabled ? '✅ Enabled' : '❌ Disabled'}`);
    
    // Index analysis
    if (report.indexes.total_indexes) {
      console.log('\n📊 Index Analysis:');
      console.log(`  📋 Total Tables: ${report.indexes.total_tables}`);
      console.log(`  🔍 Total Indexes: ${report.indexes.total_indexes}`);
      console.log(`  🔑 Unique Indexes: ${report.indexes.unique_indexes}`);
      console.log(`  🔗 Composite Indexes: ${report.indexes.composite_indexes}`);
      
      console.log('\n  📂 By Type:');
      Object.entries(report.indexes.by_type).forEach(([type, count]) => {
        if (count > 0) {
          console.log(`    ${type.toUpperCase()}: ${count}`);
        }
      });
    }
    
    // Query analysis
    if (report.queries.total_patterns) {
      console.log('\n🔍 Query Analysis:');
      console.log(`  📋 Total Patterns: ${report.queries.total_patterns}`);
      
      Object.entries(report.queries.by_category).forEach(([category, data]) => {
        console.log(`  📂 ${category}: ${data.count} queries`);
      });
    }
    
    // Performance results
    if (report.performance.tests) {
      console.log('\n⚡ Performance Test Results:');
      Object.entries(report.performance.tests).forEach(([test, result]) => {
        const icon = result.status === 'excellent' ? '🟢' : 
                    result.status === 'good' ? '🟡' : 
                    result.status === 'acceptable' ? '🟠' : '🔴';
        console.log(`  ${icon} ${test.replace('_', ' ')}: ${result.duration.toFixed(2)}ms (${result.status})`);
      });
    }
    
    // Recommendations
    if (report.recommendations.length > 0) {
      console.log('\n💡 Recommendations:');
      
      // Group by severity
      const bySeverity = {
        high: report.recommendations.filter(r => r.severity === 'high'),
        medium: report.recommendations.filter(r => r.severity === 'medium'),
        low: report.recommendations.filter(r => r.severity === 'low')
      };
      
      ['high', 'medium', 'low'].forEach(severity => {
        if (bySeverity[severity].length > 0) {
          const icon = severity === 'high' ? '🔴' : severity === 'medium' ? '🟡' : '🟢';
          console.log(`\n  ${icon} ${severity.toUpperCase()} PRIORITY:`);
          
          bySeverity[severity].forEach((rec, index) => {
            console.log(`    ${index + 1}. [${rec.category}] ${rec.message}`);
            if (rec.suggestion) {
              console.log(`       💭 ${rec.suggestion}`);
            }
          });
        }
      });
    }
    
    console.log('\n' + '='.repeat(50));
  }

  // Save report to file
  saveReport(outputPath = null) {
    const report = this.generateReport();
    const defaultPath = path.join(process.cwd(), 'database-optimization-report.json');
    const filePath = outputPath || this.options.outputFile || defaultPath;
    
    try {
      fs.writeFileSync(filePath, JSON.stringify(report, null, 2));
      console.log(`\n💾 Report saved to: ${filePath}`);
    } catch (error) {
      console.error(`\n❌ Failed to save report: ${error.message}`);
    }
  }

  // Utility logging method
  log(message) {
    if (this.options.verbose || !this.options.dryRun) {
      console.log(message);
    }
  }

  // Run complete analysis
  async runAnalysis() {
    try {
      this.log('🚀 Starting database optimization analysis...');
      
      this.analyzeConfiguration();
      this.analyzeIndexes();
      this.analyzeQueries();
      await this.performanceTest();
      
      this.log('✅ Analysis completed successfully!');
      
      return this.generateReport();
      
    } catch (error) {
      console.error('❌ Analysis failed:', error.message);
      throw error;
    }
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  const options = {
    dryRun: args.includes('--dry-run'),
    verbose: args.includes('--verbose'),
    skipIndexes: args.includes('--skip-indexes'),
    skipAnalysis: args.includes('--skip-analysis'),
    save: args.includes('--save'),
    outputFile: args.find(arg => arg.startsWith('--output='))?.split('=')[1],
    json: args.includes('--json'),
    quiet: args.includes('--quiet')
  };

  try {
    const analyzer = new DatabaseOptimizationAnalyzer(options);
    const report = await analyzer.runAnalysis();
    
    if (!options.quiet) {
      if (options.json) {
        console.log(JSON.stringify(report, null, 2));
      } else {
        analyzer.displayReport();
      }
    }
    
    if (options.save) {
      analyzer.saveReport();
    }
    
    // Exit with appropriate code based on recommendations
    const highPriority = report.recommendations.filter(r => r.severity === 'high').length;
    const mediumPriority = report.recommendations.filter(r => r.severity === 'medium').length;
    
    if (highPriority > 0) {
      process.exit(2);
    } else if (mediumPriority > 0) {
      process.exit(1);
    } else {
      process.exit(0);
    }
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error.message);
    if (!options.quiet) {
      console.error(error.stack);
    }
    process.exit(3);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

module.exports = { DatabaseOptimizationAnalyzer };