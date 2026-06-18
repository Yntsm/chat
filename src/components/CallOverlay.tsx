import React, { useEffect, useRef, useState } from "react";
import { useAuthStore, useCallStore, useChatStore } from "../store";
import { Phone, Video, PhoneOff, MicOff, Mic, VideoOff as VideoOffIcon } from "lucide-react";

export default function CallOverlay() {
  const { user } = useAuthStore();
  const { socket } = useChatStore();
  const { isCalling, isReceivingCall, callerInfo, callSignal, callAccepted, isVideoCall, setCallState, resetCall } = useCallStore();

  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  
  const [isMuted, setIsMuted] = useState(false);
  const [isVideoDisabled, setIsVideoDisabled] = useState(false);

  const localVideoRef = useRef<HTMLVideoElement>(null);
  const remoteVideoRef = useRef<HTMLVideoElement>(null);
  const rtcPeerConnection = useRef<RTCPeerConnection | null>(null);

  // ICE Servers configuration
  const rtcConfig = {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:global.stun.twilio.com:3478" }
    ]
  };

  useEffect(() => {
    if (!socket || !user) return;

    // Incoming Call Handler
    const handleIncomingCall = (data: any) => {
      // data: { signal, from, callerName, callerAvatar, isVideo }
      if (isCalling || isReceivingCall) return; // Busy
      setCallState({
        isReceivingCall: true,
        callerInfo: { id: data.from, name: data.callerName, avatar: data.callerAvatar },
        callSignal: data.signal,
        isVideoCall: data.isVideo
      });
    };

    const handleCallAccepted = async (signalData: any) => {
      setCallState({ callAccepted: true });
      try {
        if (rtcPeerConnection.current) {
          await rtcPeerConnection.current.setRemoteDescription(new RTCSessionDescription(signalData));
        }
      } catch (err) {
        console.error("Error setting remote description on accept:", err);
      }
    };

    const handleCallEnded = () => {
      endCallAction(false);
    };

    const handleIceCandidate = async (data: any) => {
      try {
        if (rtcPeerConnection.current && data.candidate) {
          await rtcPeerConnection.current.addIceCandidate(new RTCIceCandidate(data.candidate));
        }
      } catch (err) {
        console.error("Error adding received ICE candidate", err);
      }
    };

    socket.on("incoming_call", handleIncomingCall);
    socket.on("call_accepted", handleCallAccepted);
    socket.on("call_ended", handleCallEnded);
    socket.on("ice_candidate", handleIceCandidate);

    return () => {
      socket.off("incoming_call", handleIncomingCall);
      socket.off("call_accepted", handleCallAccepted);
      socket.off("call_ended", handleCallEnded);
      socket.off("ice_candidate", handleIceCandidate);
    };
  }, [socket, user, isCalling, isReceivingCall]);

  // When we initiate a call
  useEffect(() => {
    if (isCalling && !isReceivingCall && !callAccepted && callerInfo) {
      startCameraAndCall(true, callerInfo);
    }
  }, [isCalling]);

  const initLocalStream = async (video: boolean) => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
         localVideoRef.current.srcObject = stream;
      }
      return stream;
    } catch (err) {
      console.error("Error getting user media:", err);
      alert("Microphone/Camera permission denied.");
      return null;
    }
  };

  const createPeerConnection = (stream: MediaStream, toUser: string, isInitiator: boolean) => {
     const pc = new RTCPeerConnection(rtcConfig);
     rtcPeerConnection.current = pc;

     stream.getTracks().forEach(track => {
        pc.addTrack(track, stream);
     });

     pc.ontrack = (event) => {
        setRemoteStream(event.streams[0]);
        if (remoteVideoRef.current) {
           remoteVideoRef.current.srcObject = event.streams[0];
        }
     };

     pc.onicecandidate = (event) => {
        if (event.candidate && socket) {
           socket.emit("ice_candidate", { to: toUser, candidate: event.candidate });
        }
     };

     return pc;
  };

  const startCameraAndCall = async (initiator: boolean, toUser: any) => {
     const stream = await initLocalStream(isVideoCall);
     if (!stream) {
        resetCall();
        return;
     }

     if (initiator) {
        const pc = createPeerConnection(stream, toUser.id, true);
        try {
           const offer = await pc.createOffer();
           await pc.setLocalDescription(offer);
           socket?.emit("call_user", {
              userToCall: toUser.id,
              signalData: offer,
              from: user?.id,
              callerName: user?.username,
              callerAvatar: user?.avatar,
              isVideo: isVideoCall
           });
        } catch (err) {
           console.error("Error creating offer:", err);
        }
     }
  };

  const answerCall = async () => {
    if (!callerInfo || !callSignal) return;
    
    setCallState({ callAccepted: true });
    
    const stream = await initLocalStream(isVideoCall);
    if (!stream) {
       endCallAction(true);
       return;
    }

    const pc = createPeerConnection(stream, callerInfo.id, false);
    
    try {
       await pc.setRemoteDescription(new RTCSessionDescription(callSignal));
       const answer = await pc.createAnswer();
       await pc.setLocalDescription(answer);
       socket?.emit("answer_call", { signal: answer, to: callerInfo.id });
    } catch (error) {
       console.error("Error answering call:", error);
    }
  };

  const stopTracks = () => {
     if (localStream) {
        localStream.getTracks().forEach(track => track.stop());
     }
     setLocalStream(null);
     setRemoteStream(null);
  };

  const endCallAction = (emitEnd = true) => {
     if (emitEnd && socket && callerInfo) {
        socket.emit("end_call", { to: callerInfo.id });
     }
     if (rtcPeerConnection.current) {
        rtcPeerConnection.current.close();
        rtcPeerConnection.current = null;
     }
     stopTracks();
     resetCall();
  };

  const toggleMute = () => {
     if (localStream) {
        localStream.getAudioTracks().forEach(track => {
           track.enabled = !track.enabled;
        });
        setIsMuted(!isMuted);
     }
  };

  const toggleVideo = () => {
     if (localStream) {
        localStream.getVideoTracks().forEach(track => {
           track.enabled = !track.enabled;
        });
        setIsVideoDisabled(!isVideoDisabled);
     }
  };

  if (!isCalling && !isReceivingCall) return null;

  return (
    <div className="fixed inset-0 bg-slate-950/90 backdrop-blur-sm z-[100] flex items-center justify-center p-4">
      {/* Incoming Call Dialog */}
      {isReceivingCall && !callAccepted && (
        <div className="bg-slate-900 border border-slate-700 rounded-3xl p-8 max-w-sm w-full mx-auto text-center shadow-2xl animate-fade-in">
           <div className="w-24 h-24 mx-auto bg-slate-800 rounded-full mb-6 overflow-hidden border-4 border-slate-700">
             {callerInfo?.avatar ? (
                <img src={callerInfo.avatar} className="w-full h-full object-cover" />
             ) : (
                <div className="w-full h-full flex items-center justify-center text-slate-400">
                  <Phone className="w-10 h-10" />
                </div>
             )}
           </div>
           <h2 className="text-2xl font-bold text-white mb-2">{callerInfo?.name}</h2>
           <p className="text-slate-400 mb-8 mt-2">Incoming {isVideoCall ? "Video" : "Voice"} Call...</p>
           
           <div className="flex justify-center space-x-6">
              <button 
                onClick={() => endCallAction(true)}
                className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20"
              >
                <PhoneOff className="w-6 h-6 text-white" />
              </button>
              <button 
                onClick={answerCall}
                className="w-14 h-14 bg-emerald-500 rounded-full flex items-center justify-center hover:bg-emerald-600 transition-colors shadow-lg shadow-emerald-500/20"
              >
                {isVideoCall ? <Video className="w-6 h-6 text-white" /> : <Phone className="w-6 h-6 text-white" />}
              </button>
           </div>
        </div>
      )}

      {/* Active Call UI */}
      {(isCalling && !callAccepted) || callAccepted ? (
        <div className="w-full max-w-5xl aspect-video bg-slate-900 rounded-3xl overflow-hidden relative shadow-2xl border border-slate-800 flex items-center justify-center">
           
           {!callAccepted && isCalling && (
              <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-slate-900/80 backdrop-blur-sm">
                 <div className="w-24 h-24 mx-auto bg-slate-800 rounded-full mb-6 overflow-hidden border-4 border-slate-700">
                   {callerInfo?.avatar && <img src={callerInfo.avatar} className="w-full h-full object-cover" />}
                 </div>
                 <h2 className="text-2xl font-bold text-white mb-2">Calling {callerInfo?.name}...</h2>
              </div>
           )}

           {/* Remote Video Stream - Full screen */}
           {isVideoCall && (
              <video 
                ref={remoteVideoRef} 
                autoPlay 
                playsInline 
                className="w-full h-full object-cover"
              />
           )}
           
           {/* Audio only indicator */}
           {!isVideoCall && callAccepted && (
              <div className="flex flex-col items-center justify-center w-full h-full">
                 <div className="w-32 h-32 rounded-full overflow-hidden mb-6 shadow-xl border-4 border-emerald-500/30">
                    <img src={callerInfo?.avatar} className="w-full h-full object-cover" />
                 </div>
                 <h2 className="text-3xl font-bold text-white mb-2">{callerInfo?.name}</h2>
                 <p className="text-emerald-400">00:00 (Connected)</p>
              </div>
           )}

           {/* Local Video Stream - Picture in Picture */}
           {isVideoCall && (
              <div className="absolute top-6 right-6 w-32 md:w-48 aspect-video bg-slate-800 rounded-xl overflow-hidden border-2 border-slate-700 shadow-xl z-20">
                 <video 
                   ref={localVideoRef} 
                   autoPlay 
                   playsInline 
                   muted 
                   className="w-full h-full object-cover mirror"
                 />
                 {isVideoDisabled && (
                    <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                       <VideoOffIcon className="w-8 h-8 text-slate-500" />
                    </div>
                 )}
              </div>
           )}

           {/* Controls Bar */}
           <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center space-x-4 bg-slate-800/80 backdrop-blur-md px-6 py-4 rounded-full border border-slate-700 z-20">
              <button 
                 onClick={toggleMute}
                 className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isMuted ? 'bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
              >
                 {isMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
              </button>
              
              {isVideoCall && (
                  <button 
                     onClick={toggleVideo}
                     className={`w-12 h-12 rounded-full flex items-center justify-center transition-colors ${isVideoDisabled ? 'bg-amber-500 text-white' : 'bg-slate-700 hover:bg-slate-600 text-slate-200'}`}
                  >
                     <VideoOffIcon className="w-5 h-5" />
                  </button>
              )}

              <button 
                 onClick={() => endCallAction(true)}
                 className="w-14 h-14 bg-red-500 rounded-full flex items-center justify-center hover:bg-red-600 transition-colors shadow-lg shadow-red-500/20 ml-4"
              >
                 <PhoneOff className="w-6 h-6 text-white" />
              </button>
           </div>
        </div>
      ) : null}
    </div>
  );
}
