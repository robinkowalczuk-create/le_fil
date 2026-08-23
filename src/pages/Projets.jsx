import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Projets({ session }) {
  const [resolutions, setResolutions] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  const [newResTitle, setNewResTitle] = useState("");
  const [newResPeriod, setNewResPeriod] = useState("");
  const [savingRes, setSavingRes] = useState(false);

  const [newProjTitle, setNewProjTitle] = useState("");
  const [newProjDate, setNewProjDate] = useState("");
  const [savingProj, setSavingProj] = useState(false);
  const [startingId, setStartingId] = useState(null);

  const charger = async () => {
    setLoading(true);
    const { data: resData } = await supabase
      .from("lf_resolutions")
      .select("id, title, period_label, status")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setResolutions(resData || []);

    const { data: projData } = await supabase
      .from("lf_projects")
      .select("id, title, target_date, status, linked_collection_id")
      .eq("user_id", session.user.id)
      .order("created_at", { ascending: false });
    setProjects(projData || []);

    setLoading(false);
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const ajouterResolution = async () => {
    if (!newResTitle.trim() || !newResPeriod.trim()) return;
    setSavingRes(true);
    const { error } = await supabase.from("lf_resolutions").insert({
      user_id: session.user.id,
      title: newResTitle.trim(),
      period_label: newResPeriod.trim(),
    });
    setSavingRes(false);
    if (error) {
      console.error(error);
      return;
    }
    setNewResTitle("");
    setNewResPeriod("");
    charger();
  };

  const cyclerStatutResolution = async (r) => {
    const suivant =
      r.status === "in_progress"
        ? "done"
        : r.status === "done"
        ? "abandoned"
        : "in_progress";
    const { error } = await supabase
      .from("lf_resolutions")
      .update({ status: suivant })
      .eq("id", r.id);
    if (!error) charger();
  };

  const ajouterProjet = async () => {
    if (!newProjTitle.trim()) return;
    setSavingProj(true);
    const { error } = await supabase.from("lf_projects").insert({
      user_id: session.user.id,
      title: newProjTitle.trim(),
      target_date: newProjDate || null,
    });
    setSavingProj(false);
    if (error) {
      console.error(error);
      return;
    }
    setNewProjTitle("");
    setNewProjDate("");
    charger();
  };

  const demarrerProjet = async (p) => {
    setStartingId(p.id);
    const { data: col, error: colError } = await supabase
      .from("lf_collections")
      .insert({
        user_id: session.user.id,
        title: p.title,
        status: "active",
        started_at: todayISO(),
      })
      .select()
      .single();

    if (colError) {
      console.error(colError);
      setStartingId(null);
      return;
    }

    const { error: projError } = await supabase
      .from("lf_projects")
      .update({ status: "active", linked_collection_id: col.id })
      .eq("id", p.id);

    setStartingId(null);
    if (projError) {
      console.error(projError);
      return;
    }
    charger();
  };

  const statusLabel = { in_progress: "En cours", done: "Tenue", abandoned: "Abandonnée" };

  return (
    <div className="max-w-md mx-auto px-6 pt-10 pb-28">
      <h1 className="font-display text-[28px] text-ink mb-1">Projets</h1>
      <p className="font-body text-[13px] text-ink-muted mb-8">
        Ce que tu te promets, et ce que tu prépares.
      </p>

      {/* Résolutions */}
      <section className="mb-10">
        <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink mb-3">
          Résolutions
        </h2>

        <div className="space-y-2 mb-3">
          <input
            type="text"
            placeholder="Ex: Courir un 10km"
            value={newResTitle}
            onChange={(e) => setNewResTitle(e.target.value)}
            className="font-body w-full px-3 py-2 rounded-[3px] bg-paper-card outline-none text-[13px] text-ink placeholder:text-ink-faint"
          />
          <div className="flex gap-2">
            <input
              type="text"
              placeholder="Période (ex: Année 2026, Rentrée 2026)"
              value={newResPeriod}
              onChange={(e) => setNewResPeriod(e.target.value)}
              className="font-body flex-1 px-3 py-2 rounded-[3px] bg-paper-card outline-none text-[13px] text-ink placeholder:text-ink-faint"
            />
            <button
              onClick={ajouterResolution}
              disabled={savingRes || !newResTitle.trim() || !newResPeriod.trim()}
              className="font-body text-[12.5px] font-medium px-4 py-2 rounded-full bg-thread text-paper disabled:opacity-50"
            >
              {savingRes ? "..." : "Ajouter"}
            </button>
          </div>
        </div>

        {!loading && resolutions.length === 0 && (
          <p className="font-body text-[13px] text-ink-faint italic">
            Aucune résolution pour l'instant.
          </p>
        )}

        <div className="space-y-1.5">
          {resolutions.map((r) => (
            <button
              key={r.id}
              onClick={() => cyclerStatutResolution(r)}
              className="w-full flex items-center justify-between rounded-[3px] bg-paper-card px-4 py-2.5 text-left"
            >
              <div>
                <p
                  className={`font-body text-[14px] ${
                    r.status === "done"
                      ? "line-through text-ink-muted"
                      : "text-ink"
                  }`}
                >
                  {r.title}
                </p>
                <p className="font-mono text-[9.5px] text-ink-faint">
                  {r.period_label}
                </p>
              </div>
              <span
                className={`font-mono text-[9px] uppercase px-2 py-1 rounded-full border ${
                  r.status === "done"
                    ? "border-thread text-thread"
                    : r.status === "abandoned"
                    ? "border-ink-faint text-ink-faint"
                    : "border-gold text-gold"
                }`}
              >
                {statusLabel[r.status]}
              </span>
            </button>
          ))}
        </div>
      </section>

      {/* Projets à venir */}
      <section>
        <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink mb-3">
          Projets à venir
        </h2>

        <div className="space-y-2 mb-3">
          <input
            type="text"
            placeholder="Ex: Rénovation de la cuisine"
            value={newProjTitle}
            onChange={(e) => setNewProjTitle(e.target.value)}
            className="font-body w-full px-3 py-2 rounded-[3px] bg-paper-card outline-none text-[13px] text-ink placeholder:text-ink-faint"
          />
          <div className="flex gap-2">
            <input
              type="date"
              value={newProjDate}
              onChange={(e) => setNewProjDate(e.target.value)}
              className="font-mono text-[12px] flex-1 px-3 py-2 rounded-[3px] bg-paper-card outline-none text-ink-muted"
            />
            <button
              onClick={ajouterProjet}
              disabled={savingProj || !newProjTitle.trim()}
              className="font-body text-[12.5px] font-medium px-4 py-2 rounded-full bg-thread text-paper disabled:opacity-50"
            >
              {savingProj ? "..." : "Ajouter"}
            </button>
          </div>
        </div>

        {!loading && projects.length === 0 && (
          <p className="font-body text-[13px] text-ink-faint italic">
            Aucun projet à venir pour l'instant.
          </p>
        )}

        <div className="space-y-1.5">
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center justify-between rounded-[3px] bg-paper-card px-4 py-2.5"
            >
              <div>
                <p className="font-body text-[14px] text-ink">{p.title}</p>
                {p.target_date && (
                  <p className="font-mono text-[9.5px] text-ink-faint">
                    {new Date(p.target_date).toLocaleDateString("fr-FR")}
                  </p>
                )}
              </div>
              {p.status === "planned" ? (
                <button
                  onClick={() => demarrerProjet(p)}
                  disabled={startingId === p.id}
                  className="font-mono text-[9px] uppercase px-2.5 py-1.5 rounded-full border border-thread text-thread disabled:opacity-50"
                >
                  {startingId === p.id ? "..." : "Démarrer"}
                </button>
              ) : p.linked_collection_id ? (
                <Link
                  to={`/collection/${p.linked_collection_id}`}
                  className="font-mono text-[9px] uppercase text-thread"
                >
                  Voir la collection →
                </Link>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
