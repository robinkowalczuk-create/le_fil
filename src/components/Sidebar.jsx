import React from "react";
import { NavLink } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const items = [
  { to: "/", icon: "●", label: "Fil" },
  { to: "/passe", icon: "▤", label: "Passé" },
  { to: "/projets", icon: "✦", label: "Projets" },
  { to: "/cercles", icon: "◐", label: "Cercles" },
];

export default function Sidebar() {
  return (
    <aside className="hidden md:flex md:flex-col md:fixed md:left-0 md:top-0 md:h-screen md:w-56 bg-paper-card/50 border-r border-ink-faint/20 px-5 py-8">
      <div className="flex items-center gap-2 mb-10 px-1">
        <span
          className="inline-block w-[3px] h-6 rounded-full bg-thread"
          style={{ transform: "rotate(10deg)" }}
        />
        <span className="font-display text-[20px] text-ink">Le Fil</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
        {items.map((item) => (
          <NavLink key={item.to} to={item.to} end={item.to === "/"}>
            {({ isActive }) => (
              <span
                className={`font-body text-[14px] flex items-center gap-3 px-3 py-2.5 rounded-[3px] ${
                  isActive
                    ? "text-thread bg-paper-card"
                    : "text-ink-muted"
                }`}
              >
                <span className="text-[13px]">{item.icon}</span>
                {item.label}
              </span>
            )}
          </NavLink>
        ))}
      </nav>

      <button
        onClick={() => supabase.auth.signOut()}
        className="font-mono text-[10px] uppercase tracking-wide text-ink-faint px-3 py-2 text-left"
      >
        Se déconnecter
      </button>
    </aside>
  );
}
