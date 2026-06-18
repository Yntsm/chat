import { useEffect, useState } from "react";
import { useAuthStore, useChatStore } from "../store";
import { LogOut, Users, MessageCircle, UserCircle, Search, User as UserIcon } from "lucide-react";
import Chat from "../components/Chat";
import Discover from "../components/Discover";
import Friends from "../components/Friends";
import Profile from "../components/Profile";
import CallOverlay from "../components/CallOverlay";

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const { activeTab, setActiveTab, socket } = useChatStore();
  const [unreadTotal, setUnreadTotal] = useState(0);

  useEffect(() => {
     if (!user) return;
     // initial fetch of unread count
     const fetchUnread = async () => {
        try {
           const res = await fetch("/api/messages/conversations", {
              headers: { "Authorization": `Bearer ${useAuthStore.getState().token}` }
           });
           if (res.ok) {
              const conversations = await res.json();
              let count = 0;
              conversations.forEach((c: any) => {
                 if (c.lastMessage && !c.lastMessage.seen && c.lastMessage.senderId !== user.id) {
                    count++;
                 }
              });
              setUnreadTotal(count);
           }
        } catch(e) {}
     };
     fetchUnread();
  }, [user]);

  useEffect(() => {
     if (!socket || !user) return;
     
     const handleReceiveMsg = (msg: any) => {
         // if we are not actively looking at this user's chat, increment unread
         const activeConvoUserId = useChatStore.getState().activeConversationUser?._id;
         if (msg.senderId._id !== user.id && msg.senderId !== user.id) {
            if (activeTab !== "chat" || activeConvoUserId !== msg.senderId._id) {
               setUnreadTotal(prev => prev + 1);
            }
         }
     };

     socket.on("receive_message", handleReceiveMsg);
     return () => {
         socket.off("receive_message", handleReceiveMsg);
     };
  }, [socket, activeTab, user]);

  if (!user) return null;

  return (
    <div className="flex h-[100dvh] overflow-hidden flex-col md:flex-row bg-slate-950">
      {/* Primary Navigation Sidebar / Bottom Bar */}
      <div className="w-full md:w-20 bg-slate-900 border-t md:border-t-0 md:border-r border-slate-800 flex flex-row md:flex-col items-center justify-between md:justify-start py-2 md:py-6 px-4 md:px-0 select-none shrink-0 order-last md:order-first z-50">
        <div className="hidden md:flex w-12 h-12 bg-emerald-500 rounded-xl items-center justify-center shadow-lg mb-8">
          <MessageCircle className="w-7 h-7 text-white" />
        </div>

        <nav className="flex md:flex-1 w-full md:w-auto flex-row md:flex-col items-center justify-around md:justify-start md:space-y-4">
          <NavItem active={activeTab === "chat"} onClick={() => setActiveTab("chat")} icon={<MessageCircle />} tooltip="Chat" badge={unreadTotal > 0} />
          <NavItem active={activeTab === "friends"} onClick={() => setActiveTab("friends")} icon={<Users />} tooltip="Friends" />
          <NavItem active={activeTab === "discover"} onClick={() => setActiveTab("discover")} icon={<Search />} tooltip="Discover" />
          <NavItem active={activeTab === "profile"} onClick={() => setActiveTab("profile")} icon={<UserIcon />} tooltip="Profile" />
        </nav>

        <button 
          onClick={() => useAuthStore.getState().logout()}
          className="hidden md:flex w-12 h-12 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 items-center justify-center transition-colors mt-auto"
          title="Logout"
        >
          <LogOut className="w-6 h-6" />
        </button>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex overflow-hidden max-h-[100dvh]">
         {activeTab === "chat" && <Chat onUnreadChange={setUnreadTotal} />}
         {activeTab === "discover" && <Discover />}
         {activeTab === "friends" && <Friends />}
         {activeTab === "profile" && <Profile />}
      </div>
      
      <CallOverlay />
    </div>
  );
}

function NavItem({ active, onClick, icon, tooltip, badge }: any) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200 group relative ${
        active ? "bg-slate-800 text-emerald-400" : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/50"
      }`}
    >
      <div className={`w-6 h-6 transition-transform ${active ? "scale-110" : ""}`}>
        {icon}
      </div>
      {active && <div className="absolute top-auto bottom-0 md:left-0 md:top-2 md:bottom-2 h-1 w-6 md:w-1 md:h-auto bg-emerald-500 rounded-full md:rounded-r-full" />}
      {badge && <div className="absolute top-2.5 right-2.5 w-2.5 h-2.5 bg-emerald-500 md:bg-red-500 rounded-full ring-2 ring-slate-900 md:ring-slate-800" />}
    </button>
  );
}
