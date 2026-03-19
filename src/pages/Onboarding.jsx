import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LogIn, Lock, Mail, Terminal, RotateCcw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/Button';
import { Card, CardContent } from '../components/ui/Card';

export default function Onboarding() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showReset, setShowReset] = useState(false);
  const [resetSent, setResetSent] = useState(false);
  const { login, resetPassword } = useAuth();
  const navigate = useNavigate();

  const getErrorMessage = (code) => {
    switch (code) {
      case 'auth/user-not-found':
      case 'auth/wrong-password':
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please try again.';
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/too-many-requests':
        return 'Too many failed attempts. Account temporarily locked. Reset your password to regain access.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Contact the administrator.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your connection and try again.';
      default:
        return 'Authentication failed. Please try again.';
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await login(email, password);
      navigate('/');
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    if (!email) {
      setError('Please enter your email address above to reset your password.');
      return;
    }
    setIsLoading(true);
    setError('');
    try {
      await resetPassword(email);
      setResetSent(true);
    } catch (err) {
      setError(getErrorMessage(err.code));
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0a0c10] flex items-center justify-center p-4 relative overflow-hidden">
      {/* Background Decorative Elements */}
      <div className="absolute top-[-10%] left-[-5%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
      <div className="absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] bg-blue-600/10 rounded-full blur-[120px]" />
      
      <div className="w-full max-w-[1000px] grid grid-cols-1 lg:grid-cols-2 gap-8 items-center relative z-10">
        
        {/* Left Side: Branding & Animation */}
        <div className="flex flex-col space-y-6 text-left">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-medium mb-6">
              <Terminal className="w-3 h-3" />
              <span>v2.4.0 Operations System</span>
            </div>
            
            <h1 className="text-5xl lg:text-7xl font-bold text-white leading-tight">
              Win <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-400">
                Express
              </span>
            </h1>
            
            <motion.p 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4, duration: 1 }}
              className="mt-6 text-gray-400 text-lg max-w-md leading-relaxed"
            >
              Streamline your delivery operations with real-time tracking, rider performance analytics, and automated financial reporting.
            </motion.p>
          </motion.div>

          <div className="grid grid-cols-3 gap-4 border-t border-white/5 pt-8 mt-4">
            {[
              { label: 'Real-time', value: 'Sync' },
              { label: 'Cloud', value: 'Auto' },
              { label: 'Secure', value: 'AES' },
            ].map((stat, i) => (
              <motion.div
                key={stat.label}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 + i * 0.1 }}
                className="flex flex-col"
              >
                <span className="text-xs text-gray-500 uppercase tracking-widest">{stat.label}</span>
                <span className="text-white font-semibold">{stat.value}</span>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Right Side: Login Form */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
        >
          <Card className="border-white/10 bg-white/5 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary to-blue-500 opacity-50" />
            
            <CardContent className="p-8 lg:p-12">
              <div className="mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Login to Dashboard</h2>
                <p className="text-gray-400 text-sm">Enter your credentials to continue.</p>
              </div>

              <form onSubmit={handleLogin} className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">Email</label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="text-xs font-medium text-gray-400 uppercase tracking-wider px-1">Password</label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder:text-gray-600 focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all"
                        required
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence>
                  {error && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-rose-400 text-sm bg-rose-400/10 p-3 rounded-lg border border-rose-400/20"
                    >
                      {error}
                    </motion.p>
                  )}
                  {resetSent && (
                    <motion.p
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      exit={{ opacity: 0, height: 0 }}
                      className="text-green-400 text-sm bg-green-400/10 p-3 rounded-lg border border-green-400/20"
                    >
                      Password reset email sent! Check your inbox.
                    </motion.p>
                  )}
                </AnimatePresence>

                <Button 
                  type="submit" 
                  className="w-full py-6 rounded-xl text-lg font-bold shadow-lg shadow-primary/20 hover:scale-[1.02] active:scale-[0.98] transition-transform"
                  disabled={isLoading}
                >
                  {isLoading ? (
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                      <Terminal className="w-5 h-5" />
                    </motion.div>
                  ) : (
                    <span className="flex items-center justify-center">
                      Authorize Access <LogIn className="ml-2 w-5 h-5" />
                    </span>
                  )}
                </Button>

                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handlePasswordReset}
                    disabled={isLoading}
                    className="text-xs text-gray-500 hover:text-primary transition-colors inline-flex items-center gap-1"
                  >
                    <RotateCcw className="w-3 h-3" />
                    Forgot password? Send reset link
                  </button>
                </div>

                <div className="pt-2 text-center">
                  <p className="text-xs text-gray-500">
                    Proprietary Software. Unauthorized access is strictly prohibited.
                  </p>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Decorative Grid */}
      <div className="absolute inset-0 z-0 opacity-[0.03] pointer-events-none" 
           style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
    </div>
  );
}
