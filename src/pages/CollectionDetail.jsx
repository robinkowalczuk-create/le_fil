import React, { useEffect, useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { supabase } from "../lib/supabaseClient";

export default function CollectionDetail({ session }) {
  const { id } = useParams();
  const navigate = useNavigate();

  const [collection, setCollection] = useState(null);
  const [entries, setEntries] = useState([]);
  const [photos, setPhotos] = useState([]);
  const [template, setTemplate] = useState(null);
  const [loading, setLoading] = useState(true);
  const [finishing, setFinishing] = useState(false);

  const [circles, setCircles] = useState([]);
  const [showShare, setShowShare] = useState(false);
  const [shareFeedback, setShareFeedback] = useState("");

  const charger = async () => {
    setLoading(true);

    const { data: col, error: colError } = await supabase
      .from("lf_collections")
      .select("*")
      .eq("id", id)
      .eq("user_id", session.user.id)
      .single();

    if (colError || !col) {
      console.error(colError);
      setLoading(false);
      return;
    }
    setCollection(col);

    if (col.template_key) {
      const { data: tpl } = await supabase
        .from("lf_collection_templates")
        .select("key, label, icon, fields")
        .eq("key", col.template_key)
        .single();
      setTemplate(tpl || null);
    }

    const { data: entriesData } = await supabase
      .from("lf_entries")
      .select("id, content, event_date, frequencies")
      .eq("collection_id", id)
      .order("event_date", { ascending: false });
    setEntries(entriesData || []);

    const { data: photosData } = await supabase
      .from("lf_entry_photos")
      .select("id, url, position")
      .eq("collection_id", id)
      .order("position", { ascending: true });

    const withSignedUrls = await Promise.all(
      (photosData || []).map(async (p) => {
        const { data: signed } = await supabase.storage
          .from("fil-photos")
          .createSignedUrl(p.url, 3600);
        return { ...p, signedUrl: signed?.signedUrl };
      })
    );
    setPhotos(withSignedUrls);

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
  }, [id]);

  const terminerCollection = async () => {
    setFinishing(true);
    const { error } = await supabase
      .from("lf_collections")
      .update({ status: "completed", ended_at: new Date().toISOString().slice(0, 10) })
      .eq("id", id);
    setFinishing(false);
    if (error) {
      console.error(error);
      return;
    }
    charger();
  };

  const partagerCollection = async (circleId) => {
    const { error } = await supabase.from("lf_shares").insert({
      owner_id: session.user.id,
      collection_id: id,
      circle_id: circleId,
    });
    setShareFeedback(error ? "Déjà partagé ou erreur." : "Partagé.");
    setTimeout(() => {
      setShowShare(false);
      setShareFeedback("");
    }, 1200);
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto px-6 pt-10">
        <p className="font-body text-[13px] text-ink-faint">Chargement...</p>
      </div>
    );
  }

  if (!collection) {
    return (
      <div className="max-w-md mx-auto px-6 pt-10">
        <p className="font-body text-[13px] text-ink-faint">
          Collection introuvable.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-md md:max-w-3xl mx-auto px-6 pt-10 pb-28 md:pb-16">
      <button
        onClick={() => navigate(-1)}
        className="font-mono text-[10px] uppercase text-ink-faint mb-4"
      >
        ← Retour
      </button>

      <div className="flex items-start justify-between mb-1">
        <h1 className="font-display text-[28px] text-ink">
          {template?.icon ? `${template.icon} ` : ""}
          {collection.title}
        </h1>
        <span
          className={`font-mono text-[9px] uppercase px-2 py-1 rounded-full border ${
            collection.status === "active"
              ? "border-thread text-thread"
              : "border-ink-faint text-ink-faint"
          }`}
        >
          {collection.status === "active" ? "En cours" : "Terminée"}
        </span>
      </div>

      <p className="font-mono text-[10.5px] text-ink-faint mb-4">
        {collection.started_at &&
          new Date(collection.started_at).toLocaleDateString("fr-FR")}
        {collection.ended_at &&
          ` → ${new Date(collection.ended_at).toLocaleDateString("fr-FR")}`}
      </p>

      {template?.fields?.length > 0 &&
        collection.extra_fields &&
        Object.keys(collection.extra_fields).length > 0 && (
          <div className="mb-6 space-y-1">
            {template.fields.map((f) =>
              collection.extra_fields[f.key] ? (
                <p key={f.key} className="font-body text-[13px] text-ink-muted">
                  <span className="text-ink-faint">{f.label} : </span>
                  {collection.extra_fields[f.key]}
                </p>
              ) : null
            )}
          </div>
        )}

      <div className="flex gap-2 mb-8">
        {collection.status === "active" && (
          <button
            onClick={terminerCollection}
            disabled={finishing}
            className="font-mono text-[10px] uppercase px-3 py-1.5 rounded-full border border-ink-faint text-ink-muted"
          >
            {finishing ? "..." : "Terminer cette collection"}
          </button>
        )}
        <button
          onClick={() => setShowShare(!showShare)}
          className="font-mono text-[10px] uppercase px-3 py-1.5 rounded-full border border-thread text-thread"
        >
          Partager
        </button>
      </div>

      {showShare && (
        <div className="mb-8 p-3 rounded-[3px] bg-paper-card">
          {circles.length === 0 ? (
            <p className="font-mono text-[10px] text-ink-faint">
              Crée d'abord un cercle dans l'onglet Cercles.
            </p>
          ) : (
            <div className="flex flex-wrap gap-1.5">
              {circles.map((c) => (
                <button
                  key={c.id}
                  onClick={() => partagerCollection(c.id)}
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

      {photos.length > 0 && (
        <div className="mb-8">
          <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-faint mb-3">
            Galerie
          </h2>
          <div className="grid grid-cols-3 md:grid-cols-5 gap-1.5">
            {photos.map((p) => (
              <div
                key={p.id}
                className="aspect-square rounded-[3px] overflow-hidden bg-paper-card"
              >
                {p.signedUrl && (
                  <img
                    src={p.signedUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      <div>
        <h2 className="font-mono text-[11px] tracking-[0.18em] uppercase text-ink-faint mb-3">
          Entrées
        </h2>
        {entries.length === 0 ? (
          <p className="font-body text-[13px] text-ink-faint italic">
            Aucune entrée dans cette collection pour l'instant.
          </p>
        ) : (
          <div className="space-y-2">
            {entries.map((e) => (
              <div key={e.id} className="bg-paper-card rounded-[3px] p-3">
                <p className="font-mono text-[10px] text-ink-faint mb-1">
                  {new Date(e.event_date).toLocaleDateString("fr-FR")}
                </p>
                <p className="font-body text-[13.5px] text-ink leading-relaxed">
                  {e.content}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
