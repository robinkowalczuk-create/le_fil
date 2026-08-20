import React, { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

const FREQUENCES = [
  { label: "Jour", value: "jour" },
  { label: "Semaine", value: "semaine" },
  { label: "Mois", value: "mois" },
  { label: "Année", value: "annee" },
];

const SWATCHES = ["#7C8471", "#A5822F", "#5C6B73", "#8C2F26", "#6B5B73"];

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function Accueil({ session }) {
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [templates, setTemplates] = useState([]);

  const [texte, setTexte] = useState("");
  const [freqSelect, setFreqSelect] = useState(["jour"]);
  const [collectionId, setCollectionId] = useState("");
  const [dateEntree, setDateEntree] = useState(todayISO());
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState("");

  // formulaire "nouvelle collection"
  const [showNewCollection, setShowNewCollection] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newTemplateKey, setNewTemplateKey] = useState("");
  const [creatingCollection, setCreatingCollection] = useState(false);

  const chargerCollections = async () => {
    setLoadingCollections(true);
    const { data, error } = await supabase
      .from("lf_collections")
      .select("id, title, template_key, started_at")
      .eq("user_id", session.user.id)
      .eq("status", "active")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      setCollections([]);
      setLoadingCollections(false);
      return;
    }

    const withCounts = await Promise.all(
      (data || []).map(async (c, i) => {
        const { count } = await supabase
          .from("lf_entries")
          .select("id", { count: "exact", head: true })
          .eq("collection_id", c.id);
        return { ...c, entrees: count || 0, swatch: SWATCHES[i % SWATCHES.length] };
      })
    );

    setCollections(withCounts);
    setLoadingCollections(false);
  };

  const chargerTemplates = async () => {
    const { data, error } = await supabase
      .from("lf_collection_templates")
      .select("key, label, icon");
    if (!error) setTemplates(data || []);
  };

  useEffect(() => {
    chargerCollections();
    chargerTemplates();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleFreq = (f) => {
    setFreqSelect((prev) =>
      prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]
    );
  };

  const handleSelectChange = (e) => {
    const val = e.target.value;
    if (val === "__new__") {
      setShowNewCollection(true);
      setCollectionId("");
    } else {
      setShowNewCollection(false);
      setCollectionId(val);
    }
  };

  const creerCollection = async () => {
    if (!newTitle.trim()) return;
    setCreatingCollection(true);
    const { data, error } = await supabase
      .from("lf_collections")
      .insert({
        user_id: session.user.id,
        title: newTitle.trim(),
        template_key: newTemplateKey || null,
        status: "active",
        started_at: todayISO(),
      })
      .select()
      .single();

    setCreatingCollection(false);

    if (error) {
      console.error(error);
      setFeedback("Erreur à la création de la collection.");
      return;
    }

    setNewTitle("");
    setNewTemplateKey("");
    setShowNewCollection(false);
    await chargerCollections();
    setCollectionId(data.id);
  };

  const ajouterEntree = async () => {
    if (!texte.trim()) return;
    setSaving(true);
    setFeedback("");

    const { error } = await supabase.from("lf_entries").insert({
      user_id: session.user.id,
      collection_id: collectionId || null,
      content: texte.trim(),
      event_date: dateEntree,
      frequencies: freqSelect,
    });

    setSaving(false);

    if (error) {
      console.error(error);
      setFeedback("Erreur, réessaie.");
      return;
    }

    setTexte("");
    setDateEntree(todayISO());
    setFeedback("Ajouté au fil.");
    chargerCollections();
    setTimeout(() => setFeedback(""), 2000);
  };

  return (
    <div className="max-w-md mx-auto relative pb-28">
      <svg
        className="absolute left-8 top-0 pointer-events-none"
        width="2"
        height="100%"
        style={{ minHeight: "900px" }}
      >
        <line
          x1="1"
          y1="0"
          x2="1"
          y2="100%"
          stroke="#8C2F26"
          strokeWidth="1.5"
          strokeDasharray="1 7"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>

      <header className="relative px-6 pt-10 pb-8">
        <div className="ml-6">
          <p className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-faint">
            {new Date().toLocaleDateString("fr-FR", {
              weekday: "short",
              day: "numeric",
              month: "long",
            })}
          </p>
          <h1 className="font-display text-[32px] leading-tight mt-1 text-ink">
            Bonjour.
          </h1>
          <p className="font-body text-[14px] mt-2 leading-relaxed text-ink-muted">
            Qu'est-ce qui vaut la peine d'être retenu, aujourd'hui&nbsp;?
          </p>
        </div>
      </header>

      <section className="relative px-6 mb-9">
        <div className="ml-6 flex items-center gap-2 mb-4">
          <span className="inline-block w-2 h-2 rounded-full bg-thread" />
          <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink">
            En cours
          </h2>
        </div>

        {loadingCollections ? (
          <p className="ml-6 font-body text-[13px] text-ink-faint">
            Chargement...
          </p>
        ) : collections.length === 0 ? (
          <p className="ml-6 font-body text-[13px] text-ink-faint italic">
            Aucune thématique en cours. Crée-en une depuis la saisie
            ci-dessous.
          </p>
        ) : (
          <div className="fil-scroll flex gap-3 overflow-x-auto pl-6 pr-2 -mr-6 snap-x">
            {collections.map((c) => (
              <div
                key={c.id}
                className="snap-start shrink-0 w-[168px] rounded-[3px] overflow-hidden bg-paper-card"
              >
                <div
                  className="h-[86px]"
                  style={{
                    background: `linear-gradient(160deg, ${c.swatch} 0%, ${c.swatch}CC 100%)`,
                  }}
                />
                <div className="p-3">
                  <p className="font-display text-[16px] leading-snug text-ink">
                    {c.title}
                  </p>
                  <div className="flex items-center justify-between mt-2">
                    <p className="font-body text-[11px] text-ink-muted">
                      {c.template_key || "Personnel"}
                    </p>
                    <p className="font-mono text-[10px] text-ink-faint">
                      {c.entrees} entrées
                    </p>
                  </div>
                </div>
              </div>
            ))}
            <div className="shrink-0 w-4" />
          </div>
        )}
      </section>

      <section className="relative px-6 mb-10">
        <div className="ml-6 rounded-[3px] p-4 relative bg-paper-card-alt">
          <span
            className="absolute rounded-full bg-thread border-2 border-paper"
            style={{ left: "-30px", top: "22px", width: "9px", height: "9px" }}
          />

          <textarea
            value={texte}
            onChange={(e) => setTexte(e.target.value)}
            placeholder="Écrire dans le fil..."
            rows={3}
            className="font-body w-full bg-transparent resize-none outline-none text-[15px] leading-relaxed placeholder:italic text-ink"
          />

          <div className="flex flex-wrap gap-1.5 mt-3">
            {FREQUENCES.map((f) => {
              const active = freqSelect.includes(f.value);
              return (
                <button
                  key={f.value}
                  onClick={() => toggleFreq(f.value)}
                  className={`font-mono text-[10px] tracking-[0.08em] uppercase px-2.5 py-1 rounded-full border transition-colors ${
                    active
                      ? "bg-thread text-paper border-thread"
                      : "text-ink-muted border-ink-faint"
                  }`}
                >
                  {f.label}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 mt-3">
            <span className="font-mono text-[10px] tracking-wide text-ink-faint uppercase">
              Date
            </span>
            <input
              type="date"
              value={dateEntree}
              max={todayISO()}
              onChange={(e) => setDateEntree(e.target.value)}
              className="font-mono text-[12px] bg-transparent outline-none text-ink-muted border-b border-ink-faint/40"
            />
          </div>

          <div className="mt-3">
            <select
              value={showNewCollection ? "__new__" : collectionId}
              onChange={handleSelectChange}
              className="font-mono text-[10.5px] tracking-wide text-ink-muted bg-transparent outline-none"
            >
              <option value="">Sans collection</option>
              {collections.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
              <option value="__new__">+ Nouvelle collection</option>
            </select>
          </div>

          {showNewCollection && (
            <div className="mt-3 p-3 rounded-[3px] bg-paper space-y-2">
              <input
                type="text"
                placeholder="Titre de la collection"
                value={newTitle}
                onChange={(e) => setNewTitle(e.target.value)}
                className="font-body w-full px-3 py-2 rounded-[3px] bg-paper-card outline-none text-[13px] text-ink placeholder:text-ink-faint"
              />
              <select
                value={newTemplateKey}
                onChange={(e) => setNewTemplateKey(e.target.value)}
                className="font-mono text-[10.5px] tracking-wide text-ink-muted bg-transparent outline-none"
              >
                <option value="">Personnalisé</option>
                {templates.map((t) => (
                  <option key={t.key} value={t.key}>
                    {t.icon} {t.label}
                  </option>
                ))}
              </select>
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowNewCollection(false)}
                  className="font-mono text-[10px] text-ink-faint uppercase"
                >
                  Annuler
                </button>
                <button
                  onClick={creerCollection}
                  disabled={creatingCollection || !newTitle.trim()}
                  className="font-body text-[12px] font-medium px-3 py-1.5 rounded-full bg-thread text-paper disabled:opacity-50"
                >
                  {creatingCollection ? "..." : "Créer"}
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center justify-between mt-4 pt-3 border-t border-ink-faint/20">
            {feedback && (
              <span className="font-mono text-[10px] text-ink-faint">
                {feedback}
              </span>
            )}
            <button
              onClick={ajouterEntree}
              disabled={saving || !texte.trim()}
              className="font-body text-[12.5px] font-medium px-4 py-1.5 rounded-full bg-thread text-paper disabled:opacity-50 ml-auto"
            >
              {saving ? "..." : "Ajouter au fil"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
