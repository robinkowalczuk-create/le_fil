import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function Cercles({ session }) {
  const [circles, setCircles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newCircleName, setNewCircleName] = useState("");
  const [creating, setCreating] = useState(false);

  const [emailByCircle, setEmailByCircle] = useState({});
  const [addingMemberFor, setAddingMemberFor] = useState(null);

  const charger = async () => {
    setLoading(true);
    const { data: circlesData, error } = await supabase
      .from("lf_circles")
      .select("id, name, lf_circle_members(id, invited_email, status)")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });

    if (error) console.error(error);
    setCircles(circlesData || []);
    setLoading(false);
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const creerCercle = async () => {
    if (!newCircleName.trim()) return;
    setCreating(true);
    const { error } = await supabase.from("lf_circles").insert({
      user_id: session.user.id,
      name: newCircleName.trim(),
    });
    setCreating(false);
    if (error) {
      console.error(error);
      return;
    }
    setNewCircleName("");
    charger();
  };

  const ajouterMembre = async (circleId) => {
    const email = (emailByCircle[circleId] || "").trim();
    if (!email) return;
    setAddingMemberFor(circleId);
    const { error } = await supabase.from("lf_circle_members").insert({
      circle_id: circleId,
      invited_email: email,
      status: "pending",
    });
    setAddingMemberFor(null);
    if (error) {
      console.error(error);
      return;
    }
    setEmailByCircle((prev) => ({ ...prev, [circleId]: "" }));
    charger();
  };

  return (
    <div className="max-w-md mx-auto px-6 pt-10 pb-28">
      <h1 className="font-display text-[28px] text-ink mb-1">Cercles</h1>
      <p className="font-body text-[13px] text-ink-muted mb-6">
        Regroupe famille et amis pour leur partager des entrées ou des
        collections entières.
      </p>

      <div className="flex gap-2 mb-8">
        <input
          type="text"
          placeholder="Nom du cercle (ex: Famille)"
          value={newCircleName}
          onChange={(e) => setNewCircleName(e.target.value)}
          className="font-body flex-1 px-3 py-2 rounded-[3px] bg-paper-card outline-none text-[13px] text-ink placeholder:text-ink-faint"
        />
        <button
          onClick={creerCercle}
          disabled={creating || !newCircleName.trim()}
          className="font-body text-[12.5px] font-medium px-4 py-2 rounded-full bg-thread text-paper disabled:opacity-50"
        >
          {creating ? "..." : "Créer"}
        </button>
      </div>

      {loading ? (
        <p className="font-body text-[13px] text-ink-faint">Chargement...</p>
      ) : circles.length === 0 ? (
        <p className="font-body text-[13px] text-ink-faint italic">
          Aucun cercle pour l'instant.
        </p>
      ) : (
        <div className="space-y-4">
          {circles.map((c) => (
            <div key={c.id} className="rounded-[3px] bg-paper-card p-4">
              <p className="font-display text-[17px] text-ink mb-2">
                {c.name}
              </p>

              {c.lf_circle_members?.length > 0 && (
                <ul className="space-y-1 mb-3">
                  {c.lf_circle_members.map((m) => (
                    <li
                      key={m.id}
                      className="font-mono text-[11px] text-ink-muted flex items-center justify-between"
                    >
                      <span>{m.invited_email}</span>
                      <span className="text-ink-faint uppercase">
                        {m.status === "accepted" ? "Actif" : "En attente"}
                      </span>
                    </li>
                  ))}
                </ul>
              )}

              <div className="flex gap-2">
                <input
                  type="email"
                  placeholder="Email à inviter"
                  value={emailByCircle[c.id] || ""}
                  onChange={(e) =>
                    setEmailByCircle((prev) => ({
                      ...prev,
                      [c.id]: e.target.value,
                    }))
                  }
                  className="font-body flex-1 px-3 py-1.5 rounded-[3px] bg-paper outline-none text-[12.5px] text-ink placeholder:text-ink-faint"
                />
                <button
                  onClick={() => ajouterMembre(c.id)}
                  disabled={addingMemberFor === c.id}
                  className="font-mono text-[10px] uppercase px-3 py-1.5 rounded-full border border-thread text-thread"
                >
                  Inviter
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
