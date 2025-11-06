import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import TextInput from '../components/TextInput.jsx';
import { api } from '../api.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      const res = await api.login({ email, password });
      setMessage(`Welcome, ${res.user.companyName}`);
      localStorage.setItem('token', res.token);
      // Navigate to dashboard after successful login
      setTimeout(() => {
        window.location.href = '/dashboard';
      }, 1000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col bg-purple-100 rounded-3xl border border-purple-medium/30 w-full max-w-xl mx-auto mt-16">
        <AuthLayout title="Inventory Master" subtitle="Login to your account">

          <form onSubmit={onSubmit} className="space-y-4">
            <TextInput
              classname="rounded-full focus:outline-none focus:ring-2 focus:ring-purple-40"
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Enter your email"
              autoComplete="email"
            />
            <TextInput
              classname="rounded-full focus:outline-none focus:ring-2 focus:ring-purple-40"
              label="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <button className="btn-primary text-base !rounded-full w-full" disabled={loading}>
              {loading ? 'Signing in…' : 'Login'}
            </button>
            <div className="text-sm flex flex-col items-center gap-3 pt-3">
              <Link to="/request-reset" className="link text-gray-500">Forgot Password?</Link>
              <span className="text-gray-500">
                New here? <Link to="/signup" className="link">Create an account</Link>
              </span>
            </div>
            {message && (
              <div className={`text-sm text-center p-3 rounded-xl ${message.includes('Welcome') || message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message}
              </div>
            )}
          </form>

        </AuthLayout>
      </div>
    </div>
  );
}


