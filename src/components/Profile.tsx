import React, { useState, useEffect } from "react";
import { useAuthStore } from "../store";
import { UserCircle } from "lucide-react";

export default function Profile() {
  const { user, token, setAuth } = useAuthStore();
  const [bio, setBio] = useState("");
  const [avatar, setAvatar] = useState("");
  const [interests, setInterests] = useState("");

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const res = await fetch("/api/auth/me", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setBio(data.bio || "");
        setAvatar(data.avatar || "");
        setInterests(data.interests ? data.interests.join(", ") : "");
      }
    } catch(e) {}
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const interestsArray = interests.split(',').map(s => s.trim()).filter(s => s);
      const res = await fetch("/api/users/profile", {
         method: "PUT",
         headers: { 
           "Authorization": `Bearer ${token}`,
           "Content-Type": "application/json"
         },
         body: JSON.stringify({ bio, avatar, interests: interestsArray })
      });
      
      if (res.ok) {
         const data = await res.json();
         // Update user locally
         setAuth({ ...user!, avatar: data.avatar }, token!);
      }
    } catch(e) {}
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-2xl mx-auto w-full pb-24 md:pb-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 text-slate-100 pl-2 md:pl-0">My Profile</h1>
      
      <div className="bg-slate-800 rounded-3xl p-5 md:p-8 border border-slate-700 shadow-xl m-2 md:m-0">
        <div className="flex flex-col items-center mb-6 md:mb-8">
           {avatar ? (
             <img src={avatar} className="w-24 h-24 md:w-32 md:h-32 rounded-full object-cover shadow-lg border-4 border-slate-700" />
           ) : (
             <UserCircle className="w-24 h-24 md:w-32 md:h-32 text-slate-500 bg-slate-900 rounded-full" />
           )}
           <h2 className="text-xl md:text-2xl font-bold mt-4">{user?.username}</h2>
           <p className="text-sm md:text-base text-slate-400">{user?.email}</p>
        </div>

        <form onSubmit={handleUpdate} className="space-y-4 md:space-y-6">
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 md:mb-2">Avatar URL</label>
            <input 
              type="text" 
              value={avatar}
              onChange={e => setAvatar(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none focus:border-emerald-500 text-sm md:text-base"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 md:mb-2">Bio</label>
            <textarea 
              value={bio}
              onChange={e => setBio(e.target.value)}
              rows={3}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none focus:border-emerald-500 resize-none text-sm md:text-base"
              placeholder="Tell people about yourself..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-300 mb-1.5 md:mb-2">Interests (comma separated)</label>
            <input 
              type="text" 
              value={interests}
              onChange={e => setInterests(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 md:px-4 py-2.5 md:py-3 focus:outline-none focus:border-emerald-500 text-sm md:text-base"
              placeholder="coding, music, gaming"
            />
          </div>
          
          <button type="submit" className="w-full bg-emerald-500 hover:bg-emerald-600 text-white font-medium py-2.5 md:py-3 rounded-xl transition-colors mt-2">
            Save Changes
          </button>
        </form>
      </div>
    </div>
  );
}
