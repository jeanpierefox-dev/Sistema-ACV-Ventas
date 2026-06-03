import React, { useState, useEffect } from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { auth } from '../lib/firebase';
import { Egg, Bird, Users, FileText, Home, LogOut, FileSearch, PlusCircle, Activity, FileBadge, Settings } from 'lucide-react';

export default function DashboardLayout() {
  const { userProfile } = useAuth();
  const location = useLocation();
  const [logoUrl, setLogoUrl] = useState<string | null>(localStorage.getItem('appLogo'));

  useEffect(() => {
      const handleStorageChange = () => {
          setLogoUrl(localStorage.getItem('appLogo'));
      };
      window.addEventListener('storage', handleStorageChange);
      return () => window.removeEventListener('storage', handleStorageChange);
  }, []);

  const handleLogout = () => {
    auth.signOut();
  };

  const navGroups = [
    {
      title: 'General',
      items: [
        { name: 'Inicio', path: '/', icon: Home, roles: ['ADMIN', 'MANAGER', 'USER'] },
      ]
    },
    {
      title: 'Planta de Incubación',
      items: [
        { name: 'Inventario y Mortalidad', path: '/inventario-bb', icon: PlusCircle, roles: ['ADMIN', 'MANAGER', 'USER'] },
        { name: 'Orden Despacho', path: '/pollos-bebes', icon: Egg, roles: ['ADMIN', 'MANAGER', 'USER'] },
      ]
    },
    {
      title: 'Granja',
      items: [
        { name: 'Inventario y Mortalidad', path: '/inventario-vivos', icon: Activity, roles: ['ADMIN', 'MANAGER', 'USER'] },
        { name: 'Orden Despacho', path: '/pollos-vivos', icon: Bird, roles: ['ADMIN', 'MANAGER', 'USER'] },
      ]
    },
    {
      title: 'Ventas y Emisión',
      items: [
        { name: 'Registro de Ventas', path: '/ventas', icon: FileText, roles: ['ADMIN', 'MANAGER', 'USER'] },
        { name: 'Certificados SENASA', path: '/certificados', icon: FileBadge, roles: ['ADMIN', 'MANAGER', 'USER'] },
      ]
    },
    {
      title: 'Administración',
      items: [
        { name: 'Reportes', path: '/reportes', icon: FileText, roles: ['ADMIN', 'MANAGER', 'USER'] },
        { name: 'Clientes', path: '/clientes', icon: Users, roles: ['ADMIN', 'MANAGER', 'USER'] },
        { name: 'Usuarios y Permisos', path: '/usuarios', icon: FileSearch, roles: ['ADMIN'] },
        { name: 'Configuración', path: '/config', icon: Settings, roles: ['ADMIN', 'MANAGER'] },
      ]
    }
  ];

  return (
    <div className="min-h-screen bg-slate-900 text-white font-sans overflow-hidden relative flex">
      {/* Background Mesh Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none"></div>

      {/* Sidebar */}
      <div className="w-72 bg-white/5 backdrop-blur-xl border-r border-white/10 flex-col p-6 hidden md:flex h-screen relative z-10">
        <div className="flex items-center gap-3 mb-8">
          {logoUrl ? (
              <div className="w-10 h-10 rounded-lg overflow-hidden border border-white/20 flex items-center justify-center bg-slate-800">
                  <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
              </div>
          ) : (
             <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center font-bold text-xl">AC</div>
          )}
          <span className="text-lg font-semibold tracking-tight uppercase">Campo Verde</span>
        </div>

        <nav className="space-y-6 flex-1 overflow-y-auto pr-2 scrollbar-hide">
          {navGroups.map((group, idx) => {
            const filteredItems = group.items.filter(item => userProfile ? item.roles.includes(userProfile.role || 'USER') : true);
            if (filteredItems.length === 0) return null;
            return (
              <div key={idx}>
                <h3 className="text-[10px] font-bold text-indigo-300 uppercase tracking-widest mb-3 pl-1">{group.title}</h3>
                <div className="space-y-1">
                  {filteredItems.map((item) => {
                    const Icon = item.icon;
                    const isActive = location.pathname === item.path;
                    return (
                      <Link
                        key={item.path}
                        to={item.path}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors text-sm ${
                          isActive ? 'bg-white/10 border border-white/10 text-white shadow-lg' : 'hover:bg-white/5 text-slate-300 opacity-80'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        <span>{item.name}</span>
                      </Link>
                    )
                  })}
                </div>
              </div>
            );
          })}
        </nav>

        <div className="mt-8 p-4 bg-white/5 rounded-2xl border border-white/10 relative z-10 flex items-center justify-between">
          <div className="truncate pr-2">
            <p className="text-sm font-medium text-white truncate">{userProfile?.name || 'Cargando...'}</p>
            <p className="text-xs text-slate-400 truncate">{userProfile?.role || '---'}</p>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition-colors flex-shrink-0"
            title="Cerrar sesión"
          >
            <LogOut className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col h-screen overflow-hidden relative z-10">
        <header className="bg-white/5 backdrop-blur-md border-b border-white/10 px-6 py-4 md:hidden flex justify-between items-center">
          <h1 className="font-bold text-lg">Campo Verde</h1>
          <button onClick={handleLogout} className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-white">
            <LogOut className="w-5 h-5" />
          </button>
        </header>

        <main className="flex-1 p-8 overflow-y-auto w-full mx-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
