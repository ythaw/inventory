import { useState } from 'react';
import { Link } from 'react-router-dom';
import AuthLayout from '../components/AuthLayout.jsx';
import TextInput from '../components/TextInput.jsx';
import { api } from '../api.js';

export default function RequestReset() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [resetLink, setResetLink] = useState('');
  const [resetToken, setResetToken] = useState('');

  const onSubmit = async (e) => {
    e.preventDefault();
    setMessage('');
    setResetLink('');
    setResetToken('');
    setLoading(true);
    try {
      const res = await api.requestReset({ email });
      setMessage(res.message || 'If the email exists, a reset link has been sent to your email address.');
      
      // If email service is not configured, show the reset link
      if (res.resetLink) {
        setResetLink(res.resetLink);
        setResetToken(res.resetToken);
      }
    } catch (err) {
      setMessage(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex items-center justify-center">
    <div className="flex flex-col bg-purple-100 rounded-3xl border border-purple-medium/30 p-6 w-full max-w-xl mx-auto mt-16 py-1">      
      <AuthLayout title="Reset password" subtitle="Enter your email to receive a reset link">
        <form onSubmit={onSubmit} className="space-y-4">
          <TextInput 
            classname="rounded-full" 
            label="Email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            placeholder="Enter your email" 
            required
          />
          <button className="btn-primary !rounded-full w-full text-base" disabled={loading}>
            {loading ? 'Sending…' : 'Send reset link'}
          </button>
          <div className="text-sm text-center pt-3">
            <span className="text-gray-500">Remembered it? </span>
            <Link to="/login" className="link">Sign in</Link>
          </div>
          {message && (
            <div className={`text-sm text-center p-3 rounded-xl ${
              message.includes('sent') || message.includes('email') 
                ? 'bg-green-50 text-green-700' 
                : message.includes('error') || message.includes('Error') || message.includes('Failed')
                ? 'bg-red-50 text-red-700'
                : 'bg-blue-50 text-blue-700'
            }`}>
              {message}
              {message.includes('sent') && (
                <div className="mt-2 text-xs">
                  <p>Check your email inbox and click the reset link.</p>
                  <p className="mt-1">Didn't receive it? Check your spam folder.</p>
                </div>
              )}
            </div>
          )}

          {/* Show reset link if email service is not configured */}
          {resetLink && (
            <div className="mt-4 p-4 bg-purple-soft rounded-xl border border-purple-medium/30">
              <div className="text-xs text-purple-darker font-medium mb-2">Reset Link (click to open):</div>
              <a 
                href={resetLink} 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-sm text-purple-dark font-mono break-all bg-white p-2 rounded-lg block hover:underline"
              >
                {resetLink}
              </a>
              <div className="mt-3 pt-3 border-t border-purple-medium/30">
                <p className="text-xs text-purple-darker mb-2">Or manually enter token:</p>
                <div className="text-xs text-purple-dark font-mono select-all break-all bg-white p-2 rounded-lg">
                  {resetToken}
                </div>
                <p className="text-xs text-gray-600 mt-2">
                  Go to <Link to="/reset-password" className="text-purple-darker underline">Reset Password</Link> page and enter this token.
                </p>
              </div>
            </div>
          )}
        </form>  
        </AuthLayout>
      </div>
    </div>
  );
}


