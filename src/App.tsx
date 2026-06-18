/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { useEffect } from "react";
import { io } from "socket.io-client";
import { useAuthStore, useChatStore } from "./store";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";

export default function App() {
  const { user, token } = useAuthStore();
  const { setSocket } = useChatStore();

  useEffect(() => {
    if (token) {
      const newSocket = io("/", {
         auth: { token }
      });
      setSocket(newSocket);

      return () => {
         newSocket.close();
         setSocket(null);
      };
    }
  }, [token]);

  return (
    <BrowserRouter>
      <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col font-sans">
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/register" element={!user ? <Register /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <Dashboard /> : <Navigate to="/login" />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

