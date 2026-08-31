import { useState } from 'react';
import { ShieldCheck, Copy, Check, AlertTriangle, KeyRound } from 'lucide-react';
import PasskeySettings from './PasskeySettings';

export default function SecuritySettings() {
  const [loading, setLoading] = useState(false);
  const [setupData, setSetupData] = useState(null);
  const [verificationToken, setVerificationToken] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [copied, setCopied] = useState(false);

  const getApiBaseUrl = () => {
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
      return `${window.location.origin}/api`;
    }
    return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
  };

  const handleStartSetup = async () => {
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/auth/2fa/setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSetupData(data);
      } else {
        setErrorMessage(data.error || 'Failed to initiate 2FA setup.');
      }
    } catch (err) {
      setErrorMessage('Network error while setting up 2FA.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifySetup = async (e) => {
    e.preventDefault();
    setLoading(true);
    setErrorMessage('');
    setSuccessMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${getApiBaseUrl()}/auth/2fa/verify-setup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ token: verificationToken })
      });
      const data = await response.json();
      if (response.ok && data.success) {
        setSuccessMessage('Two-factor authentication successfully enabled!');
        setSetupData(null);
      } else {
        setErrorMessage(data.error || 'Invalid verification code.');
      }
    } catch (err) {
      setErrorMessage('Verification failed.');
    } finally {
      setLoading(false);
    }
  };

  const copyBackupCodes = () => {
    if (setupData?.backupCodes) {
      navigator.clipboard.writeText(setupData.backupCodes.join('\n'));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="bg-[#FFFBE9] dark:bg-[#16120E] border border-[#CEAB93]/60 dark:border-[#412D15] rounded-2xl p-6 shadow-sm max-w-2xl mx-auto text-[#1F150C] dark:text-[#E1DCC9]">
      <div className="flex items-center gap-3 mb-4">
        <div className="p-2.5 rounded-xl bg-[#AD8B73]/20 text-[#AD8B73] dark:text-[#E1DCC9]">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div>
          <h2 className="text-lg font-bold font-playfair">Two-Factor Authentication (2FA)</h2>
          <p className="text-xs text-[#8C6A53] dark:text-[#C4BA9D]">Protect your account using an authenticator app (Google Authenticator, Authy).</p>
        </div>
      </div>

      {successMessage && (
        <div className="mb-4 p-3 bg-green-500/10 border border-green-500/30 rounded-xl text-xs text-green-700 dark:text-green-300 font-medium">
          {successMessage}
        </div>
      )}

      {errorMessage && (
        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/30 rounded-xl text-xs text-red-700 dark:text-red-300 font-medium">
          {errorMessage}
        </div>
      )}

      {!setupData ? (
        <button
          onClick={handleStartSetup}
          disabled={loading}
          className="px-4 py-2.5 rounded-xl btn-primary-theme font-bold text-xs shadow transition cursor-pointer"
        >
          {loading ? 'Generating...' : 'Enable Two-Factor Authentication'}
        </button>
      ) : (
        <div className="space-y-6 mt-4 pt-4 border-t border-[#CEAB93]/40 dark:border-[#412D15]">
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider mb-2 text-[#8C6A53] dark:text-[#C4BA9D]">Step 1: Scan QR Code</h3>
            <p className="text-xs mb-3">Scan this QR code with your authenticator app, or manually enter secret key: <code className="bg-muted px-1.5 py-0.5 rounded text-[11px] font-mono">{setupData.secret}</code></p>
            {setupData.qrCodeUrl && (
              <div className="bg-white p-3 inline-block rounded-xl border border-[#CEAB93]/40 shadow-sm">
                <img src={setupData.qrCodeUrl} alt="2FA QR Code" className="w-40 h-40 object-contain" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C6A53] dark:text-[#C4BA9D]">Backup Recovery Codes</h3>
              <button
                onClick={copyBackupCodes}
                className="flex items-center gap-1.5 text-xs font-semibold text-[#AD8B73] dark:text-[#E1DCC9] hover:underline cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-green-600" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied!' : 'Copy Codes'}
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2 bg-[#FFFBE9] dark:bg-[#251D17] p-3 rounded-xl border border-[#CEAB93]/40 dark:border-[#412D15]">
              {setupData.backupCodes.map((code, idx) => (
                <code key={idx} className="font-mono text-xs tracking-wider py-1 px-2 bg-black/5 dark:bg-white/5 rounded">
                  {code}
                </code>
              ))}
            </div>
            <p className="text-[11px] text-[#8C6A53] dark:text-[#C4BA9D] mt-1.5 flex items-center gap-1">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-500" />
              Save these recovery codes in a secure place. They won't be shown again!
            </p>
          </div>

          <form onSubmit={handleVerifySetup} className="space-y-3 pt-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-[#8C6A53] dark:text-[#C4BA9D]">Step 2: Verify Code to Complete</h3>
            <div className="flex gap-2 max-w-sm">
              <input
                type="text"
                maxLength="6"
                value={verificationToken}
                onChange={(e) => setVerificationToken(e.target.value)}
                placeholder="Enter 6-digit code"
                required
                className="w-full px-3 py-2 bg-[#FFFBE9] dark:bg-[#251D17] border border-[#CEAB93] dark:border-[#412D15] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#AD8B73] font-mono tracking-widest"
              />
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 rounded-xl btn-primary-theme font-bold text-xs shrink-0 cursor-pointer shadow"
              >
                {loading ? 'Verifying...' : 'Confirm'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* WebAuthn Passkeys Section */}
      <PasskeySettings />
    </div>
  );
}
