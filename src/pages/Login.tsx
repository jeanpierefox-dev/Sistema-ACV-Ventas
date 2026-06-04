import React, { useState } from 'react';
import { signInWithEmailAndPassword, createUserWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useNavigate } from 'react-router-dom';
import { Egg, Lock, User as UserIcon, UserPlus } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const loginEmail = username.includes('@') ? username : `${username.toLowerCase().replace(/\s+/g, '')}@campoverde.com`;
      
      if (isRegistering) {
        const userCred = await createUserWithEmailAndPassword(auth, loginEmail, password);
        // Create the user document with ADMIN role by default since it's the first registration flow
        await setDoc(doc(db, 'users', userCred.user.uid), {
          id: userCred.user.uid,
          email: loginEmail,
          username: username.includes('@') ? username.split('@')[0] : username,
          name: name || (username.includes('@') ? username.split('@')[0] : username),
          role: 'ADMIN',
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
        navigate('/');
      } else {
        await signInWithEmailAndPassword(auth, loginEmail, password);
        navigate('/');
      }
    } catch (err: any) {
      console.error("Firebase Login Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('Debes habilitar "Correo/Contraseña" en Firebase para que funcione el inicio de sesión por Usuario. (Ajuste técnico interno).');
      } else if (err.code === 'auth/network-request-failed') {
        setError('Error de red. Verifica tu conexión a internet.');
      } else {
        setError(isRegistering ? 'Error al crear la cuenta. Intenta nuevamente.' : 'Credenciales inválidas o cuenta no registrada.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    if (loading) return;
    setError('');
    setLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      const userCred = await signInWithPopup(auth, provider);
      
      const userDocRef = doc(db, 'users', userCred.user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (!userDocSnap.exists()) {
        await setDoc(userDocRef, {
          id: userCred.user.uid,
          email: userCred.user.email,
          name: userCred.user.displayName || userCred.user.email?.split('@')[0],
          role: 'ADMIN',
          isActive: true,
          createdAt: Date.now(),
          updatedAt: Date.now()
        });
      }
      navigate('/');
    } catch (err: any) {
      console.error("Google Auth Error:", err);
      if (err.code === 'auth/operation-not-allowed') {
        setError('El inicio de sesión con Google no está habilitado.');
      } else if (err.code === 'auth/popup-blocked') {
        setError('El navegador bloqueó la ventana emergente.');
      } else if (err.code === 'auth/cancelled-popup-request' || err.code === 'auth/popup-closed-by-user') {
        setError('La ventana emergente de inicio de sesión fue cerrada.');
      } else if (err.code === 'auth/unauthorized-domain') {
        setError('El dominio actual no está autorizado en Firebase. Para Vercel, agrégalo en Firebase Console > Authentication > Settings > Authorized domains.');
      } else {
        setError('Error al iniciar sesión con Google.');
      }
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
            <label className="block text-sm font-medium text-slate-300 mb-2">Usuario o Correo</label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                <UserIcon className="h-5 w-5 text-slate-400" />
              </div>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="bg-white/10 border border-white/20 rounded-xl pl-10 pr-4 py-3 w-full text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 ring-indigo-500/50 backdrop-blur-md transition-all"
                placeholder="Usuario o correo"
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
                minLength={6}
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full bg-indigo-500 hover:bg-indigo-400 py-3 rounded-2xl border border-white/10 text-center font-bold shadow-lg shadow-indigo-500/20 transition-all mt-4"
          >
            {isRegistering ? 'Crear Administrador' : 'Iniciar Sesión'}
          </button>
          
          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-white/10"></div>
            </div>
            <div className="relative flex justify-center text-sm">
              <span className="px-2 bg-slate-900/50 backdrop-blur-xl text-slate-400">O continuar con</span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            className="w-full bg-white text-slate-900 hover:bg-slate-100 py-3 rounded-2xl font-bold transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
            Google
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
            Autenticación segura gestionada por plataforma
          </p>
        </form>
      </div>
    </div>
  );
}
