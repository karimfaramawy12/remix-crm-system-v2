import React, { useState } from 'react';
import { Mail, Lock, Building2, ArrowRight, Globe, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';
import { useI18n } from '../i18n';
import { useTheme } from '../theme';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface LoginProps {
  onLogin: (user: any, business: any) => void;
}

export default function Login({ onLogin }: LoginProps) {
  const { lang, setLang, t, isRtl } = useI18n();
  const [mode, setMode] = useState<'login' | 'register' | 'forgot'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [name, setName] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  React.useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === 'GOOGLE_LOGIN_SUCCESS') {
        const { token, user, business } = event.data;
        localStorage.setItem('token', token);
        onLogin(user, business);
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [onLogin]);

  const handleGoogleLogin = async () => {
    try {
      const res = await fetch('/api/auth/google/url');
      const data = await res.json();
      if (data.url) {
        window.open(data.url, 'google_login', 'width=500,height=600');
      } else if (data.error) {
        setError(data.error);
      }
    } catch (err) {
      setError('Failed to initialize Google Login');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    let endpoint = '';
    let body = {};

    if (mode === 'register') {
      endpoint = '/api/auth/register';
      body = { name, email, password, businessName };
    } else if (mode === 'login') {
      endpoint = '/api/auth/login';
      body = { email, password };
    } else if (mode === 'forgot') {
      endpoint = '/api/auth/reset-password';
      body = { email, newPassword };
    }

    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();

      if (data.error) {
        setError(data.error);
      } else if (mode === 'register') {
        setMode('login');
        setSuccess('Registration successful! Please login.');
      } else if (mode === 'forgot') {
        setMode('login');
        setSuccess('Password reset successful! Please login with your new password.');
      } else {
        localStorage.setItem('token', data.token);
        onLogin(data.user, data.business);
      }
    } catch (err) {
      setError('Something went wrong. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-6 transition-colors duration-300">
      <div className="mb-8 flex items-center gap-4">
        <div className="flex items-center bg-white rounded-2xl p-1 shadow-sm border border-slate-100">
          <button 
            onClick={() => setLang('en')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              lang === 'en' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700"
            )}
          >
            English
          </button>
          <button 
            onClick={() => setLang('ar')}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-bold transition-all",
              lang === 'ar' ? "bg-indigo-600 text-white shadow-lg" : "text-slate-500 hover:text-slate-700"
            )}
          >
            العربية
          </button>
        </div>
      </div>

      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-md w-full bg-white rounded-3xl shadow-xl shadow-slate-200/20 border border-slate-100 overflow-hidden"
      >
        <div className="p-8 sm:p-12">
          <div className="flex justify-center mb-8">
            <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-indigo-100">
              N
            </div>
          </div>
          
          <div className="text-center mb-10">
            <h1 className="text-3xl font-bold text-slate-900 mb-2">
              {mode === 'register' ? (isRtl ? 'إنشاء حساب جديد' : 'Create your account') : mode === 'forgot' ? (isRtl ? 'إعادة تعيين كلمة المرور' : 'Reset Password') : t('welcome')}
            </h1>
            <p className="text-slate-500">
              {mode === 'register' ? (isRtl ? 'ابدأ إدارة عملك اليوم' : 'Start managing your business today') : mode === 'forgot' ? (isRtl ? 'أدخل بريدك الإلكتروني وكلمة مرور جديدة' : 'Enter your email and a new password') : (isRtl ? 'يرجى إدخال بياناتك لتسجيل الدخول' : 'Please enter your details to sign in')}
            </p>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-red-50 text-red-700 rounded-xl text-sm border border-red-100">
              {error}
            </div>
          )}

          {success && (
            <div className="mb-6 p-4 bg-emerald-50 text-emerald-700 rounded-xl text-sm border border-emerald-100">
              {success}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            {mode === 'register' && (
              <>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-1">{isRtl ? 'الاسم الكامل' : 'Full Name'}</label>
                  <div className="relative">
                    <input 
                      type="text" 
                      required
                      value={name}
                      onChange={e => setName(e.target.value)}
                      placeholder={isRtl ? 'زيد بن حارثة' : 'John Doe'}
                      className="w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-semibold text-slate-700 ml-1">{isRtl ? 'اسم العمل' : 'Business Name'}</label>
                  <div className="relative">
                    <Building2 className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5", isRtl ? "right-4" : "left-4")} />
                    <input 
                      type="text" 
                      required
                      value={businessName}
                      onChange={e => setBusinessName(e.target.value)}
                      placeholder={isRtl ? 'شركة الأمل' : 'Acme Corp'}
                      className={cn(
                        "w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all",
                        isRtl ? "pr-12 pl-4" : "pl-12 pr-4"
                      )}
                    />
                  </div>
                </div>
              </>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-700 ml-1">{isRtl ? 'البريد الإلكتروني' : 'Email Address'}</label>
              <div className="relative">
                <Mail className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5", isRtl ? "right-4" : "left-4")} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className={cn(
                    "w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all",
                    isRtl ? "pr-12 pl-4" : "pl-12 pr-4"
                  )}
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div className="space-y-2">
                <div className="flex justify-between items-center ml-1">
                  <label className="text-sm font-semibold text-slate-700">{isRtl ? 'كلمة المرور' : 'Password'}</label>
                  {mode === 'login' && (
                    <button 
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-xs text-indigo-600 hover:underline font-medium"
                    >
                      {isRtl ? 'نسيت كلمة المرور؟' : 'Forgot Password?'}
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5", isRtl ? "right-4" : "left-4")} />
                  <input 
                    type="password" 
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className={cn(
                      "w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all",
                      isRtl ? "pr-12 pl-4" : "pl-12 pr-4"
                    )}
                  />
                </div>
              </div>
            )}

            {mode === 'forgot' && (
              <div className="space-y-2">
                <label className="text-sm font-semibold text-slate-700 ml-1">{isRtl ? 'كلمة المرور الجديدة' : 'New Password'}</label>
                <div className="relative">
                  <Lock className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 w-5 h-5", isRtl ? "right-4" : "left-4")} />
                  <input 
                    type="password" 
                    required
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className={cn(
                      "w-full py-3 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-600 outline-none transition-all",
                      isRtl ? "pr-12 pl-4" : "pl-12 pr-4"
                    )}
                  />
                </div>
              </div>
            )}

            <button 
              type="submit" 
              disabled={isLoading}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bold py-3.5 rounded-xl shadow-lg shadow-indigo-100 transition-all flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {isLoading ? (isRtl ? 'جاري المعالجة...' : 'Processing...') : (mode === 'register' ? (isRtl ? 'إنشاء حساب' : 'Create Account') : mode === 'forgot' ? (isRtl ? 'إعادة تعيين' : 'Reset Password') : (isRtl ? 'تسجيل الدخول' : 'Sign In'))}
              {!isLoading && <ArrowRight className={cn("w-5 h-5 transition-transform", isRtl ? "rotate-180 group-hover:-translate-x-1" : "group-hover:translate-x-1")} />}
            </button>

            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-slate-200"></div>
              </div>
              <div className="relative flex justify-center text-xs uppercase">
                <span className="bg-white px-2 text-slate-500">{isRtl ? 'أو' : 'Or'}</span>
              </div>
            </div>

            <button 
              type="button"
              onClick={handleGoogleLogin}
              className="w-full bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 font-bold py-3.5 rounded-xl transition-all flex items-center justify-center gap-3"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24">
                <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
                <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
                <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.27.81-.57z" fill="#FBBC05"/>
                <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
              </svg>
              {isRtl ? 'تسجيل الدخول بواسطة جوجل' : 'Sign in with Google'}
            </button>
          </form>

          <div className="mt-8 text-center space-y-3">
            <button 
              onClick={() => setMode(mode === 'register' ? 'login' : 'register')}
              className="block w-full text-slate-900 font-semibold hover:underline transition-colors"
            >
              {mode === 'register' ? (isRtl ? 'لديك حساب بالفعل؟ سجل دخولك' : 'Already have an account? Sign in') : (isRtl ? 'ليس لديك حساب؟ سجل عملك' : "Don't have an account? Register your business")}
            </button>
            {mode === 'forgot' && (
              <button 
                onClick={() => setMode('login')}
                className="block w-full text-slate-500 text-sm hover:text-slate-700 transition-colors"
              >
                {isRtl ? 'العودة لتسجيل الدخول' : 'Back to Login'}
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
