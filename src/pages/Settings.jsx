import { useState } from 'react';
import { auth } from '../lib/firebase';
import { updateProfile, updatePassword } from 'firebase/auth';
import { User, Lock, Save, Moon } from 'lucide-react';

export default function Settings() {
  const [displayName, setDisplayName] = useState(auth.currentUser?.displayName || '');
  const [newPassword, setNewPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ type: '', text: '' });
    
    try {
      if (auth.currentUser && displayName !== auth.currentUser.displayName) {
        await updateProfile(auth.currentUser, { displayName });
      }
      
      if (newPassword) {
        await updatePassword(auth.currentUser, newPassword);
        setNewPassword('');
      }
      
      setMessage({ type: 'success', text: 'Profile updated successfully!' });
    } catch (error) {
      console.error(error);
      setMessage({ type: 'error', text: 'Failed to update profile. ' + error.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-500">Manage your account and preferences.</p>
      </div>

      {message.text && (
        <div className={`p-4 rounded-xl text-sm ${message.type === 'success' ? 'bg-[#d3f9d8] text-[#2b8a3e]' : 'bg-error-container text-error'}`}>
          {message.text}
        </div>
      )}

      <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
        <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
          <User className="h-6 w-6 text-primary" /> Profile Settings
        </h3>
        
        <form onSubmit={handleUpdateProfile} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="Your Name"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">Email Address</label>
            <input
              type="email"
              disabled
              value={auth.currentUser?.email || ''}
              className="w-full px-3 py-2 border border-gray-200 rounded-xl bg-gray-50 text-gray-500 cursor-not-allowed opacity-70"
            />
            <p className="text-xs text-gray-500 mt-1">Email cannot be changed directly here.</p>
          </div>

          <div className="pt-4 border-t border-gray-100">
            <h4 className="text-sm font-bold text-gray-900 mb-4 flex items-center gap-2">
              <Lock className="h-4 w-4 text-gray-500" /> Change Password
            </h4>
            <input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New Password (leave blank to keep current)"
              className="w-full px-3 py-2 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary bg-gray-50 text-gray-900"
            />
          </div>

          <div className="flex justify-end pt-4">
            <button
              type="submit"
              disabled={loading}
              className="flex items-center px-6 py-2 bg-primary text-white rounded-xl shadow-[0_2px_10px_rgba(0,0,0,0.03)] hover:bg-gray-50-tint transition-colors disabled:opacity-50"
            >
              <Save className="h-4 w-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
      
      <div className="bg-white border border-gray-100 p-6 rounded-2xl shadow-[0_2px_10px_rgba(0,0,0,0.03)]">
         <h3 className="text-xl font-bold text-gray-900 mb-4 flex items-center gap-2">
          <Moon className="h-6 w-6 text-primary" /> Appearance
        </h3>
        <p className="text-gray-500">
          Floosy automatically adapts to your system's light or dark mode setting. 
          To change the theme, update your device or browser's appearance settings.
        </p>
      </div>
    </div>
  );
}
