import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import TextInput from '../components/TextInput.jsx';
import { api } from '../api.js';

export default function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [token, setToken] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    // Get token and email from URL if present
    const urlToken = searchParams.get('token');
    const urlEmail = searchParams.get('email');
    if (urlToken) setToken(urlToken);
    if (urlEmail) setEmail(decodeURIComponent(urlEmail));
  }, [searchParams]);

  const onSubmit = async (e) => {
    e.preventDefault();
    if (!email || !token || !newPassword) {
      setMessage('Email, token, and new password are required');
      return;
    }
    setMessage('');
    setLoading(true);
    try {
      const res = await api.resetPassword({ email, token, newPassword });
      setMessage(res.message || 'Password updated successfully!');
      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
      <div className="flex flex-col bg-purple-100 rounded-3xl border border-purple-medium/30 p-6 w-full max-w-xl mx-auto mt-16 py-1">
        <AuthLayout 
          title="Set new password" 
          subtitle={token ? "Enter your new password" : "Use the link from your email to reset your password"}
        >
          <form onSubmit={onSubmit} className="space-y-4">
            {!token && (
              <div className="mb-4 p-3 bg-blue-50 rounded-xl border border-blue-200">
                <p className="text-sm text-blue-700 text-center">
                  If you received a password reset email, click the link in the email to access this page with your reset token.
                </p>
              </div>
            )}
            <TextInput 
              classname="rounded-full"
              label="Email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              placeholder="Enter your email"
              required
            />
            {!token && (
              <TextInput 
                classname="rounded-full"
                label="Reset token" 
                value={token} 
                onChange={(e) => setToken(e.target.value)} 
                placeholder="Enter reset token from email" 
              />
            )}
            {token && (
              <div className="mb-2 p-3 bg-green-50 rounded-xl border border-green-200">
                <p className="text-xs text-green-700 text-center">
                  ✓ Reset token found. Please enter your new password below.
                </p>
              </div>
            )}
            <TextInput 
              classname="rounded-full"
              label="New password" 
              type="password" 
              value={newPassword} 
              onChange={(e) => setNewPassword(e.target.value)} 
              placeholder="Create a strong password"
              required
            />
            <button className="btn-primary !rounded-full w-full text-base" disabled={loading}>
              {loading ? 'Updating…' : 'Update password'}
            </button>
            <div className="text-sm text-center pt-3">
              <span className="text-gray-500">Back to </span>
              <Link to="/login" className="link">Sign in</Link>
            </div>
            {message && (
              <div className={`text-sm text-center p-3 rounded-xl ${message.includes('updated') || message.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {message}
              </div>
            )}
          </form>
        </AuthLayout>
      </div>
    </div>
  );
}


