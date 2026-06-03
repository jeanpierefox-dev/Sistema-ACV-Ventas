import React, { useState, useEffect } from 'react';
import { Settings, Upload, CheckCircle, Smartphone, Cloud, Trash2, AlertTriangle } from 'lucide-react';
import { db } from '../lib/firebase';
import { collection, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';

export default function Configuracion() {
  const { userProfile } = useAuth();
  const [logoUrl, setLogoUrl] = useState<string | null>(localStorage.getItem('appLogo'));
  const [isWiping, setIsWiping] = useState(false);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        setLogoUrl(result);
        localStorage.setItem('appLogo', result);
        // Force reload to apply logo everywhere if necessary, though context is better.
        // For simplicity, we just save it to local storage.
        window.dispatchEvent(new Event('storage'));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleResetLogo = () => {
      localStorage.removeItem('appLogo');
      setLogoUrl(null);
      window.dispatchEvent(new Event('storage'));
  };

  const wipeData = async () => {
      if (userProfile?.role !== 'ADMIN') {
          alert('Solo los administradores pueden realizar esta acción.');
          return;
      }

      const confirmStr = prompt('ATENCIÓN: Esta acción eliminará TODO el historial de ventas, inventario, reportes y clientes de este dispositivo y de la NUBE. Escriba "ELIMINAR" para confirmar:');
      
      if (confirmStr === 'ELIMINAR') {
          setIsWiping(true);
          try {
              // Delete Sales
              const salesSnap = await getDocs(collection(db, 'sales'));
              for (const document of salesSnap.docs) {
                  await deleteDoc(doc(db, 'sales', document.id));
              }

              // Delete InventoryLogs
              const invSnap = await getDocs(collection(db, 'inventoryLogs'));
              for (const document of invSnap.docs) {
                  await deleteDoc(doc(db, 'inventoryLogs', document.id));
              }

              // Delete Clients
              const clientsSnap = await getDocs(collection(db, 'clients'));
              for (const document of clientsSnap.docs) {
                  await deleteDoc(doc(db, 'clients', document.id));
              }

              alert('La información ha sido restablecida a modo de fábrica correctamente.');
          } catch (err: any) {
              console.error(err);
              alert('Ocurrió un error al intentar eliminar la base de datos: ' + err.message);
          } finally {
              setIsWiping(false);
          }
      } else {
          alert('Acción cancelada.');
      }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Configuración del Sistema</h1>
        <p className="text-slate-400">Personalización de interfaz, bases de datos y preferencias.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Logo card */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Settings className="w-6 h-6 text-indigo-400" />
                  <h2 className="text-lg font-bold text-white">Apariencia e Imagen</h2>
              </div>
              
              <div className="flex items-center gap-6">
                  <div className="w-24 h-24 bg-slate-800 rounded-2xl flex items-center justify-center border-2 border-dashed border-white/20 overflow-hidden relative">
                      {logoUrl ? (
                          <img src={logoUrl} alt="App Logo" className="w-full h-full object-cover" />
                      ) : (
                          <span className="text-3xl font-bold text-indigo-500">AC</span>
                      )}
                  </div>
                  <div className="space-y-3 flex-1">
                      <p className="text-sm text-slate-400">Personaliza el logo que aparece en el menú lateral y en parte superior. Se guardará de manera local.</p>
                      
                      <div className="flex gap-2">
                        <label className="flex items-center justify-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-all shadow-lg shadow-indigo-500/20">
                            <Upload className="w-4 h-4" />
                            <span>Subir Imagen</span>
                            <input type="file" accept="image/*" className="hidden" onChange={handleLogoUpload} />
                        </label>
                        {logoUrl && (
                            <button onClick={handleResetLogo} className="bg-white/10 hover:bg-white/20 text-white px-4 py-2 rounded-xl text-sm font-bold transition-all">
                                Restablecer
                            </button>
                        )}
                      </div>
                  </div>
              </div>
          </div>

          {/* Estado de Nube */}
          <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl p-6">
              <div className="flex items-center gap-3 mb-6 border-b border-white/10 pb-4">
                  <Cloud className="w-6 h-6 text-emerald-400" />
                  <h2 className="text-lg font-bold text-white">Estado de Conexión</h2>
              </div>
              
              <div className="flex items-start gap-4">
                  <div className="p-3 bg-emerald-500/20 rounded-xl border border-emerald-500/20">
                      <CheckCircle className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                      <h3 className="font-bold text-white mb-1">Sincronización en la Nube Activa</h3>
                      <p className="text-sm text-slate-400">
                          Toda tu información está siendo respaldada y sincronizada de manera segura en <strong className="text-white">Firebase Firestore (La nube de Google)</strong>. No perderás tus datos si cambias de dispositivo.
                      </p>
                  </div>
              </div>
          </div>
          
          {/* Zona Peligrosa */}
          <div className="bg-red-500/5 backdrop-blur-md border border-red-500/20 rounded-3xl p-6 md:col-span-2">
              <div className="flex items-center gap-3 mb-6 border-b border-red-500/20 pb-4">
                  <AlertTriangle className="w-6 h-6 text-red-500" />
                  <h2 className="text-lg font-bold text-red-400">Zona de Peligro</h2>
              </div>
              
              <div className="flex sm:flex-row flex-col justify-between items-start sm:items-center gap-4">
                  <div>
                      <h3 className="font-bold text-white mb-1">Restablecer a Modo de Fábrica</h3>
                      <p className="text-sm text-slate-400">Elimina de forma irreversible todos los registros de inventario, ventas y clientes de la base de datos global. Las cuentas de usuario permanecerán intactas.</p>
                  </div>
                  <button onClick={wipeData} disabled={isWiping} className="flex-shrink-0 flex items-center space-x-2 bg-red-600 hover:bg-red-500 text-white px-5 py-3 rounded-xl font-bold transition-all shadow-lg shadow-red-500/20">
                      {isWiping ? (
                          <span className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                      ) : (
                          <>
                            <Trash2 className="w-5 h-5" />
                            <span>VACIAR BASE DE DATOS</span>
                          </>
                      )}
                  </button>
              </div>
          </div>
      </div>
    </div>
  );
}
