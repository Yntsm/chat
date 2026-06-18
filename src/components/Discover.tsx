import { useState, useEffect } from "react";
import { useAuthStore } from "../store";
import { UserCircle, UserPlus, Sparkles } from "lucide-react";

export default function Discover() {
  const { token, user: currentUser } = useAuthStore();
  const [users, setUsers] = useState<any[]>([]);
  const [sentRequests, setSentRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    fetchDiscover();
  }, []);

  const fetchDiscover = async () => {
    try {
      const res = await fetch("/api/users/discover", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) setUsers(await res.json());
    } catch(e) {}
  };

  const sendRequest = async (receiverId: string) => {
    try {
      const res = await fetch("/api/users/friends/request", {
        method: "POST",
        headers: { 
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({ receiverId })
      });
      if (res.ok) {
         setSentRequests(prev => new Set(prev).add(receiverId));
      }
    } catch(e) {}
  };

  return (
    <div className="flex-1 overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full pb-24 md:pb-8">
      <div className="flex items-center space-x-3 mb-6 md:mb-8 pl-2">
         <Sparkles className="w-7 h-7 md:w-8 md:h-8 text-blue-400" />
         <h1 className="text-2xl md:text-3xl font-bold">Discover</h1>
      </div>
      
      <div className="grid gap-4 md:gap-6 sm:grid-cols-2 lg:grid-cols-3 px-2 md:px-0">
        {users.map(u => (
          <div key={u._id} className="bg-slate-800 rounded-3xl overflow-hidden border border-slate-700 shadow-lg group">
             <div className="h-28 md:h-32 bg-gradient-to-br from-blue-500/20 to-purple-500/20 relative">
               <div className="absolute -bottom-6 md:-bottom-8 left-6 p-1 bg-slate-800 rounded-full">
                 {u.avatar ? (
                   <img src={u.avatar} className="w-14 h-14 md:w-16 md:h-16 rounded-full object-cover" />
                 ) : (
                   <UserCircle className="w-14 h-14 md:w-16 md:h-16 text-slate-400 bg-slate-800 rounded-full" />
                 )}
                 {u.onlineStatus === 'online' && (
                    <div className="absolute bottom-1 right-1 w-3.5 h-3.5 md:w-4 md:h-4 bg-emerald-500 border-2 border-slate-800 rounded-full" />
                 )}
               </div>
             </div>
             
             <div className="pt-10 md:pt-12 pb-5 md:pb-6 px-5 md:px-6">
                <h3 className="text-lg md:text-xl font-bold text-slate-100 truncate">{u.username}</h3>
                <p className="text-xs md:text-sm text-slate-400 mt-1.5 md:mt-2 line-clamp-2">{u.bio || "No bio provided"}</p>
                
                {u.interests && u.interests.length > 0 && (
                   <div className="flex flex-wrap gap-1.5 md:gap-2 mt-3 md:mt-4">
                      {u.interests.slice(0, 3).map((int: string, i: number) => (
                         <span key={i} className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-[10px] md:text-xs text-slate-300">
                           {int}
                         </span>
                      ))}
                      {u.interests.length > 3 && (
                         <span className="px-2 py-1 bg-slate-900 border border-slate-700 rounded-md text-[10px] md:text-xs text-slate-500">
                           +{u.interests.length - 3}
                         </span>
                      )}
                   </div>
                )}
                
                <div className="mt-5 md:mt-6">
                  <button
                    onClick={() => sendRequest(u._id)}
                    disabled={sentRequests.has(u._id)}
                    className="w-full flex items-center justify-center py-2.5 rounded-xl text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed bg-blue-500 hover:bg-blue-600 text-white"
                  >
                    {sentRequests.has(u._id) ? (
                       "Request Sent"
                    ) : (
                       <>
                         <UserPlus className="w-4 h-4 mr-2" />
                         Add Friend
                       </>
                    )}
                  </button>
                </div>
             </div>
          </div>
        ))}
        {users.length === 0 && (
           <div className="col-span-full py-12 text-center text-slate-500 bg-slate-900/50 rounded-2xl border border-slate-800 border-dashed">
              No new users to discover right now.
           </div>
        )}
      </div>
    </div>
  );
}
