import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGate from "./components/AuthGate";
import BottomNav from "./components/BottomNav";
import Accueil from "./pages/Accueil";
import Passe from "./pages/Passe";
import Cercles from "./pages/Cercles";

export default function App() {
  return (
    <AuthGate>
      {(session) => (
        <BrowserRouter>
          <div className="min-h-screen bg-paper">
            <Routes>
              <Route path="/" element={<Accueil session={session} />} />
              <Route path="/passe" element={<Passe />} />
              <Route path="/cercles" element={<Cercles />} />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      )}
    </AuthGate>
  );
}
