import { useState, useEffect } from 'react';
import { Fingerprint, Plus, Trash2, ShieldCheck, Laptop, Smartphone, Key } from 'lucide-react';
import {
  registerPasskey,
  fetchUserPasskeys,
  deleteUserPasskey,
  isPasskeySupported,
} from '../services/passkeyClient';

export default function PasskeySettings() {
  const [passkeys, setPasskeys] = useState([]);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [deviceName, setDeviceName] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const supported = isPasskeySupported();

  useEffect(() => {
    loadPasskeys();
  }, []);

  const loadPasskeys = async () => {
    setLoading(true);
    try {
      const keys = await fetchUserPasskeys();
      setPasskeys(keys);
    } catch {
      // Ignore or set empty
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setRegistering(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const defaultName = deviceName.trim() || (/iPhone|iPad|Macintosh/.test(navigator.userAgent) ? 'Apple Device' : /Windows/.test(navigator.userAgent) ? 'Windows Hello Device' : /Android/.test(navigator.userAgent) ? 'Android Biometric' : 'Security Key');
      await registerPasskey(defaultName);
      setSuccessMessage('Passkey registered successfully! You can now use Face ID, Touch ID, or Windows Hello to sign in.');
      setShowAddModal(false);
      setDeviceName('');
      await loadPasskeys();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to register passkey.');
    } finally {
      setRegistering(false);
    }
  };

  const handleDelete = async (passkeyId) => {
    if (!window.confirm('Are you sure you want to revoke this passkey?')) return;
    try {
      await deleteUserPasskey(passkeyId);
      setSuccessMessage('Passkey revoked.');
      setPasskeys((prev) => prev.filter((p) => p.id !== passkeyId));
    } catch (err) {
      setErrorMessage(err.message || 'Failed to revoke passkey.');
    }
  };

  const getDeviceIcon = (name = '') => {
    const lower = name.toLowerCase();
    if (lower.includes('phone') || lower.includes('android') || lower.includes('iphone')) {
      return <Smartphone className="w-4 h-4 text-[#AD8B73] dark:text-[#E1DCC9]" />;
    }
    if (lower.includes('mac') || lower.includes('windows') || lower.includes('laptop') || lower.includes('pc')) {
      return <Laptop className="w-4 h-4 text-[#AD8B73] dark:text-[#E1DCC9]" />;
    }
    return <Key className="w-4 h-4 text-[#AD8B73] dark:text-[#E1DCC9]" />;
  };

  return (
    <div className="bg-[#FFFBE9] dark:bg-[#16120E] border border-[#CEAB93]/60 dark:border-[#412D15] rounded-2xl p-6 shadow-sm max-w-2xl mx-auto text-[#1F150C] dark:text-[#E1DCC9] mt-6">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-[#AD8B73]/20 text-[#AD8B73] dark:text-[#E1DCC9]">
            <Fingerprint className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold font-playfair">Passkeys (FIDO2 / WebAuthn)</h2>
            <p className="text-xs text-[#8C6A53] dark:text-[#C4BA9D]">
              Sign in securely with biometric recognition (Touch ID, Face ID, Windows Hello) or security keys.
            </p>
          </div>
        </div>

        {supported && (
          <button
            onClick={() => setShowAddModal(true)}
            className="px-3 py-1.5 rounded-xl btn-primary-theme font-bold text-xs shadow flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            Add Passkey
          </button>
        )}
      </div>

      {!supported && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs text-amber-800 dark:text-amber-300 font-medium mb-4">
          WebAuthn passkeys are not supported in your current browser. Please try Chrome, Safari, Edge, or Firefox.
        </div>
      )}

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

      {/* Add Passkey Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="bg-[#FFFBE9] dark:bg-[#1E1915] border border-[#CEAB93] dark:border-[#412D15] rounded-2xl p-6 max-w-md w-full shadow-2xl">
            <h3 className="text-base font-bold font-playfair mb-2">Register a New Passkey</h3>
            <p className="text-xs text-[#8C6A53] dark:text-[#C4BA9D] mb-4">
              Enter a name for this device, then follow your browser's prompt to scan your fingerprint, face, or security key.
            </p>

            <form onSubmit={handleRegister} className="space-y-4">
              <div>
                <label className="block text-xs font-bold mb-1">Device Name</label>
                <input
                  type="text"
                  value={deviceName}
                  onChange={(e) => setDeviceName(e.target.value)}
                  placeholder="e.g. MacBook Pro Touch ID, Personal iPhone"
                  className="w-full px-3 py-2 bg-[#FFFBE9] dark:bg-[#251D17] border border-[#CEAB93] dark:border-[#412D15] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#AD8B73]"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  disabled={registering}
                  className="px-3 py-2 rounded-xl text-xs font-semibold bg-gray-200 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-700 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={registering}
                  className="px-4 py-2 rounded-xl btn-primary-theme font-bold text-xs shadow cursor-pointer flex items-center gap-2"
                >
                  {registering ? (
                    <>
                      <span className="w-3.5 h-3.5 border-2 border-current border-t-transparent rounded-full animate-spin" />
                      Prompting Biometrics...
                    </>
                  ) : (
                    'Continue with Biometrics'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Passkey list */}
      <div className="space-y-2 mt-4">
        {loading ? (
          <div className="text-center py-4 text-xs text-[#8C6A53]">Loading registered passkeys...</div>
        ) : passkeys.length === 0 ? (
          <div className="text-center py-6 border border-dashed border-[#CEAB93]/60 dark:border-[#412D15] rounded-xl text-xs text-[#8C6A53] dark:text-[#C4BA9D]">
            No passkeys registered yet. Add one to enable one-tap passwordless sign in.
          </div>
        ) : (
          passkeys.map((pk) => (
            <div
              key={pk.id}
              className="flex items-center justify-between p-3.5 bg-[#FFFBE9] dark:bg-[#251D17] border border-[#CEAB93]/40 dark:border-[#412D15] rounded-xl text-xs"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-black/5 dark:bg-white/5">
                  {getDeviceIcon(pk.deviceName)}
                </div>
                <div>
                  <div className="font-bold">{pk.deviceName || 'Passkey Device'}</div>
                  <div className="text-[11px] text-[#8C6A53] dark:text-[#C4BA9D]">
                    Created: {new Date(pk.createdAt).toLocaleDateString()}
                    {pk.lastUsedAt && ` • Last used: ${new Date(pk.lastUsedAt).toLocaleDateString()}`}
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleDelete(pk.id)}
                className="p-1.5 text-red-500 hover:bg-red-500/10 rounded-lg transition cursor-pointer"
                title="Revoke Passkey"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
