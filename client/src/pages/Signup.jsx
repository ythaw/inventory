import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import TextInput from '../components/TextInput.jsx';
import { api } from '../api.js';

export default function Signup() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setLoading(true);
    try {
      await api.signup({ companyName, email, password });
      setMessage('Account created. You can now sign in.');
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col bg-purple-100 rounded-3xl border border-purple-medium/30 p-6 w-full max-w-lg mx-auto mt-16 py-2">
        <AuthLayout title="Create account" subtitle="Start managing your inventory">
          <form onSubmit={onSubmit} className="space-y-4">
            <TextInput classname="rounded-full" label="Company name" value={companyName} onChange={(e) => setCompanyName(e.target.value)} placeholder="Enter your company name" autoComplete="organization" />
            <TextInput classname="rounded-full" label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Enter your email" autoComplete="email" />
            <TextInput classname="rounded-full" label="Password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Create a strong password" autoComplete="new-password" />
            <button className="btn-primary !rounded-full w-full text-base" disabled={loading}>
              {loading ? 'Creating…' : 'Create account'}
            </button>
            <div className="text-sm text-center pt-3">
              <span className="text-gray-500">Already have an account? </span>
              <Link to="/login" className="link">Sign in</Link>
            </div>
            {message && (
              <div className={`text-sm text-center p-3 rounded-xl ${message.includes('created') || message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message}
              </div>
            )}
          </form>
        </AuthLayout>
      </div>
    </div>
  );
}


