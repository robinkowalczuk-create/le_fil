import React from "react";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import AuthGate from "./components/AuthGate";
import BottomNav from "./components/BottomNav";
import Accueil from "./pages/Accueil";
import Passe from "./pages/Passe";
import Cercles from "./pages/Cercles";
import Projets from "./pages/Projets";
import CollectionDetail from "./pages/CollectionDetail";

export default function App() {
  return (
    <AuthGate>
      {(session) => (
        <BrowserRouter>
          <div className="min-h-screen bg-paper">
            <Routes>
              <Route path="/" element={<Accueil session={session} />} />
              <Route path="/passe" element={<Passe session={session} />} />
              <Route path="/cercles" element={<Cercles session={session} />} />
              <Route path="/projets" element={<Projets session={session} />} />
              <Route
                path="/collection/:id"
                element={<CollectionDetail session={session} />}
              />
            </Routes>
            <BottomNav />
          </div>
        </BrowserRouter>
      )}
    </AuthGate>
  );
}
