import React, { useState, useEffect, useRef } from "react";
import { useAuthStore, useChatStore, useCallStore } from "../store";
import { UserCircle, Send, Check, CheckCheck, MessageCircle, ChevronLeft, Phone, Video } from "lucide-react";

export default function Chat({ onUnreadChange }: { onUnreadChange?: (count: number) => void }) {
  const { token, user: currentUser } = useAuthStore();
  const { socket, activeConversationUser, setActiveConversationUser } = useChatStore();
  const { setCallState } = useCallStore();
  const [conversations, setConversations] = useState<any[]>([]);
  const [messages, setMessages] = useState<any[]>([]);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchConversations();
  }, []);

  useEffect(() => {
    if (activeConversationUser) {
      fetchMessages(activeConversationUser._id);
    }
  }, [activeConversationUser]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    if (messages.length > 0 && activeConversationUser && socket) {
      const hasUnread = messages.some(m => !m.seen && (m.senderId._id === activeConversationUser._id || m.senderId === activeConversationUser._id));
      if (hasUnread) {
         const conversationId = messages[0].conversationId; // Assume all messages belong to same convo
         socket.emit("mark_seen", { conversationId });
         setMessages(prev => prev.map(m => (!m.seen && (m.senderId._id === activeConversationUser._id || m.senderId === activeConversationUser._id)) ? { ...m, seen: true } : m));
      }
    }
  }, [messages, activeConversationUser, socket]);

  useEffect(() => {
     let unreadCount = 0;
     conversations.forEach(c => {
         if (c.lastMessage && !c.lastMessage.seen && c.lastMessage.senderId !== currentUser?.id) {
            unreadCount++;
         }
     });
     if (onUnreadChange) onUnreadChange(unreadCount);
  }, [conversations, currentUser, onUnreadChange]);

  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  useEffect(() => {
    if (!socket) return;

    const handleReceiveMessage = (msg: any) => {
      if (
        activeConversationUser &&
        (msg.senderId._id === activeConversationUser._id || msg.receiverId._id === activeConversationUser._id)
      ) {
        setMessages(prev => [...prev, msg]);
        setIsTyping(false); // Stop typing when message is received
      }
      fetchConversations();
    };

    const handleTyping = (data: any) => {
      if (activeConversationUser && data.senderId === activeConversationUser._id) {
         setIsTyping(data.isTyping);
      }
    };

    const handleMessagesSeen = (data: any) => {
       setMessages(prev => prev.map(m => {
          if (!m.seen && m.conversationId === data.conversationId && (m.senderId._id === currentUser?.id || m.senderId === currentUser?.id)) {
             return { ...m, seen: true };
          }
          return m;
       }));
    };

    socket.on("receive_message", handleReceiveMessage);
    socket.on("typing", handleTyping);
    socket.on("messages_seen", handleMessagesSeen);

    return () => {
      socket.off("receive_message", handleReceiveMessage);
      socket.off("typing", handleTyping);
      socket.off("messages_seen", handleMessagesSeen);
    };
  }, [socket, activeConversationUser, currentUser]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
     setInput(e.target.value);
     if (socket && activeConversationUser) {
        socket.emit("typing", { receiverId: activeConversationUser._id, isTyping: true });
        if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = setTimeout(() => {
           socket.emit("typing", { receiverId: activeConversationUser._id, isTyping: false });
        }, 2000);
     }
  };

  const fetchConversations = async () => {
    try {
      const res = await fetch("/api/messages/conversations", {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
         setConversations(await res.json());
      }
    } catch(e) {}
  };

  const fetchMessages = async (otherUserId: string) => {
    try {
      const res = await fetch(`/api/messages/${otherUserId}`, {
        headers: { "Authorization": `Bearer ${token}` }
      });
      if (res.ok) {
         setMessages(await res.json());
      }
    } catch(e) {}
  };

  const sendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || !activeConversationUser || !socket) return;
    socket.emit("send_message", { receiverId: activeConversationUser._id, text: input });
    setInput("");
  };

  const formatTime = (dateStr: string) => {
     return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex-1 flex overflow-hidden relative">
      {/* Conversations List (Sidebar) - Hidden on mobile if viewing a chat */}
      <div className={`w-full md:w-80 bg-slate-900 border-r border-slate-800 flex-col shrink-0 flex-shrink-0 ${activeConversationUser ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 border-b border-slate-800 sticky top-0 bg-slate-900 z-10">
          <h2 className="text-xl font-bold">Chats</h2>
        </div>
        <div className="flex-1 overflow-y-auto">
          {conversations.map(conv => {
            const partner = conv.participants.find((p: any) => p._id !== currentUser?.id);
            if (!partner) return null;
            const isActive = activeConversationUser?._id === partner._id;
            return (
              <button
                key={conv._id}
                onClick={() => setActiveConversationUser(partner)}
                className={`w-full p-4 flex items-center space-x-3 hover:bg-slate-800 transition-colors border-b border-slate-800/50 ${isActive ? 'bg-slate-800' : ''}`}
              >
                <div className="relative shrink-0">
                   {partner.avatar ? (
                     <img src={partner.avatar} className="w-12 h-12 rounded-full object-cover bg-slate-700" />
                   ) : (
                     <UserCircle className="w-12 h-12 text-slate-500" />
                   )}
                   {partner.onlineStatus === 'online' && (
                      <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-slate-900 rounded-full" />
                   )}
                </div>
                <div className="flex-1 text-left min-w-0">
                  <div className="flex justify-between items-baseline mb-1">
                     <span className="font-semibold text-slate-200 truncate">{partner.username}</span>
                     {conv.lastMessage && (
                        <span className="text-xs text-slate-500 shrink-0 ml-2">{formatTime(conv.lastMessage.createdAt)}</span>
                     )}
                  </div>
                  {conv.lastMessage && (
                     <div className="flex justify-between items-center space-x-2">
                        <p className={`text-sm truncate w-full ${!conv.lastMessage.seen && conv.lastMessage.senderId !== currentUser?.id ? 'text-emerald-400 font-medium' : 'text-slate-400'}`}>
                           {conv.lastMessage.senderId === currentUser?.id ? "You: " : ""}
                           {conv.lastMessage.text}
                        </p>
                        {!conv.lastMessage.seen && conv.lastMessage.senderId !== currentUser?.id && (
                           <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full shrink-0" />
                        )}
                     </div>
                  )}
                </div>
              </button>
            )
          })}
          {conversations.length === 0 && (
            <div className="p-6 text-center text-slate-500 text-sm">
               No active conversations. Find friends to chat!
            </div>
          )}
        </div>
      </div>

      {/* Main Chat Area - Hidden on mobile if NO active chat */}
      <div className={`flex-1 flex flex-col bg-[#0b141a] absolute inset-0 md:relative z-10 md:z-auto ${!activeConversationUser ? 'hidden md:flex' : 'flex'}`}> 
        {activeConversationUser ? (
          <>
            {/* Header */}
            <div className="h-16 px-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between shrink-0">
               <div className="flex items-center space-x-3 min-w-0">
                  <button 
                    onClick={() => setActiveConversationUser(null)} 
                    className="md:hidden p-2 -ml-2 text-slate-400 hover:text-white"
                  >
                     <ChevronLeft className="w-6 h-6" />
                  </button>
                  <div className="relative shrink-0">
                    {activeConversationUser.avatar ? (
                       <img src={activeConversationUser.avatar} className="w-10 h-10 rounded-full object-cover" />
                    ) : (
                       <UserCircle className="w-10 h-10 text-slate-500" />
                    )}
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold truncate text-slate-200">{activeConversationUser.username}</div>
                    {activeConversationUser.onlineStatus === 'online' ? (
                       <div className="text-xs text-emerald-500">online</div>
                    ) : (
                       <div className="text-xs text-slate-400">offline</div>
                    )}
                  </div>
               </div>
               
               <div className="flex items-center space-x-2 shrink-0">
                  <button 
                     onClick={() => {
                        setCallState({
                           isCalling: true,
                           isVideoCall: false,
                           callerInfo: { id: activeConversationUser._id, name: activeConversationUser.username, avatar: activeConversationUser.avatar }
                        });
                     }}
                     className="p-2.5 text-emerald-400 hover:bg-slate-800 rounded-full transition-colors"
                  >
                     <Phone className="w-5 h-5" />
                  </button>
                  <button 
                     onClick={() => {
                        setCallState({
                           isCalling: true,
                           isVideoCall: true,
                           callerInfo: { id: activeConversationUser._id, name: activeConversationUser.username, avatar: activeConversationUser.avatar }
                        });
                     }}
                     className="p-2.5 text-emerald-400 hover:bg-slate-800 rounded-full transition-colors hidden sm:block"
                  >
                     <Video className="w-5 h-5" />
                  </button>
               </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-full flex flex-col">
               {messages.map((msg, i) => {
                  const isMe = msg.senderId._id === currentUser?.id || msg.senderId === currentUser?.id;
                  return (
                    <div key={msg._id || i} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
                       <div className={`max-w-[85%] md:max-w-[70%] rounded-2xl px-4 py-2 relative shadow-sm ${
                          isMe 
                          ? 'bg-emerald-600 text-white rounded-br-sm' 
                          : 'bg-slate-800 text-slate-100 rounded-bl-sm border border-slate-700'
                       }`}>
                          <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.text}</p>
                          <div className="flex justify-end items-center gap-1 mt-1">
                             <span className={`text-[10px] ${isMe ? 'text-emerald-200' : 'text-slate-400'}`}>
                                {formatTime(msg.createdAt)}
                             </span>
                             {isMe && (
                               msg.seen ? <CheckCheck className="w-3 h-3 text-emerald-200" /> : <Check className="w-3 h-3 text-emerald-200/70" />
                             )}
                          </div>
                       </div>
                    </div>
                  );
               })}
               {isTyping && (
                  <div className="flex justify-start">
                     <div className="bg-slate-800 rounded-2xl rounded-bl-sm px-4 py-3 flex space-x-1.5 items-center">
                       <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                       <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                       <span className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></span>
                     </div>
                  </div>
               )}
               <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-3 md:p-4 bg-slate-900 border-t border-slate-800 shrink-0 mb-safe pointer-events-auto">
              <form onSubmit={sendMessage} className="flex gap-2">
                 <input 
                   type="text"
                   value={input}
                   onChange={handleInputChange}
                   placeholder="Message..."
                   className="flex-1 bg-slate-800 border-none rounded-full px-4 md:px-6 py-2.5 md:py-3 focus:outline-none focus:ring-2 focus:ring-emerald-500/50 transition-shadow text-sm"
                 />
                 <button 
                   type="submit"
                   disabled={!input.trim()}
                   className="w-10 h-10 md:w-12 md:h-12 shrink-0 bg-emerald-500 text-white rounded-full flex items-center justify-center hover:bg-emerald-600 disabled:opacity-50 disabled:hover:bg-emerald-500 transition-colors"
                 >
                   <Send className="w-4 h-4 md:w-5 md:h-5 ml-0.5 md:ml-1" />
                 </button>
              </form>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
             <div className="text-center p-4">
                <MessageCircle className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p>Select a chat to start messaging</p>
             </div>
          </div>
        )}
      </div>
    </div>
  );
}
