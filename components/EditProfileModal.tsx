
import React, { useState } from 'react';
import { X, Check, Camera } from 'lucide-react';
import { CompanionProfile } from '../types';

interface EditProfileModalProps {
  profile: CompanionProfile;
  isOpen: boolean;
  onClose: () => void;
  onSave: (updatedProfile: CompanionProfile) => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ profile, isOpen, onClose, onSave }) => {
  const [editedProfile, setEditedProfile] = useState<CompanionProfile>({ ...profile });

  if (!isOpen) return null;

  const handleSave = () => {
    onSave(editedProfile);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 animate-in fade-in duration-200">
      <div className="bg-white w-full max-w-md h-full md:h-auto md:max-h-[90vh] md:rounded-xl flex flex-col overflow-hidden shadow-2xl animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
          <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <X className="w-6 h-6 text-gray-800" />
          </button>
          <h1 className="text-base font-bold">Edit profile</h1>
          <button onClick={handleSave} className="p-1 hover:bg-gray-100 rounded-full transition-colors">
            <Check className="w-6 h-6 text-blue-500" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          <div className="flex flex-col items-center gap-2">
            <div className="relative group cursor-pointer">
              <img 
                src={editedProfile.avatar} 
                alt="Profile" 
                className="w-24 h-24 rounded-full object-cover border border-gray-200 shadow-sm"
              />
              <div className="absolute inset-0 bg-black bg-opacity-20 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
            <button className="text-blue-500 text-sm font-semibold hover:text-blue-700">
              Change profile photo
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-500 px-1">Name</label>
              <input 
                type="text" 
                value={editedProfile.name}
                onChange={(e) => setEditedProfile({ ...editedProfile, name: e.target.value })}
                className="w-full px-1 py-2 border-b border-gray-200 focus:border-blue-500 outline-none transition-colors text-[15px]"
                placeholder="GF ka name..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-500 px-1">Username</label>
              <input 
                type="text" 
                value={editedProfile.username}
                onChange={(e) => setEditedProfile({ ...editedProfile, username: e.target.value })}
                className="w-full px-1 py-2 border-b border-gray-200 focus:border-blue-500 outline-none transition-colors text-[15px]"
                placeholder="Username..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-500 px-1">Bio</label>
              <textarea 
                value={editedProfile.bio}
                onChange={(e) => setEditedProfile({ ...editedProfile, bio: e.target.value })}
                className="w-full px-1 py-2 border-b border-gray-200 focus:border-blue-500 outline-none transition-colors text-[15px] resize-none"
                rows={3}
                placeholder="GF ki bio..."
              />
            </div>

            <div className="space-y-1">
              <label className="text-[12px] font-medium text-gray-500 px-1">Avatar URL</label>
              <input 
                type="text" 
                value={editedProfile.avatar}
                onChange={(e) => setEditedProfile({ ...editedProfile, avatar: e.target.value })}
                className="w-full px-1 py-2 border-b border-gray-200 focus:border-blue-500 outline-none transition-colors text-[15px]"
                placeholder="Photo link..."
              />
              <p className="text-[10px] text-gray-400 px-1 mt-1">Provide a direct link to an image (e.g., from Unsplash or Pinterest)</p>
            </div>
          </div>
        </div>

        <div className="p-4 bg-gray-50 border-t border-gray-100 flex justify-center">
          <button 
            onClick={handleSave}
            className="w-full bg-[#3797f0] text-white py-2.5 rounded-lg font-bold text-sm hover:bg-blue-600 transition-colors shadow-sm"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;
