import React, { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

export default function Passe({ session }) {
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collectionsArchivees, setCollectionsArchivees] = useState([]);
  const [expandedYear, setExpandedYear] = useState(null);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [circles, setCircles] = useState([]);
  const [shareOpenFor, setShareOpenFor] = useState(null);
  const [shareFeedback, setShareFeedback] = useState("");

  const charger = async () => {
    setLoading(true);

    const { data: entriesData, error: entriesError } = await supabase
      .from("lf_entries")
      .select("id, content, event_date, frequencies, collection_id, lf_collections(title)")
      .eq("user_id", session.user.id)
      .order("event_date", { ascending: false });

    if (entriesError) console.error(entriesError);
    setEntries(entriesData || []);

    const { data: archivedData, error: archivedError } = await supabase
      .from("lf_collections")
      .select("id, title, started_at, ended_at")
      .eq("user_id", session.user.id)
      .eq("status", "completed")
      .order("ended_at", { ascending: false });

    if (archivedError) console.error(archivedError);
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

  // regroupe les entrées par année puis par mois
  const parAnnee = useMemo(() => {
    const acc = {};
    for (const e of entries) {
      const d = new Date(e.event_date);
      const y = d.getFullYear();
      const m = d.getMonth();
      acc[y] = acc[y] || {};
      acc[y][m] = acc[y][m] || [];
      acc[y][m].push(e);
    }
    return acc;
  }, [entries]);

  const annees = Object.keys(parAnnee).sort((a, b) => b - a);

  const partager = async (entryId, circleId) => {
    const { error } = await supabase.from("lf_shares").insert({
      owner_id: session.user.id,
      entry_id: entryId,
      circle_id: circleId,
    });
    if (error) {
      console.error(error);
      setShareFeedback("Déjà partagé ou erreur.");
    } else {
      setShareFeedback("Partagé.");
    }
    setTimeout(() => {
      setShareOpenFor(null);
      setShareFeedback("");
    }, 1200);
  };

  return (
    <div className="max-w-md mx-auto px-6 pt-10 pb-28">
      <h1 className="font-display text-[28px] text-ink mb-1">
        Consulter le passé
      </h1>
      <p className="font-body text-[13px] text-ink-muted mb-8">
        Relis tes années, tes mois, ou tes collections terminées.
      </p>

      {loading ? (
        <p className="font-body text-[13px] text-ink-faint">Chargement...</p>
      ) : annees.length === 0 ? (
        <p className="font-body text-[13px] text-ink-faint italic">
          Rien à relire pour l'instant. Écris ta première entrée depuis le
          fil.
        </p>
      ) : (
        <div className="space-y-3 mb-10">
          {annees.map((y) => {
            const isYearOpen = expandedYear === y;
            const mois = Object.keys(parAnnee[y]).sort((a, b) => b - a);
            const totalAnnee = mois.reduce(
              (sum, m) => sum + parAnnee[y][m].length,
              0
            );

            return (
              <div key={y} className="rounded-[3px] bg-paper-card overflow-hidden">
                <button
                  onClick={() => {
                    setExpandedYear(isYearOpen ? null : y);
                    setExpandedMonth(null);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <span className="font-display text-[18px] text-ink">
                    {y}
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">
                    {totalAnnee} entrées {isYearOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isYearOpen && (
                  <div className="px-4 pb-3 space-y-1">
                    <button
                      disabled
                      title="Bientôt disponible"
                      className="font-mono text-[10px] tracking-wide uppercase px-2.5 py-1 rounded-full border border-ink-faint/40 text-ink-faint opacity-60 mb-2"
                    >
                      ✦ Résumé de l'année (bientôt)
                    </button>

                    {mois.map((m) => {
                      const isMonthOpen = expandedMonth === `${y}-${m}`;
                      return (
                        <div key={m}>
                          <button
                            onClick={() =>
                              setExpandedMonth(
                                isMonthOpen ? null : `${y}-${m}`
                              )
                            }
                            className="w-full flex items-center justify-between py-2"
                          >
                            <span className="font-body text-[14px] text-ink">
                              {MOIS[m]}
                            </span>
                            <span className="font-mono text-[10px] text-ink-faint">
                              {parAnnee[y][m].length} {isMonthOpen ? "▲" : "▼"}
                            </span>
                          </button>

                          {isMonthOpen && (
                            <div className="space-y-2 pb-2">
                              {parAnnee[y][m].map((e) => (
                                <div
                                  key={e.id}
                                  className="bg-paper rounded-[3px] p-3"
                                >
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-mono text-[10px] text-ink-faint">
                                      {new Date(
                                        e.event_date
                                      ).toLocaleDateString("fr-FR")}
                                      {e.lf_collections?.title
                                        ? ` · ${e.lf_collections.title}`
                                        : ""}
                                    </span>
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
                                  <p className="font-body text-[13.5px] text-ink leading-relaxed">
                                    {e.content}
                                  </p>

                                  {shareOpenFor === e.id && (
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
                                              onClick={() =>
                                                partager(e.id, c.id)
                                              }
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
                              ))}
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
              <div
                key={c.id}
                className="rounded-[3px] px-4 py-3 bg-paper-card/60"
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
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
