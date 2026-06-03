import React, { useState, useEffect } from 'react';
import { collection, query, onSnapshot, doc, updateDoc, deleteDoc, setDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { User } from '../types';
import { ShieldCheck, UserCog, Plus, Trash2, Edit2 } from 'lucide-react';
import { format } from 'date-fns';
import firebaseConfig from '../../firebase-applet-config.json';
import { initializeApp, getApps } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword } from 'firebase/auth';

const secondaryApp = getApps().find(app => app.name === 'Secondary') || initializeApp(firebaseConfig, 'Secondary');
const secondaryAuth = getAuth(secondaryApp);

export default function Users() {
  const [users, setUsers] = useState<User[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({ id: '', name: '', email: '', password: '', role: 'USER' });

  useEffect(() => {
    const q = query(collection(db, 'users'));
    const unsub = onSnapshot(q, snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() } as User))));
    return () => unsub();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      try {
          if (isEditing) {
              await updateDoc(doc(db, 'users', formData.id), {
                  name: formData.name,
                  role: formData.role,
                  updatedAt: Date.now()
              });
          } else {
              // Register in secondary auth so we don't log out the current admin
              const userCredential = await createUserWithEmailAndPassword(secondaryAuth, formData.email, formData.password);
              const newUserId = userCredential.user.uid;
              
              await setDoc(doc(db, 'users', newUserId), {
                  name: formData.name,
                  email: formData.email,
                  role: formData.role,
                  isActive: true,
                  createdAt: Date.now(),
                  updatedAt: Date.now()
              });
              
              await secondaryAuth.signOut();
          }
          setShowModal(false);
          setFormData({ id: '', name: '', email: '', password: '', role: 'USER' });
          setIsEditing(false);
      } catch (err: any) {
          console.error(err);
          alert('Error: ' + err.message);
      }
  };

  const handleEdit = (u: User) => {
      setFormData({ id: u.id, name: u.name, email: u.email, password: '', role: u.role });
      setIsEditing(true);
      setShowModal(true);
  };

  const handleDelete = async (userId: string) => {
      if (confirm('¿Eliminar este usuario? Esto revocará su acceso a la plataforma.')) {
          try {
              await deleteDoc(doc(db, 'users', userId));
          } catch(e: any) {
              alert('Error al eliminar: ' + e.message);
          }
      }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-white">Usuarios y Permisos</h1>
          <p className="text-slate-400">Gestión de cuentas y niveles de acceso.</p>
        </div>
        <button onClick={() => { setFormData({ id: '', name: '', email: '', password: '', role: 'USER' }); setIsEditing(false); setShowModal(true); }} className="flex items-center space-x-2 bg-indigo-500 hover:bg-indigo-400 text-white px-5 py-2.5 rounded-2xl font-bold transition-all shadow-lg shadow-indigo-500/20">
          <Plus className="w-5 h-5" /><span>Nuevo Usuario</span>
        </button>
      </div>

      <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-3xl overflow-hidden">
        <table className="min-w-full divide-y divide-white/10 text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Usuario</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Correo</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Rol / Nivel</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Registro</th>
              <th className="px-6 py-4 text-left text-xs font-semibold text-indigo-300 uppercase tracking-wider">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-white/10">
            {users.map(u => (
              <tr key={u.id} className="hover:bg-white/5 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap font-medium text-white flex items-center gap-2">
                  <UserCog className="w-5 h-5 text-slate-400" />
                  {u.name}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-300">{u.email}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                   <span className={`px-3 py-1 inline-flex text-[10px] uppercase tracking-wider font-bold rounded-full ${
                    u.role === 'ADMIN' ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/20' : 
                    u.role === 'MANAGER' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/20' : 
                    'bg-slate-500/20 text-slate-300 border border-slate-500/20'
                  }`}>
                    {u.role}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-slate-300">
                  {u.createdAt ? format(u.createdAt, 'dd/MM/yyyy') : '-'}
                </td>
                <td className="px-6 py-4 whitespace-nowrap flex items-center gap-2">
                    <button onClick={() => handleEdit(u)} className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded-lg transition-colors">
                        <Edit2 className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleDelete(u.id)} className="p-2 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded-lg transition-colors">
                        <Trash2 className="w-4 h-4" />
                    </button>
                </td>
              </tr>
            ))}
            {users.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-slate-400">
                    No hay usuarios registrados.
                  </td>
                </tr>
            )}
          </tbody>
        </table>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/90 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl w-full max-w-md p-6">
            <h2 className="text-xl font-bold text-white mb-6">{isEditing ? 'Modificar Usuario' : 'Nuevo Usuario'}</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Nombre</label>
                <input 
                  type="text" required
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white transition-all"
                  value={formData.name}
                  onChange={e => setFormData({...formData, name: e.target.value})}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Correo Electrónico</label>
                <input 
                  type="email" required disabled={isEditing}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white transition-all disabled:opacity-50"
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                />
              </div>
              {!isEditing && (
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-1">Contraseña</label>
                    <input 
                      type="password" required minLength={6}
                      className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white transition-all"
                      value={formData.password}
                      onChange={e => setFormData({...formData, password: e.target.value})}
                    />
                  </div>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Rol / Permisos</label>
                <select 
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ring-indigo-500/50 text-white transition-all appearance-none"
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                >
                  <option value="ADMIN" className="bg-slate-800">Administrador</option>
                  <option value="MANAGER" className="bg-slate-800">Gerente</option>
                  <option value="USER" className="bg-slate-800">Usuario</option>
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-6 border-t border-white/10 mt-6">
                <button type="button" onClick={() => setShowModal(false)} className="px-5 py-2.5 text-sm font-medium text-slate-300 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all">Cancelar</button>
                <button type="submit" className="px-5 py-2.5 text-sm font-bold text-white bg-indigo-500 hover:bg-indigo-400 rounded-2xl transition-all shadow-lg shadow-indigo-500/20">{isEditing ? 'Guardar Cambios' : 'Crear Usuario'}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
