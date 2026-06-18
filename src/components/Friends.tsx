import { useState, useEffect } from "react";
import { useAuthStore, useChatStore } from "../store";
import { UserCircle, MessageSquare, Check, X } from "lucide-react";

export default function Friends() {
  const { token } = useAuthStore();
  const { setActiveConversationUser, setActiveTab } = useChatStore();
  const [friends, setFriends] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);

  useEffect(() => {
    fetchFriends();
    fetchRequests();
  }, []);

  const fetchFriends = async () => {
    try {
      const res = await fetch("/api/users/friends", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setFriends(await res.json());
    } catch(e) {}
  };

  const fetchRequests = async () => {
    try {
      const res = await fetch("/api/users/friends/requests", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setRequests(await res.json());
    } catch(e) {}
  };

  const respondRequest = async (requestId: string, action: 'accepted' | 'rejected') => {
    try {
      const res = await fetch("/api/users/friends/respond", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ requestId, action })
      });
      if (res.ok) {
        fetchRequests();
        fetchFriends();
      }
    } catch(e) {}
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-4xl mx-auto w-full pb-24 md:pb-8">
      <h1 className="text-2xl md:text-3xl font-bold mb-6 md:mb-8 pl-2">Friends</h1>

      {requests.length > 0 && (
        <div className="mb-8 md:mb-12">
          <h2 className="text-lg md:text-xl font-semibold mb-4 text-emerald-400 pl-2">Friend Requests</h2>
          <div className="grid gap-3 md:gap-4 md:grid-cols-2">
            {requests.map(req => (
              <div key={req._id} className="bg-slate-800 p-3 md:p-4 rounded-2xl flex items-center justify-between border border-slate-700">
                <div className="flex items-center space-x-3 w-full min-w-0 pr-4">
                   <div className="shrink-0">
                     {req.senderId.avatar ? (
                       <img src={req.senderId.avatar} className="w-10 h-10 rounded-full" />
                     ) : (
                       <UserCircle className="w-10 h-10 text-slate-500" />
                     )}
                   </div>
                   <span className="font-medium text-slate-200 truncate">{req.senderId.username}</span>
                </div>
                <div className="flex space-x-2 shrink-0">
                  <button 
                    onClick={() => respondRequest(req._id, 'accepted')}
                    className="p-2 bg-emerald-500/10 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl transition-colors"
                  >
                    <Check className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={() => respondRequest(req._id, 'rejected')}
                    className="p-2 bg-red-500/10 text-red-500 hover:bg-red-500 hover:text-white rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-lg md:text-xl font-semibold mb-4 text-slate-300 pl-2">My Friends</h2>
        {friends.length === 0 ? (
          <div className="text-slate-500 text-center py-12 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed mx-2">
            You don't have any friends yet. Go to Discover to find some!
          </div>
        ) : (
          <div className="grid gap-3 md:gap-4 md:grid-cols-2">
            {friends.map(friend => (
              <div key={friend._id} className="bg-slate-800 p-3 md:p-4 rounded-2xl flex items-center justify-between border border-slate-700">
                <div className="flex items-center space-x-3 md:space-x-4 min-w-0 pr-4">
                  <div className="relative shrink-0">
                     {friend.avatar ? (
                       <img src={friend.avatar} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover" />
                     ) : (
                       <UserCircle className="w-10 h-10 md:w-12 md:h-12 text-slate-500" />
                     )}
                     {friend.onlineStatus === 'online' && (
                        <div className="absolute -bottom-0.5 -right-0.5 md:-bottom-1 md:-right-1 w-3 h-3 md:w-3.5 md:h-3.5 bg-emerald-500 border-2 border-slate-800 rounded-full" />
                     )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-200 truncate">{friend.username}</div>
                    <div className="text-xs text-slate-400 truncate w-full">{friend.bio || "No bio"}</div>
                  </div>
                </div>
                <button 
                  onClick={() => {
                     setActiveConversationUser(friend);
                     setActiveTab("chat");
                  }}
                  className="p-2 md:p-3 shrink-0 bg-slate-700 hover:bg-emerald-500 hover:text-white rounded-xl transition-colors text-slate-300 group"
                  title="Message"
                >
                  <MessageSquare className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
