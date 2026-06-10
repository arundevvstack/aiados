import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthService } from '../../services/authService';
import { Sparkles, ArrowRight, Loader } from 'lucide-react';

export default function Signup() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: ''
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const data = await AuthService.signUp(formData.email, formData.password, formData.fullName);
      if (data) {
        // Redirect to dashboard on success
        navigate('/dashboard');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050505] flex items-center justify-center p-4 relative overflow-hidden font-jakarta">
      {/* Cinematic Background Elements */}
      <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-[#CE1B22] opacity-10 blur-[120px] rounded-full mix-blend-screen animate-pulse"></div>
      <div className="absolute bottom-[-20%] right-[-10%] w-[60%] h-[60%] bg-[#1A1A1A] opacity-80 blur-[120px] rounded-full"></div>

      <div className="w-full max-w-md z-10">
        <div className="flex items-center justify-center gap-2 mb-8">
          <div className="w-10 h-10 bg-gradient-to-tr from-[#CE1B22] to-[#ff4d4d] rounded-xl flex items-center justify-center shadow-lg shadow-red-500/20">
            <Sparkles className="text-white w-5 h-5" />
          </div>
          <h1 className="text-3xl font-bold text-white font-syne tracking-tight">AdGravity OS</h1>
        </div>

        <div className="bg-[#121212]/80 backdrop-blur-xl border border-white/5 rounded-2xl p-8 shadow-2xl">
          <h2 className="text-2xl font-bold text-white mb-2 font-syne">Create Account</h2>
          <p className="text-gray-400 text-sm mb-6">Join the premier AI production operating system.</p>

          {error && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-sm">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Full Name</label>
              <input
                type="text"
                required
                value={formData.fullName}
                onChange={e => setFormData({...formData, fullName: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#CE1B22] focus:ring-1 focus:ring-[#CE1B22] transition-colors"
                placeholder="Christopher Nolan"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Email Address</label>
              <input
                type="email"
                required
                value={formData.email}
                onChange={e => setFormData({...formData, email: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#CE1B22] focus:ring-1 focus:ring-[#CE1B22] transition-colors"
                placeholder="chris@production.com"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">Password</label>
              <input
                type="password"
                required
                value={formData.password}
                onChange={e => setFormData({...formData, password: e.target.value})}
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder-gray-500 focus:outline-none focus:border-[#CE1B22] focus:ring-1 focus:ring-[#CE1B22] transition-colors"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-[#CE1B22] to-[#a8141b] text-white rounded-xl px-4 py-3 font-medium hover:shadow-lg hover:shadow-red-500/20 transition-all flex items-center justify-center gap-2 group disabled:opacity-50"
            >
              {loading ? (
                <Loader className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  <span>Initialize Workspace</span>
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="mt-6 text-center text-sm text-gray-400">
            Already have an account?{' '}
            <button onClick={() => navigate('/login')} className="text-white hover:text-[#CE1B22] transition-colors">
              Sign In
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}
