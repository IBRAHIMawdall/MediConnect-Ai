import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from './components/ui/card';
import { Button } from './components/ui/button';
import { Badge } from './components/ui/badge';
import { createPageUrl } from './utils';
import { ICD10Code, Drug } from './entities/all';
import {
  FileText,
  Pill,
  Brain,
  Search,
  Database,
  TrendingUp,
  Activity,
  Users,
  ArrowRight,
  Plus,
  Eye
} from 'lucide-react';

export default function Dashboard() {
  const [stats, setStats] = useState({
    totalCodes: 0,
    totalDrugs: 0,
    recentActivity: 0,
    aiMappings: 0
  });
  
  const [recentCodes, setRecentCodes] = useState([]);
  const [recentDrugs, setRecentDrugs] = useState([]);
  const [topCategories, setTopCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDashboardData = async () => {
      try {
        // Load statistics
        const codes = await ICD10Code.getAll();
        const drugs = await Drug.getAll();
        
        setStats({
          totalCodes: codes.length,
          totalDrugs: drugs.length,
          recentActivity: codes.length + drugs.length,
          aiMappings: Math.floor((codes.length + drugs.length) * 0.3) // Mock AI mappings
        });

        // Load recent items (last 5)
        setRecentCodes(codes.slice(-5).reverse());
        setRecentDrugs(drugs.slice(-5).reverse());

        // Calculate top categories
        const categoryCount = {};
        codes.forEach(code => {
          const category = code.category || 'Other';
          categoryCount[category] = (categoryCount[category] || 0) + 1;
        });
        
        const sortedCategories = Object.entries(categoryCount)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .map(([category, count]) => ({ category, count }));
        
        setTopCategories(sortedCategories);
      } catch (error) {
        console.error('Failed to load dashboard data:', error);
      } finally {
        setLoading(false);
      }
    };

    loadDashboardData();
  }, []);

  const statCards = [
    {
      title: 'ICD-10 Codes',
      value: stats.totalCodes,
      icon: FileText,
      color: 'text-blue-600',
      bgColor: 'bg-blue-50',
      description: 'Total diagnosis codes',
      link: createPageUrl('ICD10Browser')
    },
    {
      title: 'Drug Entries',
      value: stats.totalDrugs,
      icon: Pill,
      color: 'text-green-600',
      bgColor: 'bg-green-50',
      description: 'Medication database',
      link: createPageUrl('DrugDatabase')
    },
    {
      title: 'AI Mappings',
      value: stats.aiMappings,
      icon: Brain,
      color: 'text-purple-600',
      bgColor: 'bg-purple-50',
      description: 'AI-powered insights',
      link: createPageUrl('AIMapper')
    },
    {
      title: 'Search Tools',
      value: 5,
      icon: Search,
      color: 'text-orange-600',
      bgColor: 'bg-orange-50',
      description: 'Advanced search',
      link: createPageUrl('SearchTools')
    }
  ];

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Medical Database Dashboard</h1>
            <p className="text-gray-600 mt-2">Comprehensive ICD-10 and Drug Information Management</p>
          </div>
          <div className="flex gap-2">
            <Button className="bg-blue-600 hover:bg-blue-700">
              <Plus className="w-4 h-4 mr-2" />
              Add ICD-10
            </Button>
            <Button className="bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4 mr-2" />
              Add Drug
            </Button>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[1, 2, 3, 4].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-gray-200 rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-700 to-indigo-700 bg-clip-text text-transparent">
            Medical Database Dashboard
          </h1>
          <p className="text-slate-600 mt-2">Comprehensive ICD-10 and Drug Information Management</p>
        </div>
        <div className="flex gap-3">
          <Link to={createPageUrl('ICD10Browser')}>
            <Button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Add ICD-10
            </Button>
          </Link>
          <Link to={createPageUrl('DrugDatabase')}>
            <Button className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 shadow-lg">
              <Plus className="w-4 h-4 mr-2" />
              Add Drug
            </Button>
          </Link>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {statCards.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <Link key={index} to={stat.link} className="block group">
              <Card className="hover:shadow-xl hover:-translate-y-1 transition-all duration-300 cursor-pointer bg-white border border-slate-200/60 shadow-lg">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className={`inline-flex p-3 rounded-xl ${stat.bgColor} mb-4`}>
                        <IconComponent className={`w-6 h-6 ${stat.color}`} />
                      </div>
                      <p className="text-sm font-semibold text-slate-600 uppercase tracking-wide">{stat.title}</p>
                      <p className="text-3xl font-bold text-slate-900 mt-2 mb-1">{stat.value}</p>
                      <p className="text-sm text-slate-500">{stat.description}</p>
                      <div className="flex items-center mt-4 text-sm font-medium text-blue-600 group-hover:text-blue-700 transition-colors">
                        <span>View All</span>
                        <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-1 transition-transform" />
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>

      {/* AI-Powered Tools Section */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 border border-blue-200/50 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                <Brain className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-800">AI-Powered Tools</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Leverage artificial intelligence for enhanced medical data management and insights.
            </p>
            <div className="space-y-3">
              <Link to={createPageUrl('AIMapper')}>
                <Button variant="outline" className="w-full justify-start h-12 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all">
                  <Brain className="w-4 h-4 mr-3 text-blue-600" />
                  <span className="font-medium">ICD-10 ↔ Drug Mapping</span>
                </Button>
              </Link>
              <Link to={createPageUrl('AIMapper')}>
                <Button variant="outline" className="w-full justify-start h-12 border-blue-200 hover:bg-blue-50 hover:border-blue-300 transition-all">
                  <Search className="w-4 h-4 mr-3 text-blue-600" />
                  <span className="font-medium">Drug → ICD-10 Mapping</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50 border border-green-200/50 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                <Database className="w-5 h-5 text-white" />
              </div>
              <span className="text-xl font-bold text-slate-800">Database Management</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-slate-600 mb-6 leading-relaxed">
              Comprehensive tools for importing, exporting, and organizing medical data.
            </p>
            <div className="space-y-3">
              <Link to={createPageUrl('DataManagement')}>
                <Button variant="outline" className="w-full justify-start h-12 border-green-200 hover:bg-green-50 hover:border-green-300 transition-all">
                  <Database className="w-4 h-4 mr-3 text-green-600" />
                  <span className="font-medium">Advanced Import</span>
                </Button>
              </Link>
              <Link to={createPageUrl('DataManagement')}>
                <Button variant="outline" className="w-full justify-start h-12 border-green-200 hover:bg-green-50 hover:border-green-300 transition-all">
                  <TrendingUp className="w-4 h-4 mr-3 text-green-600" />
                  <span className="font-medium">Browse Codes</span>
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity */}
      <div className="grid lg:grid-cols-2 gap-6 mb-8">
        <Card className="bg-white border border-slate-200/60 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg">
                  <Activity className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-800">Recent Activity</span>
              </span>
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Latest ICD-10 Codes</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentCodes.length > 0 ? (
              <div className="space-y-3">
                {recentCodes.map((code, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl border border-slate-200/50 hover:shadow-md transition-all">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 text-lg">{code.code}</div>
                      <div className="text-sm text-slate-600 truncate max-w-xs mt-1">
                        {code.description}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white border-blue-200 text-blue-700">{code.category}</Badge>
                  </div>
                ))}
                <Link to={createPageUrl('ICD10Browser')}>
                  <Button variant="outline" className="w-full mt-4 h-11 border-blue-200 hover:bg-blue-50 transition-all">
                    <Eye className="w-4 h-4 mr-2" />
                    <span className="font-medium">View All</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-12 text-lg">No recent ICD-10 codes</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white border border-slate-200/60 shadow-xl">
          <CardHeader className="pb-4">
            <CardTitle className="flex items-center justify-between">
              <span className="flex items-center gap-3">
                <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg">
                  <Pill className="w-5 h-5 text-white" />
                </div>
                <span className="text-xl font-bold text-slate-800">Latest Drugs</span>
              </span>
              <span className="text-sm font-medium text-slate-500 bg-slate-100 px-3 py-1 rounded-full">Recent Additions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recentDrugs.length > 0 ? (
              <div className="space-y-3">
                {recentDrugs.map((drug, index) => (
                  <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-green-50 rounded-xl border border-slate-200/50 hover:shadow-md transition-all">
                    <div className="flex-1">
                      <div className="font-semibold text-slate-900 text-lg">{drug.name}</div>
                      <div className="text-sm text-slate-600 mt-1">
                        {drug.genericName} • {drug.strength}
                      </div>
                    </div>
                    <Badge variant="outline" className="bg-white border-green-200 text-green-700">{drug.category}</Badge>
                  </div>
                ))}
                <Link to={createPageUrl('DrugDatabase')}>
                  <Button variant="outline" className="w-full mt-4 h-11 border-green-200 hover:bg-green-50 transition-all">
                    <Eye className="w-4 h-4 mr-2" />
                    <span className="font-medium">View All</span>
                  </Button>
                </Link>
              </div>
            ) : (
              <p className="text-slate-500 text-center py-12 text-lg">No recent drugs</p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Top Categories */}
      <Card className="bg-white border border-slate-200/60 shadow-xl">
        <CardHeader className="pb-6">
          <CardTitle className="flex items-center gap-3">
            <div className="p-2 bg-gradient-to-br from-purple-500 to-violet-600 rounded-lg">
               <BarChart3 className="w-5 h-5 text-white" />
             </div>
            <span className="text-xl font-bold text-slate-800">Top Categories</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {topCategories.length > 0 ? (
            <div className="space-y-4">
              {topCategories.map((item, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gradient-to-r from-slate-50 to-purple-50 rounded-xl border border-slate-200/50 hover:shadow-md transition-all">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-violet-600 rounded-full flex items-center justify-center shadow-lg">
                      <span className="text-sm font-bold text-white">{index + 1}</span>
                    </div>
                    <div>
                      <div className="font-semibold text-slate-900 text-lg capitalize">
                        {item.category.replace('_', ' ')}
                      </div>
                      <div className="text-sm text-slate-600 font-medium">{item.count} items</div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-slate-900">{item.count}</div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-slate-500 text-center py-12 text-lg">No category data available</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}