import React, { useState } from 'react';
import axios from 'axios';
import { 
  Users, UserCheck, Shield, Trash2, 
  Settings, AlertTriangle, ShieldCheck
} from 'lucide-react';

const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5001',
  headers: {
    Authorization: `Bearer ${localStorage.getItem('token')}`,
  },
});

// Permission bit masks matching backend/middleware/squadAuth.js
const PERMISSIONS = {
  CAN_EDIT_DECKS: 1 << 0,
  CAN_DELETE_NOTES: 1 << 1,
  CAN_INVITE_MEMBERS: 1 << 2,
  CAN_BAN_MEMBERS: 1 << 3,
  CAN_VIEW_AUDIT_LOGS: 1 << 4,
};

export default function SquadMemberManagement({ squadId, members = [], currentUserRole, onRefresh }) {
  const [loadingUserId, setLoadingUserId] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Ban/Kick Confirmation dialog state
  const [confirmKickUser, setConfirmKickUser] = useState(null);

  const canManage = currentUserRole === 'owner' || currentUserRole === 'admin';

  const handleRoleChange = async (userId, newRole) => {
    setLoadingUserId(userId);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.put(`/api/squads/${squadId}/members/${userId}/role`, {
        role: newRole,
      });
      setSuccessMsg(`Member role updated to ${newRole}`);
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to update member role');
    } finally {
      setLoadingUserId(null);
    }
  };

  const handleKickMember = async () => {
    if (!confirmKickUser) return;

    setLoadingUserId(confirmKickUser.id);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      await api.delete(`/api/squads/${squadId}/members/${confirmKickUser.id}`);
      setSuccessMsg(`Member ${confirmKickUser.name} kicked successfully.`);
      setConfirmKickUser(null);
      if (onRefresh) onRefresh();
    } catch (err) {
      setErrorMsg(err.response?.data?.error || 'Failed to kick member');
    } finally {
      setLoadingUserId(null);
    }
  };

  const checkHasBit = (bitmask, key) => {
    const bit = PERMISSIONS[key];
    return (bitmask & bit) === bit;
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl text-left space-y-6 w-full">
      <div className="flex items-center justify-between border-b border-slate-850 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Squad Member Management</h2>
            <p className="text-xs text-slate-400 mt-0.5">Manage roles, squad privileges, and access logs.</p>
          </div>
        </div>

        <span className="text-[10px] uppercase font-extrabold px-2.5 py-1 rounded bg-slate-950 border border-slate-800 text-slate-350">
          Your Role: <strong className="text-amber-400">{currentUserRole}</strong>
        </span>
      </div>

      {successMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 p-4 rounded-xl text-xs font-semibold">
          {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl text-xs font-semibold">
          {errorMsg}
        </div>
      )}

      {/* Member Management Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-slate-200 text-xs">
          <thead>
            <tr className="border-b border-slate-800 text-slate-450 uppercase font-bold text-[10px]">
              <th className="pb-3 text-left">Member</th>
              <th className="pb-3 text-left">Role</th>
              <th className="pb-3 text-left">Privileges</th>
              {canManage && <th className="pb-3 text-right">Actions</th>}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-850">
            {members.map((member) => {
              const u = member.userRef || {};
              const isSelf = u.id === localStorage.getItem('userId');
              
              // Determine if current user can edit this specific member
              const isTargetOwnerOrAdmin = member.role === 'owner' || member.role === 'admin';
              const canEditThisMember = canManage && !isSelf && (currentUserRole === 'owner' || !isTargetOwnerOrAdmin);

              return (
                <tr key={member.id} className="hover:bg-slate-950/20 transition-all">
                  {/* Member Profile info */}
                  <td className="py-4">
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-full bg-slate-800 border border-slate-700 flex items-center justify-center font-bold text-slate-300">
                        {u.avatar ? (
                          <img src={u.avatar} alt="" className="w-full h-full rounded-full object-cover" />
                        ) : (
                          u.name?.slice(0, 2).toUpperCase()
                        )}
                      </div>
                      <div>
                        <div className="font-semibold text-slate-100 flex items-center gap-1.5">
                          {u.name}
                          {isSelf && <span className="text-[9px] bg-indigo-500/10 text-indigo-400 px-1.5 py-0.5 rounded font-bold uppercase">You</span>}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Role Dropdown */}
                  <td className="py-4">
                    {canEditThisMember ? (
                      <select
                        value={member.role}
                        onChange={(e) => handleRoleChange(u.id, e.target.value)}
                        disabled={loadingUserId === u.id}
                        className="bg-slate-950 border border-slate-800 text-slate-100 px-2 py-1.5 rounded-lg text-xs outline-none cursor-pointer focus:border-indigo-500"
                      >
                        {currentUserRole === 'owner' && <option value="owner">Owner</option>}
                        <option value="admin">Admin</option>
                        <option value="moderator">Moderator</option>
                        <option value="contributor">Contributor</option>
                        <option value="viewer">Viewer</option>
                      </select>
                    ) : (
                      <span className="capitalize font-bold text-slate-350 bg-slate-950/50 px-2 py-1 rounded-md border border-slate-850">
                        {member.role}
                      </span>
                    )}
                  </td>

                  {/* Permission Bitmask details */}
                  <td className="py-4 font-sans text-[10px]">
                    <div className="flex flex-wrap gap-1">
                      {checkHasBit(member.permissions, 'CAN_EDIT_DECKS') && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Decks</span>
                      )}
                      {checkHasBit(member.permissions, 'CAN_DELETE_NOTES') && (
                        <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">Notes Delete</span>
                      )}
                      {checkHasBit(member.permissions, 'CAN_INVITE_MEMBERS') && (
                        <span className="px-2 py-0.5 rounded bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">Invite</span>
                      )}
                      {checkHasBit(member.permissions, 'CAN_BAN_MEMBERS') && (
                        <span className="px-2 py-0.5 rounded bg-red-500/10 border border-red-500/20 text-red-400">Ban</span>
                      )}
                      {checkHasBit(member.permissions, 'CAN_VIEW_AUDIT_LOGS') && (
                        <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-400">Auditor</span>
                      )}
                      {member.permissions === 0 && (
                        <span className="text-slate-500 italic">No administrative rights</span>
                      )}
                    </div>
                  </td>

                  {/* Kick Action Button */}
                  {canManage && (
                    <td className="py-4 text-right">
                      {canEditThisMember && (
                        <button
                          onClick={() => setConfirmKickUser({ id: u.id, name: u.name })}
                          disabled={loadingUserId === u.id}
                          className="p-2 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 text-slate-500 hover:text-red-400 rounded-xl transition cursor-pointer"
                          title="Kick Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </td>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Kick/Ban confirmation Modal Dialog */}
      {confirmKickUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 w-full max-w-sm text-left space-y-4 shadow-2xl">
            <div className="flex items-center gap-2.5 text-red-400">
              <AlertTriangle className="w-5 h-5" />
              <h3 className="text-md font-extrabold">Confirm Member Removal</h3>
            </div>

            <p className="text-xs text-slate-350 leading-relaxed">
              Are you sure you want to kick <strong>{confirmKickUser.name}</strong> from the study squad? They will need to rejoin using the invite code.
            </p>

            <div className="flex items-center gap-3 pt-3 border-t border-slate-850">
              <button
                onClick={handleKickMember}
                className="px-5 py-2.5 bg-red-600 hover:bg-red-500 text-white font-bold text-xs rounded-xl shadow-lg transition cursor-pointer"
              >
                Confirm Kick
              </button>
              <button
                onClick={() => setConfirmKickUser(null)}
                className="px-5 py-2.5 bg-slate-850 hover:bg-slate-800 text-slate-300 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
