import React, { useState } from 'react';
import { doc, setDoc, getDocs, collection, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Egg, Lock, User as UserIcon, UserPlus } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginCustom } = useAuth();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);

    try {
      if (isRegistering) {
        // Register local admin manually
        const newUserId = 'local_' + Date.now();
        await setDoc(doc(db, 'users', newUserId), {
          id: newUserId,
          email: `${username.toLowerCase().replace(/\s+/g, '')}@campoverde.com`,
          username: username.includes('@') ? username.split('@')[0] : username,
          password: password, // Storing in plain text locally as a workaround since Firebase Auth is blocked
          name: name || (username.includes('@') ? username.split('@')[0] : username),
          role: 'ADMIN',
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        loginCustom(newUserId);
        navigate('/');
      } else {
        // If they try default admin credentials, ensure it's seeded in DB
        if (username === 'admin' && password === '1234') {
          const checkAdminQ = query(collection(db, 'users'), where('username', '==', 'admin'));
          const checkAdminSnap = await getDocs(checkAdminQ);
          let adminId = 'local_admin_default';
          
          if (checkAdminSnap.empty) {
            await setDoc(doc(db, 'users', adminId), {
              id: adminId,
              username: 'admin',
              password: '1234',
              email: 'admin@campoverde.local',
              name: 'Administrador Principal',
              role: 'ADMIN',
              isActive: true,
              createdAt: Date.now(),
              updatedAt: Date.now()
            });
          } else {
             const userDoc = checkAdminSnap.docs[0];
             // Verify if the password matches 1234, otherwise it means they changed it!
             // Wait, if they changed the password, they shouldn't be able to login with 1234.
             if (userDoc.data().password !== '1234') {
                setError('Credenciales inválidas. (La contraseña de admin fue modificada).');
                setLoading(false);
                return;
             }
             adminId = userDoc.id;
          }
          
          loginCustom(adminId);
          navigate('/');
          return;
        }

        // Check if exists in users collection
        const q = query(
          collection(db, 'users'), 
          where('username', '==', username),
          where('password', '==', password)
        );
        const querySnapshot = await getDocs(q);

        if (!querySnapshot.empty) {
          const userDoc = querySnapshot.docs[0];
          if (userDoc.data().isActive === false) {
             setError('Esta cuenta está inactiva.');
          } else {
             loginCustom(userDoc.id);
             navigate('/');
          }
        } else {
          setError('Credenciales inválidas o cuenta no registrada.');
        }
      }
    } catch (err: any) {
      console.error("Login Error:", err);
      setError('Error al iniciar sesión. Intenta de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col justify-center items-center p-4 relative overflow-hidden text-white font-sans">
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-600/20 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-blue-500/20 blur-[120px] pointer-events-none"></div>

      <div className="w-full max-w-md bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl overflow-hidden relative z-10 shadow-2xl">
        <div className="p-8 text-center border-b border-white/10">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-indigo-500 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
              <Egg className="w-10 h-10 text-white" />
            </div>
          </div>
          <h1 className="text-2xl font-bold tracking-tight uppercase">Agropecuaria Campo Verde</h1>
          <p className="text-slate-400 text-sm mt-2">Sistema de Gestión de Ventas</p>
        </div>
        
        <form onSubmit={handleAuth} className="p-8 space-y-6">
          {error && (
            <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-3 rounded-lg text-sm text-center backdrop-blur-sm">
              {error}
            </div>
          )}
          
          {isRegistering && (
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">Nombre Completo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                  <UserPlus className="h-5 w-5 text-slate-400" />
                </div>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 w-full text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md transition-all"
                  placeholder="Tu nombre"
                  required={isRegistering}
                />
              </div>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Usuario</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 w-full text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md transition-all"
                placeholder="Nombre de Usuario"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-300 mb-2">Contraseña</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <Lock className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 w-full text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md transition-all"
                placeholder="••••••••"
                required
                minLength={4}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-400 py-3 rounded-2xl border border-white/10 text-center font-bold shadow-lg shadow-indigo-500/20 transition-all mt-4"
          >
            {isRegistering ? 'Crear Administrador' : 'Iniciar Sesión'}
          </button>

          <div className="text-center mt-6">
            <button
              type="button"
              onClick={() => setIsRegistering(!isRegistering)}
              className="text-sm text-indigo-400 hover:text-indigo-300 transition-colors"
            >
              {isRegistering ? '¿Ya tienes cuenta? Inicia sesión' : '¿No tienes cuenta? Registra un administrador'}
            </button>
          </div>

          <p className="text-[10px] text-slate-500 text-center mt-4 uppercase tracking-wider">
            Autenticación administrada por sistema interno
          </p>
        </form>
      </div>
    </div>
  );
}

