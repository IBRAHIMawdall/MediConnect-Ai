import React from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "./utils";
import { useAuth } from "./contexts/AuthContext";
import {
  Database, 
  Search, 
  Pill, 
  FileText, 
  Brain,
  Stethoscope,
  Activity,
  Import,
  Settings,
  Users,
  Shield,
  LogOut,
  Crown,
  User
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarProvider,
  SidebarTrigger,
} from "./components/ui/sidebar";

const getNavigationItems = (user) => {
  const baseItems = [
    {
      title: "Dashboard",
      url: createPageUrl("Dashboard"),
      icon: Activity,
      description: "Overview & Analytics",
      requiresAuth: true
    },
    {
      title: "ICD-10 Browser",
      url: createPageUrl("ICD10Browser"),
      icon: FileText,
      description: "Browse diagnosis codes",
      requiresAuth: true
    },
    {
      title: "Drug Database",
      url: createPageUrl("DrugDatabase"),
      icon: Pill,
      description: "Medication information",
      requiresAuth: true
    },
    {
      title: "AI Mappings",
      url: createPageUrl("AIMapper"),
      icon: Brain,
      description: "AI-powered suggestions",
      requiresAuth: true
    },
    {
      title: "Search Tools",
      url: createPageUrl("SearchTools"),
      icon: Search,
      description: "Advanced search",
      requiresAuth: true
    }
  ];

  // Add owner-only items
  if (user?.role === 'owner') {
    baseItems.push(
      {
        title: "Data Management",
        url: createPageUrl("DataManagement"),
        icon: Import,
        description: "Import & Export",
        requiresAuth: true,
        ownerOnly: true
      }
    );
  }

  return baseItems;
};

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const { user, logout, switchRole } = useAuth();
  const navigationItems = getNavigationItems(user);

  // Show loading state if user is not loaded yet
  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <div className="text-center">
          <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl mx-auto mb-4">
            <Activity className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-xl font-semibold text-slate-700 mb-2">Loading...</h2>
          <p className="text-slate-500">Please wait while we load your session</p>
        </div>
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
        <Sidebar className="border-r border-slate-200/60 bg-white shadow-xl">
          <SidebarHeader className="border-b border-slate-200/60 bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-50">
            <div className="flex items-center gap-4 p-6">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-600 via-indigo-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-xl">
                <Activity className="w-7 h-7 text-white" />
              </div>
              <div className="flex-1">
                <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-700 via-indigo-700 to-purple-700 bg-clip-text text-transparent">
                  Mediconnect AI
                </h1>
                <p className="text-sm text-slate-600 font-medium">Medical Information System</p>
              </div>
            </div>
            
            {/* User Info Section */}
            <div className="px-6 pb-6">
              <div className="flex items-center justify-between p-4 bg-white/90 backdrop-blur-sm rounded-xl shadow-lg border border-slate-200/60">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center shadow-md ${
                    user.role === 'owner' 
                      ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white' 
                      : 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white'
                  }`}>
                    {user.role === 'owner' ? <Crown className="w-5 h-5" /> : <User className="w-5 h-5" />}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-slate-800">{user.name}</p>
                    <p className="text-xs text-slate-600 capitalize font-medium">{user.role}</p>
                  </div>
                </div>
                <button
                  onClick={() => switchRole(user.role === 'owner' ? 'user' : 'owner')}
                  className="text-xs px-3 py-2 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 rounded-lg transition-all duration-200 font-medium shadow-sm"
                  title="Switch Role"
                >
                  Switch
                </button>
              </div>
            </div>
          </SidebarHeader>
          
          <SidebarContent className="p-6">
            <SidebarGroup>
              <SidebarGroupLabel className="text-xs font-bold text-slate-600 uppercase tracking-widest px-3 py-4 bg-slate-50 rounded-lg mb-3">
                Medical Tools
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu className="space-y-2">
                  {navigationItems.map((item) => (
                    <SidebarMenuItem key={item.title}>
                      <SidebarMenuButton 
                        asChild 
                        className={`group hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 transition-all duration-300 rounded-xl p-4 border ${
                          location.pathname === item.url 
                            ? 'bg-gradient-to-r from-blue-50 via-indigo-50 to-purple-50 text-blue-700 shadow-lg border-blue-200/60 transform scale-[1.02]' 
                            : 'text-slate-600 border-transparent hover:border-blue-200/40 hover:shadow-md'
                        }`}
                      >
                        <Link to={item.url} className="flex items-center gap-4 w-full">
                          <div className={`p-2 rounded-lg transition-all duration-300 ${
                            location.pathname === item.url 
                              ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-lg' 
                              : 'bg-slate-100 text-slate-500 group-hover:bg-blue-100 group-hover:text-blue-600'
                          }`}>
                            <item.icon className="w-5 h-5" />
                          </div>
                          <div className="flex flex-col flex-1">
                            <div className="flex items-center gap-2">
                              <span className={`font-semibold text-sm transition-colors ${
                                location.pathname === item.url ? 'text-slate-800' : 'text-slate-700 group-hover:text-slate-800'
                              }`}>{item.title}</span>
                              {item.ownerOnly && (
                                <div className="p-1 bg-gradient-to-br from-amber-400 to-orange-500 rounded-md">
                                  <Shield className="w-3 h-3 text-white" />
                                </div>
                              )}
                            </div>
                            <span className={`text-xs transition-colors ${
                              location.pathname === item.url ? 'text-slate-600' : 'text-slate-500 group-hover:text-slate-600'
                            }`}>{item.description}</span>
                          </div>
                        </Link>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <main className="flex-1 flex flex-col">
          <header className="bg-white/90 backdrop-blur-sm border-b border-slate-200/60 px-6 py-4 md:hidden">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-slate-100 p-2 rounded-lg transition-colors duration-200" />
              <h1 className="text-xl font-bold text-slate-800">MedicalDB</h1>
            </div>
          </header>

          <div className="flex-1 overflow-auto">
            {children}
          </div>
        </main>
      </div>
    </SidebarProvider>
  );
}