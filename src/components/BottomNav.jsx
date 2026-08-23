import React from "react";
import { NavLink } from "react-router-dom";

const items = [
  { to: "/", icon: "●", label: "Fil" },
  { to: "/passe", icon: "▤", label: "Passé" },
  { to: "/projets", icon: "✦", label: "Projets" },
  { to: "/cercles", icon: "◐", label: "Cercles" },
];

export default function BottomNav() {
  return (
    <nav className="fixed bottom-0 left-0 right-0 border-t border-ink-faint/20 bg-paper md:hidden">
      <div className="max-w-md mx-auto flex justify-around py-3">
        {items.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            end={item.to === "/"}
            className="flex flex-col items-center gap-1"
          >
            {({ isActive }) => (
              <>
                <span
                  className={`font-body text-[13px] ${
                    isActive ? "text-thread" : "text-ink-faint"
                  }`}
                >
                  {item.icon}
                </span>
                <span
                  className={`font-mono text-[9px] tracking-wide uppercase ${
                    isActive ? "text-thread" : "text-ink-faint"
                  }`}
                >
                  {item.label}
                </span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}
