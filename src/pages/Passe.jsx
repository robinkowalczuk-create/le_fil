import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const ONGLETS = [
  { value: "jour", label: "Jours" },
  { value: "semaine", label: "Semaines" },
  { value: "mois", label: "Mois" },
  { value: "annee", label: "Années" },
];

function getISOWeek(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function labelPourEntree(entry) {
  const d = new Date(entry.event_date + "T00:00:00");
  switch (entry.frequency) {
    case "jour":
      return d.toLocaleDateString("fr-FR", {
        weekday: "long",
        day: "numeric",
        month: "long",
      });
    case "semaine":
      return `Semaine ${getISOWeek(entry.event_date)} · ${d.getFullYear()}`;
    case "mois":
      return `${MOIS[d.getMonth()]} ${d.getFullYear()}`;
    case "annee":
      return `${d.getFullYear()}`;
    default:
      return entry.event_date;
  }
}

export default function Passe({ session }) {
  const [entries, setEntries] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collectionsArchivees, setCollectionsArchivees] = useState([]);
  const [circles, setCircles] = useState([]);

  const [activeTab, setActiveTab] = useState("jour");
  const [expandedYear, setExpandedYear] = useState(null);

  const [editingId, setEditingId] = useState(null);
  const [editContent, setEditContent] = useState("");
  const [editDate, setEditDate] = useState("");
  const [editCollectionId, setEditCollectionId] = useState("");
  const [editFrequency, setEditFrequency] = useState("jour");
  const [savingEdit, setSavingEdit] = useState(false);

  const [shareOpenFor, setShareOpenFor] = useState(null);
  const [shareFeedback, setShareFeedback] = useState("");

  const charger = async () => {
    setLoading(true);

    const { data: entriesData, error: entriesError } = await supabase
      .from("lf_entries")
      .select(
        "id, content, event_date, frequency, collection_id, lf_collections(title)"
      )
      .eq("user_id", session.user.id)
      .order("event_date", { ascending: false });

    if (entriesError) console.error(entriesError);
    setEntries(entriesData || []);

    const { data: allCollections } = await supabase
      .from("lf_collections")
      .select("id, title")
      .eq("user_id", session.user.id);
    setCollections(allCollections || []);

    const { data: archivedData } = await supabase
      .from("lf_collections")
      .select("id, title, started_at, ended_at")
      .eq("user_id", session.user.id)
      .eq("status", "completed")
      .order("ended_at", { ascending: false });
    setCollectionsArchivees(archivedData || []);

    const { data: circlesData } = await supabase
      .from("lf_circles")
      .select("id, name")
      .eq("user_id", session.user.id);
    setCircles(circlesData || []);

    setLoading(false);
  };

  useEffect(() => {
    charger();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const entreesOnglet = useMemo(
    () => entries.filter((e) => e.frequency === activeTab),
    [entries, activeTab]
  );

  const parAnnee = useMemo(() => {
    const acc = {};
    for (const e of entreesOnglet) {
      const y = new Date(e.event_date).getFullYear();
      acc[y] = acc[y] || [];
      acc[y].push(e);
    }
    return acc;
  }, [entreesOnglet]);

  const annees = Object.keys(parAnnee).sort((a, b) => b - a);

  const commencerEdition = (e) => {
    setEditingId(e.id);
    setEditContent(e.content);
    setEditDate(e.event_date);
    setEditCollectionId(e.collection_id || "");
    setEditFrequency(e.frequency);
    setShareOpenFor(null);
  };

  const enregistrerEdition = async (id) => {
    setSavingEdit(true);
    const { error } = await supabase
      .from("lf_entries")
      .update({
        content: editContent.trim(),
        event_date: editDate,
        collection_id: editCollectionId || null,
        frequency: editFrequency,
      })
      .eq("id", id);
    setSavingEdit(false);
    if (error) {
      console.error(error);
      return;
    }
    setEditingId(null);
    charger();
  };

  const partager = async (entryId, circleId) => {
    const { error } = await supabase.from("lf_shares").insert({
      owner_id: session.user.id,
      entry_id: entryId,
      circle_id: circleId,
    });
    setShareFeedback(error ? "Déjà partagé ou erreur." : "Partagé.");
    setTimeout(() => {
      setShareOpenFor(null);
      setShareFeedback("");
    }, 1200);
  };

  const styleParFrequence = (freq) => {
    switch (freq) {
      case "jour":
        return "bg-paper border-l-2 border-ink-faint/40";
      case "semaine":
        return "bg-paper-card";
      case "mois":
        return "bg-paper-card-alt";
      case "annee":
        return "bg-thread/10 border border-thread/30";
      default:
        return "bg-paper";
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 pt-10 pb-28">
      <h1 className="font-display text-[28px] text-ink mb-1">
        Consulter le passé
      </h1>
      <p className="font-body text-[13px] text-ink-muted mb-6">
        Relis tes jours, tes semaines, tes mois ou tes années.
      </p>

      <div className="flex gap-1.5 mb-7 flex-wrap">
        {ONGLETS.map((o) => (
          <button
            key={o.value}
            onClick={() => {
              setActiveTab(o.value);
              setExpandedYear(null);
              setEditingId(null);
            }}
            className={`font-mono text-[10.5px] tracking-[0.1em] uppercase px-3 py-1.5 rounded-full border transition-colors ${
              activeTab === o.value
                ? "bg-thread text-paper border-thread"
                : "text-ink-muted border-ink-faint"
            }`}
          >
            {o.label}
          </button>
        ))}
      </div>

      {loading ? (
        <p className="font-body text-[13px] text-ink-faint">Chargement...</p>
      ) : annees.length === 0 ? (
        <p className="font-body text-[13px] text-ink-faint italic mb-10">
          Rien à relire ici pour l'instant.
        </p>
      ) : (
        <div className="space-y-3 mb-10">
          {annees.map((y) => {
            const isYearOpen = expandedYear === y;
            const liste = parAnnee[y];

            return (
              <div
                key={y}
                className="rounded-[3px] bg-paper-card/60 overflow-hidden"
              >
                <button
                  onClick={() => setExpandedYear(isYearOpen ? null : y)}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <span className="font-display text-[18px] text-ink">
                    {y}
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">
                    {liste.length} entrées {isYearOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isYearOpen && (
                  <div className="px-4 pb-4 space-y-2">
                    <button
                      disabled
                      title="Bientôt disponible"
                      className="font-mono text-[10px] tracking-wide uppercase px-2.5 py-1 rounded-full border border-ink-faint/40 text-ink-faint opacity-60 mb-1"
                    >
                      ✦ Résumé (bientôt)
                    </button>

                    {liste.map((e) => {
                      const isEditing = editingId === e.id;
                      return (
                        <div
                          key={e.id}
                          className={`rounded-[3px] p-3 ${styleParFrequence(
                            e.frequency
                          )}`}
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-mono text-[10px] text-ink-faint">
                              {labelPourEntree(e)}
                              {e.lf_collections?.title
                                ? ` · ${e.lf_collections.title}`
                                : ""}
                            </span>
                            {!isEditing && (
                              <div className="flex gap-2">
                                <button
                                  onClick={() => commencerEdition(e)}
                                  className="font-mono text-[9px] uppercase text-ink-muted"
                                >
                                  Modifier
                                </button>
                                <button
                                  onClick={() =>
                                    setShareOpenFor(
                                      shareOpenFor === e.id ? null : e.id
                                    )
                                  }
                                  className="font-mono text-[9px] uppercase text-thread"
                                >
                                  Partager
                                </button>
                              </div>
                            )}
                          </div>

                          {isEditing ? (
                            <div className="space-y-2 mt-2">
                              <textarea
                                value={editContent}
                                onChange={(ev) =>
                                  setEditContent(ev.target.value)
                                }
                                rows={3}
                                className="font-body w-full bg-paper rounded-[3px] p-2 outline-none text-[13.5px] text-ink resize-none"
                              />
                              <div className="flex flex-wrap gap-1.5">
                                {ONGLETS.map((o) => (
                                  <button
                                    key={o.value}
                                    onClick={() => setEditFrequency(o.value)}
                                    className={`font-mono text-[9px] uppercase px-2 py-1 rounded-full border ${
                                      editFrequency === o.value
                                        ? "bg-thread text-paper border-thread"
                                        : "text-ink-muted border-ink-faint"
                                    }`}
                                  >
                                    {o.label}
                                  </button>
                                ))}
                              </div>
                              <div className="flex items-center gap-2 flex-wrap">
                                <input
                                  type="date"
                                  value={editDate}
                                  onChange={(ev) =>
                                    setEditDate(ev.target.value)
                                  }
                                  className="font-mono text-[11px] bg-transparent outline-none text-ink-muted border-b border-ink-faint/40"
                                />
                                <select
                                  value={editCollectionId}
                                  onChange={(ev) =>
                                    setEditCollectionId(ev.target.value)
                                  }
                                  className="font-mono text-[10px] bg-transparent outline-none text-ink-muted"
                                >
                                  <option value="">Sans collection</option>
                                  {collections.map((c) => (
                                    <option key={c.id} value={c.id}>
                                      {c.title}
                                    </option>
                                  ))}
                                </select>
                              </div>
                              <div className="flex justify-end gap-2 pt-1">
                                <button
                                  onClick={() => setEditingId(null)}
                                  className="font-mono text-[10px] text-ink-faint uppercase"
                                >
                                  Annuler
                                </button>
                                <button
                                  onClick={() => enregistrerEdition(e.id)}
                                  disabled={savingEdit}
                                  className="font-body text-[12px] font-medium px-3 py-1 rounded-full bg-thread text-paper disabled:opacity-50"
                                >
                                  {savingEdit ? "..." : "Enregistrer"}
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className="font-body text-[13.5px] text-ink leading-relaxed">
                              {e.content}
                            </p>
                          )}

                          {!isEditing && shareOpenFor === e.id && (
                            <div className="mt-2 pt-2 border-t border-ink-faint/20">
                              {circles.length === 0 ? (
                                <p className="font-mono text-[10px] text-ink-faint">
                                  Crée d'abord un cercle dans l'onglet
                                  Cercles.
                                </p>
                              ) : (
                                <div className="flex flex-wrap gap-1.5">
                                  {circles.map((c) => (
                                    <button
                                      key={c.id}
                                      onClick={() => partager(e.id, c.id)}
                                      className="font-mono text-[9px] uppercase px-2 py-1 rounded-full border border-thread text-thread"
                                    >
                                      {c.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                              {shareFeedback && (
                                <p className="font-mono text-[9px] text-ink-faint mt-1">
                                  {shareFeedback}
                                </p>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      <div>
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-block w-2 h-2 rounded-full bg-ink-faint" />
          <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-faint">
            Collections archivées
          </h2>
        </div>
        {collectionsArchivees.length === 0 ? (
          <p className="font-body text-[13px] text-ink-faint italic">
            Aucune collection terminée pour l'instant.
          </p>
        ) : (
          <div className="space-y-2">
            {collectionsArchivees.map((c) => (
              <Link
                to={`/collection/${c.id}`}
                key={c.id}
                className="block rounded-[3px] px-4 py-3 bg-paper-card/60"
              >
                <p className="font-display text-[15px] text-ink">
                  {c.title}
                </p>
                <p className="font-mono text-[10px] text-ink-faint">
                  {c.started_at
                    ? new Date(c.started_at).toLocaleDateString("fr-FR")
                    : ""}
                  {c.ended_at
                    ? ` → ${new Date(c.ended_at).toLocaleDateString("fr-FR")}`
                    : ""}
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
