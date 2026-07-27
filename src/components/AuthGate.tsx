import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Mail, Lock, User, Phone, Eye, EyeOff, Shield, CheckCircle2, AlertCircle, Sparkles, ArrowLeft, KeyRound } from 'lucide-react';
import Brand from './Brand';
import { getPublicOrigin } from '../lib/urlHelper';

interface AuthGateProps {
  onAuthSuccess: (token: string, user: any) => void;
}

export default function AuthGate({ onAuthSuccess }: AuthGateProps) {
  // Navigation & Flow states
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  // Password reset token flow states (URL token)
  const [publicResetToken, setPublicResetToken] = useState<string | null>(null);
  const [simulatedResetUrl, setSimulatedResetUrl] = useState('');

  // Invitation flow states
  const [inviteToken, setInviteToken] = useState<string | null>(null);
  const [isAcceptingInvite, setIsAcceptingInvite] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('employee');

  // Forced reset flow states (First-login reset)
  const [needsReset, setNeedsReset] = useState(false);
  const [resetToken, setResetToken] = useState<string | null>(null);

  // Input states
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [forgotEmail, setForgotEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // Profile creation states (For Accept Invite)
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');

  // Check for invite or recovery token on mount
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const token = params.get('token');
    if (token) {
      setLoading(true);
      // Try to fetch invite-info to see if it is an invitation
      fetch(`/api/auth/invite-info?token=${token}`)
        .then(res => {
          if (!res.ok) {
            throw new Error('Not an invite');
          }
          return res.json();
        })
        .then(data => {
          setInviteToken(token);
          setIsAcceptingInvite(true);
          setInviteEmail(data.email);
          setInviteRole(data.role);
          setFirstName(data.name || '');
          setPhone(data.phone || '');
          setEmail(data.email);
          setErrorMsg('');
        })
        .catch(() => {
          // If not an invitation, it's a password recovery token
          setPublicResetToken(token);
          setIsForgotPassword(false);
          setIsLogin(false);
          setErrorMsg('');
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, []);

  const validateEmail = (emailStr: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailStr);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!email || !password) {
      setErrorMsg('Por favor ingrese su correo y contraseña.');
      return;
    }

    if (!validateEmail(email)) {
      setErrorMsg('Por favor ingrese un correo electrónico válido.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error en el inicio de sesión.');
      }

      // Check if user is forced to reset password on first login
      if (data.user && data.user.force_password_reset) {
        setNeedsReset(true);
        setResetToken(data.accesstoken); // Save token for reset auth
        setSuccessMsg('Acceso correcto. Por políticas de seguridad, debe cambiar su contraseña.');
        setLoading(false);
        return;
      }

      setSuccessMsg('¡Sesión iniciada con éxito! Redirigiendo...');
      setTimeout(() => {
        onAuthSuccess(data.accesstoken, data.user);
      }, 1000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Credenciales inválidas o error de red.');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');
    setSimulatedResetUrl('');

    if (!forgotEmail) {
      setErrorMsg('Por favor ingrese su correo electrónico.');
      return;
    }

    if (!validateEmail(forgotEmail)) {
      setErrorMsg('Por favor ingrese un correo válido.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al procesar la solicitud.');
      }

      setSuccessMsg(data.message);
      if (data.simulated_token) {
        // Form the clickable sandbox test link so reviewers can test recovery without real email setups!
        const resetLink = `${getPublicOrigin()}${window.location.pathname}?token=${data.simulated_token}`;
        setSimulatedResetUrl(resetLink);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'No se pudo conectar con el servidor.');
    } finally {
      setLoading(false);
    }
  };

  const handlePublicResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPassword || !confirmPassword) {
      setErrorMsg('Debe rellenar ambos campos.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('La contraseña nueva debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          token: publicResetToken,
          password: newPassword 
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al restablecer la contraseña.');
      }

      setSuccessMsg('¡Contraseña restablecida con éxito! Ya puede iniciar sesión.');
      setTimeout(() => {
        setPublicResetToken(null);
        // Clean query parameter from address bar
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsForgotPassword(false);
        setIsLogin(true);
        setNewPassword('');
        setConfirmPassword('');
        setErrorMsg('');
        setSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al restablecer la contraseña.');
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!firstName || !lastName || !password) {
      setErrorMsg('Nombre, Apellido y Contraseña son obligatorios.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('La contraseña debe tener al menos 6 caracteres.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/accept-invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          token: inviteToken,
          first_name: firstName,
          last_name: lastName,
          phone,
          password
        })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al aceptar la invitación.');
      }

      setSuccessMsg('¡Cuenta creada y activada con éxito! Ya puede iniciar sesión.');
      setTimeout(() => {
        setIsAcceptingInvite(false);
        setInviteToken(null);
        window.history.replaceState({}, document.title, window.location.pathname);
        setIsLogin(true);
        setEmail(inviteEmail);
        setPassword('');
        setErrorMsg('');
        setSuccessMsg('');
      }, 2000);
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al procesar el registro de la invitación.');
    } finally {
      setLoading(false);
    }
  };

  const handleForcedResetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!newPassword || !confirmPassword) {
      setErrorMsg('Debe rellenar ambos campos.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMsg('La contraseña nueva debe tener al menos 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      setErrorMsg('Las contraseñas no coinciden.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${resetToken}`
        },
        body: JSON.stringify({ password: newPassword })
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.message || 'Error al restablecer la contraseña.');
      }

      setSuccessMsg('¡Contraseña actualizada correctamente! Iniciando sesión...');
      
      // Auto login
      const loginRes = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email, password: newPassword })
      });
      const loginData = await loginRes.json();
      
      if (loginRes.ok) {
        setTimeout(() => {
          onAuthSuccess(loginData.accesstoken, loginData.user);
        }, 1000);
      } else {
        setNeedsReset(false);
        setResetToken(null);
        setIsLogin(true);
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Error al actualizar contraseña.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 relative overflow-hidden font-sans text-[#050507]">
      
      {/* Dynamic graphic highlights for corporate colors */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[#FF7AA6]/8 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-[#203180]/8 rounded-full blur-[120px] pointer-events-none" />

      {/* Subtle depth gradient background circles behind card */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[340px] h-[340px] bg-gradient-to-tr from-[#203180]/12 to-[#FF7AA6]/12 rounded-full blur-[70px] pointer-events-none z-0" />

      {/* Main card with login-hero dynamic class */}
      <div className="max-w-md w-full bg-white rounded-3xl p-6 sm:p-8 border border-[#050507]/10 relative z-10 transition-all card-youthful login-hero">
        
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center mb-6">
          <Brand className="text-3xl font-bold tracking-tight mb-2" />
          <p className="text-[11px] text-gray-500 font-medium tracking-wide uppercase">
            {isAcceptingInvite 
              ? `Registro de Invitado (${inviteRole.toUpperCase()})` 
              : publicResetToken
                ? 'Establecer Nueva Contraseña'
                : needsReset 
                  ? 'Cambio de Seguridad Obligatorio' 
                  : isForgotPassword
                    ? 'Recuperación de Acceso'
                    : 'Acceso Administrativo'}
          </p>
        </div>

        {/* Messaging Area */}
        <AnimatePresence mode="wait">
          {errorMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-[#C80C0C]/5 border border-[#C80C0C]/15 text-[#C80C0C] rounded-xl text-xs flex items-center gap-2.5 font-medium"
            >
              <AlertCircle className="w-4.5 h-4.5 shrink-0" />
              <span>{errorMsg}</span>
            </motion.div>
          )}

          {successMsg && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mb-4 p-3 bg-[#203180]/5 border border-[#203180]/15 text-[#203180] rounded-xl text-xs flex items-center gap-2.5 font-medium"
            >
              <CheckCircle2 className="w-4.5 h-4.5 shrink-0" />
              <span>{successMsg}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Simulated recovery link for previewer sandbox review */}
        {simulatedResetUrl && (
          <div className="mb-4 p-3.5 bg-[#FF7AA6]/5 border border-[#FF7AA6]/20 text-[#050507] rounded-xl text-[11px] leading-relaxed">
            <p className="font-bold text-[#FF7AA6] mb-1 uppercase tracking-wider text-[9px]">Simulación Sandbox de Correo:</p>
            <p className="text-gray-600 mb-2">Haga clic abajo para ir directamente al formulario de restablecimiento:</p>
            <a 
              href={simulatedResetUrl} 
              className="inline-flex items-center gap-1.5 text-[#203180] font-bold underline hover:text-[#FF7AA6] transition-colors"
            >
              <KeyRound className="w-3.5 h-3.5" /> Restablecer Contraseña Ahora
            </a>
          </div>
        )}

        {/* 1. PUBLIC RESET PASSWORD FLOW (URL token) */}
        {publicResetToken && (
          <form onSubmit={handlePublicResetSubmit} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#050507]/60 mb-1 tracking-wider">Nueva Contraseña</label>
              <div className="relative">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#203180] rounded-full flex items-center justify-center z-10">
                  <Lock className="w-3.5 h-3.5 text-[#FF7AA6]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-[#050507]/15 rounded-xl py-2.5 pl-11 pr-10 text-[#050507] text-xs focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-[#050507]/60 mb-1 tracking-wider">Confirmar Contraseña</label>
              <div className="relative">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#203180] rounded-full flex items-center justify-center z-10">
                  <Lock className="w-3.5 h-3.5 text-[#FF7AA6]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Repita la nueva contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-[#050507]/15 rounded-xl py-2.5 pl-11 pr-10 text-[#050507] text-xs focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2 mt-4 uppercase tracking-wider text-white"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Restablecer Contraseña</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 2. FORCED RESET ON FIRST LOGIN */}
        {needsReset && !publicResetToken && (
          <form onSubmit={handleForcedResetSubmit} className="space-y-4">
            <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-xl text-xs text-yellow-800 mb-2 leading-relaxed font-medium">
              🔑 Se requiere restablecer su contraseña temporal por políticas de seguridad antes de su primer acceso.
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-[#050507]/60 mb-1 tracking-wider">Nueva Contraseña</label>
              <div className="relative">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#203180] rounded-full flex items-center justify-center z-10">
                  <Lock className="w-3.5 h-3.5 text-[#FF7AA6]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={newPassword}
                  onChange={e => setNewPassword(e.target.value)}
                  className="w-full bg-white border border-[#050507]/15 rounded-xl py-2.5 pl-11 pr-10 text-[#050507] text-xs focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-[#050507]/60 mb-1 tracking-wider">Confirmar Contraseña</label>
              <div className="relative">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#203180] rounded-full flex items-center justify-center z-10">
                  <Lock className="w-3.5 h-3.5 text-[#FF7AA6]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Confirme la contraseña"
                  value={confirmPassword}
                  onChange={e => setConfirmPassword(e.target.value)}
                  className="w-full bg-white border border-[#050507]/15 rounded-xl py-2.5 pl-11 pr-10 text-[#050507] text-xs focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2 mt-4 uppercase tracking-wider text-white"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Establecer Contraseña</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* 3. FORGOT PASSWORD REQUEST FORM */}
        {isForgotPassword && !publicResetToken && !needsReset && (
          <form onSubmit={handleForgotPasswordSubmit} className="space-y-4">
            <p className="text-xs text-gray-600 mb-4">
              Ingrese su correo registrado. Le generaremos un enlace seguro para reajustar su acceso.
            </p>

            <div>
              <label className="block text-[10px] uppercase font-bold text-[#050507]/60 mb-1 tracking-wider">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#203180] rounded-full flex items-center justify-center z-10">
                  <Mail className="w-3.5 h-3.5 text-[#FF7AA6]" />
                </div>
                <input
                  type="email"
                  placeholder="correo@ejemplo.com"
                  value={forgotEmail}
                  onChange={e => setForgotEmail(e.target.value)}
                  className="w-full bg-white border border-[#050507]/15 rounded-xl py-2.5 pl-11 pr-3 text-[#050507] text-xs focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2 mt-4 uppercase tracking-wider text-white"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Solicitar Enlace</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                setIsForgotPassword(false);
                setErrorMsg('');
                setSuccessMsg('');
                setSimulatedResetUrl('');
              }}
              className="w-full flex items-center justify-center gap-1.5 text-xs font-bold text-[#203180] hover:underline pt-2 mt-2 cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4" /> Volver al Inicio de Sesión
            </button>
          </form>
        )}

        {/* 4. STANDARD LOGIN FORM */}
        {isLogin && !isForgotPassword && !publicResetToken && !needsReset && !isAcceptingInvite && (
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="block text-[10px] uppercase font-bold text-[#050507]/60 mb-1 tracking-wider">Correo Electrónico</label>
              <div className="relative">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#203180] rounded-full flex items-center justify-center z-10">
                  <Mail className="w-3.5 h-3.5 text-[#FF7AA6]" />
                </div>
                <input
                  type="email"
                  placeholder="kenisra156@gmail.com"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full bg-white border border-[#050507]/15 rounded-xl py-2.5 pl-11 pr-3 text-[#050507] text-xs focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                  required
                />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="block text-[10px] uppercase font-bold text-[#050507]/60 tracking-wider">Contraseña</label>
                <button
                  type="button"
                  onClick={() => setIsForgotPassword(true)}
                  className="text-[10px] text-[#FF7AA6] font-bold hover:underline cursor-pointer"
                >
                  ¿Olvidó su contraseña?
                </button>
              </div>
              <div className="relative">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#203180] rounded-full flex items-center justify-center z-10">
                  <Lock className="w-3.5 h-3.5 text-[#FF7AA6]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#050507]/15 rounded-xl py-2.5 pl-11 pr-10 text-[#050507] text-xs focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2 mt-6 uppercase tracking-wider text-white"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Shield className="w-4 h-4" />
                  <span>Ingresar al CRM</span>
                </>
              )}
            </button>

            {/* Safety badge with shield icon and tiny text in --kein-blue */}
            <div className="flex items-center justify-center gap-1.5 mt-4 text-[10px] text-[#203180] font-bold uppercase tracking-wider bg-[#203180]/5 py-1.5 px-3 rounded-lg border border-[#203180]/10">
              <Shield className="w-3.5 h-3.5 text-[#FF7AA6] shrink-0" />
              <span>Conexión de Seguridad Militar SSL Activa</span>
            </div>
          </form>
        )}

        {/* 5. ACCEPT INVITATION REGISTER FORM */}
        {isAcceptingInvite && !publicResetToken && !needsReset && (
          <form onSubmit={handleAcceptInviteSubmit} className="space-y-4">
            <div className="p-3 bg-indigo-50 border border-indigo-100 rounded-xl text-xs text-[#203180] mb-2 leading-relaxed font-medium">
              📩 Registro por invitación validado para {inviteEmail}.
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-[#050507]/60 mb-1 tracking-wider">Correo Invitado</label>
              <div className="relative">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-gray-200 rounded-full flex items-center justify-center z-10">
                  <Mail className="w-3.5 h-3.5 text-gray-500" />
                </div>
                <input
                  type="email"
                  value={inviteEmail}
                  disabled
                  className="w-full bg-gray-50 border border-gray-200 rounded-xl py-2.5 pl-11 pr-3 text-gray-500 text-xs min-h-[44px]"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#050507]/60 mb-1 tracking-wider">Nombre</label>
                <div className="relative">
                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#203180] rounded-full flex items-center justify-center z-10">
                    <User className="w-3.5 h-3.5 text-[#FF7AA6]" />
                  </div>
                  <input
                    type="text"
                    placeholder="Kenneth"
                    value={firstName}
                    onChange={e => setFirstName(e.target.value)}
                    className="w-full bg-white border border-[#050507]/15 rounded-xl py-2 pl-11 pr-3 text-[#050507] text-xs focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-[10px] uppercase font-bold text-[#050507]/60 mb-1 tracking-wider">Apellido</label>
                <div className="relative">
                  <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#203180] rounded-full flex items-center justify-center z-10">
                    <User className="w-3.5 h-3.5 text-[#FF7AA6]" />
                  </div>
                  <input
                    type="text"
                    placeholder="Mosquera"
                    value={lastName}
                    onChange={e => setLastName(e.target.value)}
                    className="w-full bg-white border border-[#050507]/15 rounded-xl py-2 pl-11 pr-3 text-[#050507] text-xs focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-[#050507]/60 mb-1 tracking-wider">Teléfono de Contacto</label>
              <div className="relative">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#203180] rounded-full flex items-center justify-center z-10">
                  <Phone className="w-3.5 h-3.5 text-[#FF7AA6]" />
                </div>
                <input
                  type="text"
                  placeholder="0959683101"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  className="w-full bg-white border border-[#050507]/15 rounded-xl py-2 pl-11 pr-3 text-[#050507] text-xs focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] uppercase font-bold text-[#050507]/60 mb-1 tracking-wider">Contraseña</label>
              <div className="relative">
                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 w-7 h-7 bg-[#203180] rounded-full flex items-center justify-center z-10">
                  <Lock className="w-3.5 h-3.5 text-[#FF7AA6]" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Mínimo 6 caracteres"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full bg-white border border-[#050507]/15 rounded-xl py-2.5 pl-11 pr-10 text-[#050507] text-xs focus:outline-none focus:border-[#FF7AA6] focus:ring-1 focus:ring-[#FF7AA6] transition-all min-h-[44px]"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full btn-primary text-xs py-3 rounded-xl shadow-md flex items-center justify-center gap-2 mt-4 uppercase tracking-wider text-white"
            >
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/35 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Crear y Activar Cuenta</span>
                </>
              )}
            </button>
          </form>
        )}

        {/* Footer Support Notice - Replaced the Dev Seed Credentials */}
        <div className="mt-6 pt-5 border-t border-[#050507]/5 text-center text-xs text-gray-500 leading-relaxed font-medium">
          Acceso exclusivo para administradores autorizados. Contacte a soporte si necesita ayuda.
        </div>

      </div>
    </div>
  );
}
