import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

const MOIS = [
  "Janvier", "Février", "Mars", "Avril", "Mai", "Juin",
  "Juillet", "Août", "Septembre", "Octobre", "Novembre", "Décembre",
];

const FREQ_LABEL = { jour: "Jour", semaine: "Semaine", mois: "Mois", annee: "Année" };

function getISOWeek(dateStr) {
  const d = new Date(dateStr + "T00:00:00Z");
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
}

function labelJour(dateStr) {
  return new Date(dateStr + "T00:00:00").toLocaleDateString("fr-FR", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

const styleParFrequence = {
  jour: "bg-paper border-l-2 border-ink-faint/40",
  semaine: "bg-paper-card",
  mois: "bg-paper-card-alt",
  annee: "bg-thread/10 border border-thread/30",
};

export default function Passe({ session }) {
  const [entries, setEntries] = useState([]);
  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [collectionsArchivees, setCollectionsArchivees] = useState([]);
  const [circles, setCircles] = useState([]);

  const [expandedYear, setExpandedYear] = useState(null);
  const [expandedMonth, setExpandedMonth] = useState(null);
  const [expandedWeek, setExpandedWeek] = useState(null);

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

  // Construit l'arbre Année > Mois > Semaine > Jour
  const arbre = useMemo(() => {
    const parAnnee = {};
    for (const e of entries) {
      const d = new Date(e.event_date + "T00:00:00");
      const y = d.getFullYear();
      parAnnee[y] = parAnnee[y] || { annee: [], mois: {} };

      if (e.frequency === "annee") {
        parAnnee[y].annee.push(e);
        continue;
      }

      const m = d.getMonth();
      parAnnee[y].mois[m] = parAnnee[y].mois[m] || { mois: [], semaines: {} };

      if (e.frequency === "mois") {
        parAnnee[y].mois[m].mois.push(e);
        continue;
      }

      const w = getISOWeek(e.event_date);
      parAnnee[y].mois[m].semaines[w] = parAnnee[y].mois[m].semaines[w] || {
        semaine: [],
        jours: [],
      };

      if (e.frequency === "semaine") {
        parAnnee[y].mois[m].semaines[w].semaine.push(e);
      } else {
        parAnnee[y].mois[m].semaines[w].jours.push(e);
      }
    }
    return parAnnee;
  }, [entries]);

  const annees = Object.keys(arbre).sort((a, b) => b - a);

  const compterAnnee = (y) => {
    const bloc = arbre[y];
    let total = bloc.annee.length;
    for (const m of Object.keys(bloc.mois)) {
      total += bloc.mois[m].mois.length;
      for (const w of Object.keys(bloc.mois[m].semaines)) {
        total += bloc.mois[m].semaines[w].semaine.length;
        total += bloc.mois[m].semaines[w].jours.length;
      }
    }
    return total;
  };

  const compterMois = (y, m) => {
    const bloc = arbre[y].mois[m];
    let total = bloc.mois.length;
    for (const w of Object.keys(bloc.semaines)) {
      total += bloc.semaines[w].semaine.length;
      total += bloc.semaines[w].jours.length;
    }
    return total;
  };

  const compterSemaine = (y, m, w) => {
    const bloc = arbre[y].mois[m].semaines[w];
    return bloc.semaine.length + bloc.jours.length;
  };

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

  const EntryCard = ({ e, labelOverride }) => {
    const isEditing = editingId === e.id;
    return (
      <div
        key={e.id}
        className={`rounded-[3px] p-3 ${styleParFrequence[e.frequency]}`}
      >
        <div className="flex items-center justify-between mb-1">
          <span className="font-mono text-[10px] text-ink-faint">
            {labelOverride}
            {e.lf_collections?.title ? ` · ${e.lf_collections.title}` : ""}
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
                  setShareOpenFor(shareOpenFor === e.id ? null : e.id)
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
              onChange={(ev) => setEditContent(ev.target.value)}
              rows={3}
              className="font-body w-full bg-paper rounded-[3px] p-2 outline-none text-[13.5px] text-ink resize-none"
            />
            <div className="flex flex-wrap gap-1.5">
              {Object.entries(FREQ_LABEL).map(([val, lbl]) => (
                <button
                  key={val}
                  onClick={() => setEditFrequency(val)}
                  className={`font-mono text-[9px] uppercase px-2 py-1 rounded-full border ${
                    editFrequency === val
                      ? "bg-thread text-paper border-thread"
                      : "text-ink-muted border-ink-faint"
                  }`}
                >
                  {lbl}
                </button>
              ))}
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <input
                type="date"
                value={editDate}
                onChange={(ev) => setEditDate(ev.target.value)}
                className="font-mono text-[11px] bg-transparent outline-none text-ink-muted border-b border-ink-faint/40"
              />
              <select
                value={editCollectionId}
                onChange={(ev) => setEditCollectionId(ev.target.value)}
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
                Crée d'abord un cercle dans l'onglet Cercles.
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
  };

  return (
    <div className="max-w-md md:max-w-4xl mx-auto px-6 pt-10 pb-28 md:pb-16">
      <h1 className="font-display text-[28px] text-ink mb-1">
        Consulter le passé
      </h1>
      <p className="font-body text-[13px] text-ink-muted mb-8">
        Les jours dans leur semaine, les semaines dans leur mois, les mois
        dans leur année.
      </p>

      {loading ? (
        <p className="font-body text-[13px] text-ink-faint">Chargement...</p>
      ) : annees.length === 0 ? (
        <p className="font-body text-[13px] text-ink-faint italic mb-10">
          Rien à relire pour l'instant.
        </p>
      ) : (
        <div className="space-y-3 mb-10 md:max-w-2xl">
          {annees.map((y) => {
            const isYearOpen = expandedYear === y;
            const moisKeys = Object.keys(arbre[y].mois).sort((a, b) => b - a);

            return (
              <div
                key={y}
                className="rounded-[3px] bg-paper-card/60 overflow-hidden"
              >
                <button
                  onClick={() => {
                    setExpandedYear(isYearOpen ? null : y);
                    setExpandedMonth(null);
                    setExpandedWeek(null);
                  }}
                  className="w-full flex items-center justify-between px-4 py-3"
                >
                  <span className="font-display text-[18px] text-ink">
                    {y}
                  </span>
                  <span className="font-mono text-[10px] text-ink-faint">
                    {compterAnnee(y)} entrées {isYearOpen ? "▲" : "▼"}
                  </span>
                </button>

                {isYearOpen && (
                  <div className="px-4 pb-4 space-y-2">
                    <button
                      disabled
                      title="Bientôt disponible"
                      className="font-mono text-[10px] tracking-wide uppercase px-2.5 py-1 rounded-full border border-ink-faint/40 text-ink-faint opacity-60"
                    >
                      ✦ Résumé (bientôt)
                    </button>

                    {arbre[y].annee.map((e) => (
                      <EntryCard key={e.id} e={e} labelOverride={y} />
                    ))}

                    {moisKeys.map((m) => {
                      const monthKey = `${y}-${m}`;
                      const isMonthOpen = expandedMonth === monthKey;
                      const semaineKeys = Object.keys(
                        arbre[y].mois[m].semaines
                      ).sort((a, b) => b - a);

                      return (
                        <div
                          key={m}
                          className="rounded-[3px] bg-paper overflow-hidden"
                        >
                          <button
                            onClick={() => {
                              setExpandedMonth(
                                isMonthOpen ? null : monthKey
                              );
                              setExpandedWeek(null);
                            }}
                            className="w-full flex items-center justify-between px-3 py-2.5"
                          >
                            <span className="font-body text-[14px] text-ink">
                              {MOIS[m]}
                            </span>
                            <span className="font-mono text-[10px] text-ink-faint">
                              {compterMois(y, m)} {isMonthOpen ? "▲" : "▼"}
                            </span>
                          </button>

                          {isMonthOpen && (
                            <div className="px-3 pb-3 space-y-2">
                              {arbre[y].mois[m].mois.map((e) => (
                                <EntryCard
                                  key={e.id}
                                  e={e}
                                  labelOverride={`${MOIS[m]} ${y}`}
                                />
                              ))}

                              {semaineKeys.map((w) => {
                                const weekKey = `${y}-${m}-${w}`;
                                const isWeekOpen = expandedWeek === weekKey;
                                const bloc = arbre[y].mois[m].semaines[w];

                                return (
                                  <div
                                    key={w}
                                    className="rounded-[3px] bg-paper-card/40 overflow-hidden"
                                  >
                                    <button
                                      onClick={() =>
                                        setExpandedWeek(
                                          isWeekOpen ? null : weekKey
                                        )
                                      }
                                      className="w-full flex items-center justify-between px-3 py-2"
                                    >
                                      <span className="font-mono text-[11px] text-ink-muted">
                                        Semaine {w}
                                      </span>
                                      <span className="font-mono text-[10px] text-ink-faint">
                                        {compterSemaine(y, m, w)}{" "}
                                        {isWeekOpen ? "▲" : "▼"}
                                      </span>
                                    </button>

                                    {isWeekOpen && (
                                      <div className="px-3 pb-3 space-y-2">
                                        {bloc.semaine.map((e) => (
                                          <EntryCard
                                            key={e.id}
                                            e={e}
                                            labelOverride={`Semaine ${w} · ${y}`}
                                          />
                                        ))}
                                        {bloc.jours.map((e) => (
                                          <EntryCard
                                            key={e.id}
                                            e={e}
                                            labelOverride={labelJour(
                                              e.event_date
                                            )}
                                          />
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
          <div className="space-y-2 md:grid md:grid-cols-2 lg:grid-cols-3 md:gap-3 md:space-y-0">
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
