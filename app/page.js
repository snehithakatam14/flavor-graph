'use client';
import { useState, useEffect, useRef } from 'react';

// ── Decorative ingredient border strip ────────────────────────────────────────
const EMOJIS = ['🍋', '🧄', '🫚', '🧅', '🌿', '🫑', '🍅', '🥩', '🧂', '🍯', '🥕', '🌶️', '🥦', '🫙', '🧀', '🥚', '🍊', '🥑', '🫐', '🍇', '🥒', '🧁', '🍄', '🧆'];

function IngredientBorder() {
  // Repeat enough times to always fill any screen width
  const repeated = [...EMOJIS, ...EMOJIS, ...EMOJIS, ...EMOJIS];
  return (
    <div className="w-full overflow-hidden py-2 select-none">
      <div className="flex gap-4 text-xl">
        {repeated.map((e, i) => (
          <span key={i} className="shrink-0">{e}</span>
        ))}
      </div>
    </div>
  );
}

// ── Small reusable components ──────────────────────────────────────────────────
function Badge({ children, color = 'amber' }) {
  const colors = {
    emerald: 'bg-emerald-100 text-emerald-800 border border-emerald-200',
    amber:   'bg-amber-100 text-amber-800 border border-amber-200',
    sky:     'bg-sky-100 text-sky-800 border border-sky-200',
    violet:  'bg-violet-100 text-violet-800 border border-violet-200',
    rose:    'bg-rose-100 text-rose-800 border border-rose-200',
    orange:  'bg-orange-100 text-orange-800 border border-orange-200',
  };
  return (
    <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-semibold ${colors[color] ?? colors.amber}`}>
      {children}
    </span>
  );
}

function ScoreBar({ score }) {
  const pct = Math.min(100, Math.round(score * 100));
  return (
    <div className="flex items-center gap-2">
      <div className="flex-1 h-2 bg-amber-100 rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs text-amber-600 font-mono w-10 text-right">{score.toFixed ? score.toFixed(3) : score}</span>
    </div>
  );
}

function Spinner() {
  return (
    <div className="flex justify-center py-10">
      <div className="w-7 h-7 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-10 text-center text-amber-700/60 text-sm italic">{message}</div>
  );
}

// ── Autocomplete ingredient search ─────────────────────────────────────────────
function IngredientSearch({ onSelect, placeholder = 'Search ingredient…', className = '' }) {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState([]);
  const [open, setOpen] = useState(false);
  const timer = useRef(null);
  const wrapRef = useRef(null);

  useEffect(() => {
    clearTimeout(timer.current);
    if (query.length < 2) { setSuggestions([]); setOpen(false); return; }
    timer.current = setTimeout(async () => {
      const res = await fetch(`/api/ingredients?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setSuggestions(data);
      setOpen(data.length > 0);
    }, 250);
  }, [query]);

  useEffect(() => {
    function handler(e) { if (wrapRef.current && !wrapRef.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  function pick(name) {
    setQuery('');
    setSuggestions([]);
    setOpen(false);
    onSelect(name);
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder={placeholder}
        className="w-full px-5 py-3 rounded-2xl border-2 border-amber-200 bg-white/80 focus:outline-none focus:border-amber-400 focus:bg-white text-sm shadow-sm placeholder-amber-300 transition-all"
      />
      {open && (
        <ul className="absolute z-20 top-full left-0 right-0 mt-1.5 bg-white border-2 border-amber-100 rounded-2xl shadow-lg overflow-hidden">
          {suggestions.map(s => (
            <li
              key={s}
              onMouseDown={() => pick(s)}
              className="px-5 py-2.5 text-sm cursor-pointer hover:bg-amber-50 capitalize text-amber-900 transition-colors"
            >
              {s}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Tab 1: Pairing Explorer ────────────────────────────────────────────────────
function PairingExplorer() {
  const [selected, setSelected] = useState(null);
  const [pairings, setPairings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [chainTarget, setChainTarget] = useState(null);
  const [chain, setChain] = useState([]);
  const [chainLoading, setChainLoading] = useState(false);
  const chainRef = useRef(null);

  async function loadPairings(name) {
    setSelected(name);
    setChainTarget(null);
    setChain([]);
    setLoading(true);
    const res = await fetch(`/api/pairings?ingredient=${encodeURIComponent(name)}`);
    setPairings(await res.json());
    setLoading(false);
  }

  async function loadChain(name) {
    setChainTarget(name);
    setChainLoading(true);
    setTimeout(() => chainRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
    const res = await fetch(`/api/explore?ingredient=${encodeURIComponent(name)}`);
    const data = await res.json();
    setChain(Array.isArray(data) ? data : []);
    setChainLoading(false);
  }

  return (
    <div className="space-y-6">
      {/* Search */}
      <div className="mt-4">
        <p className="text-sm text-amber-700/70 mb-3 text-center">
          Search an ingredient to discover what it pairs with across 39k recipes
        </p>
        <IngredientSearch onSelect={loadPairings} placeholder="e.g. garlic, lemon, ginger…" />
      </div>

      {/* Direct pairings */}
      {selected && (
        <div>
          <h2 className="text-sm font-bold text-amber-900 mb-3 flex items-center gap-2">
            <span className="bg-amber-200 text-amber-900 px-3 py-1 rounded-full capitalize">{selected}</span>
            <span className="text-amber-500">→ pairs well with</span>
          </h2>
          {loading ? <Spinner /> : pairings.length === 0 ? (
            <EmptyState message="No pairings found for this ingredient." />
          ) : (
            <div className="grid gap-2">
              {pairings.map(p => (
                <div key={p.name} className="bg-white/70 rounded-2xl border-2 border-amber-100 px-4 py-3 shadow-sm hover:border-amber-300 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-semibold capitalize text-amber-900">{p.name}</span>
                    <div className="flex items-center gap-2">
                      <Badge color="sky">{p.count} recipes</Badge>
                      <button
                        onClick={() => loadChain(p.name)}
                        className="text-xs text-orange-500 hover:text-orange-700 font-bold transition-colors"
                      >
                        Explore chain →
                      </button>
                    </div>
                  </div>
                  <ScoreBar score={p.score} />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Chain explorer */}
      {chainTarget && (
        <div ref={chainRef} className="rounded-2xl border-2 border-orange-200 bg-orange-50/60 p-5">
          <div className="flex items-center gap-2 mb-2">
            <h2 className="text-sm font-bold text-orange-900">
              Chain from <span className="bg-orange-200 px-2 py-0.5 rounded-full capitalize">{chainTarget}</span>
            </h2>
            <Badge color="violet">2 hops</Badge>
          </div>
          <p className="text-xs text-orange-700/70 mb-4">
            These ingredients connect to <em>{chainTarget}</em> through a pairing chain — even if they&apos;ve never appeared in the same recipe together.
          </p>
          {chainLoading ? <Spinner /> : chain.length === 0 ? (
            <EmptyState message="No chain results found." />
          ) : (
            <div className="flex flex-wrap gap-2">
              {chain.map(c => (
                <span
                  key={c.name}
                  className="bg-white border-2 border-orange-200 rounded-full px-3 py-1.5 text-sm capitalize text-orange-900 font-medium shadow-sm"
                >
                  {c.name}
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Tab 2: Recipe Finder ───────────────────────────────────────────────────────
function RecipeFinder() {
  const [myIngredients, setMyIngredients] = useState([]);
  const [recipes, setRecipes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);

  function addIngredient(name) {
    if (!myIngredients.includes(name)) setMyIngredients(prev => [...prev, name]);
  }
  function removeIngredient(name) {
    setMyIngredients(prev => prev.filter(i => i !== name));
  }

  async function findRecipes() {
    if (myIngredients.length === 0) return;
    setLoading(true);
    setSearched(true);
    const res = await fetch(`/api/recipes?ingredients=${encodeURIComponent(myIngredients.join(','))}`);
    const data = await res.json();
    setRecipes(Array.isArray(data) ? data : []);
    setLoading(false);
  }

  const cuisineColors = {
    italian: 'emerald', mexican: 'amber', indian: 'orange',
    chinese: 'sky', french: 'violet', thai: 'amber',
    korean: 'rose', japanese: 'rose', greek: 'sky',
  };

  return (
    <div className="space-y-5">
      <div className="mt-4">
        <p className="text-sm text-amber-700/70 mb-3 text-center">
          Add ingredients you have — we&apos;ll suggest recipes via pairing chains
        </p>
        <IngredientSearch onSelect={addIngredient} placeholder="Add an ingredient…" />
      </div>

      {myIngredients.length > 0 && (
        <div>
          <p className="text-xs text-amber-600 font-semibold mb-2 uppercase tracking-wide">Your ingredients</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {myIngredients.map(i => (
              <span key={i} className="flex items-center gap-1.5 bg-amber-100 border-2 border-amber-300 text-amber-900 rounded-full px-3 py-1 text-sm capitalize font-medium">
                {i}
                <button onClick={() => removeIngredient(i)} className="text-amber-400 hover:text-amber-700 text-xs leading-none">✕</button>
              </span>
            ))}
          </div>
          <button
            onClick={findRecipes}
            disabled={loading}
            className="px-6 py-2.5 bg-amber-400 hover:bg-amber-500 text-white text-sm font-bold rounded-full shadow transition-colors disabled:opacity-50"
          >
            {loading ? 'Finding…' : 'Find recipes 🍳'}
          </button>
        </div>
      )}

      {loading && <Spinner />}
      {!loading && searched && recipes.length === 0 && (
        <EmptyState message="No recipes found. Try adding more ingredients." />
      )}
      {!loading && recipes.length > 0 && (
        <div className="space-y-3">
          <p className="text-xs text-amber-600 font-semibold uppercase tracking-wide">{recipes.length} recipes found via pairing chains</p>
          {recipes.map((r, idx) => {
            const cuisine = r.cuisine ? r.cuisine.charAt(0).toUpperCase() + r.cuisine.slice(1) : 'International';
            const topIngredients = r.matchedVia.slice(0, 2).map(i => i.charAt(0).toUpperCase() + i.slice(1)).join(' & ');
            const recipeId = r.name.replace('Recipe ', '#');
            return (
              <div key={idx} className="bg-white/70 rounded-2xl border-2 border-amber-100 px-4 py-3 shadow-sm hover:border-amber-300 transition-colors">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-sm font-bold text-amber-900">
                    {cuisine} Recipe
                    <span className="text-amber-300 font-normal text-xs ml-1">{recipeId}</span>
                  </span>
                  <Badge color={cuisineColors[r.cuisine?.toLowerCase()] ?? 'amber'}>{cuisine}</Badge>
                </div>
                <p className="text-xs text-amber-700 mb-1 capitalize">
                  <span className="font-semibold">{topIngredients}</span>
                </p>
                <p className="text-xs text-amber-500">
                  via {r.matchedVia.slice(0, 4).join(', ')}{r.matchedVia.length > 4 ? '…' : ''}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ── Main page ──────────────────────────────────────────────────────────────────
export default function Home() {
  const [tab, setTab] = useState('explore');

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFFBEB' }}>

      {/* Top ingredient border */}
      <div style={{ background: '#FEF3C7', borderBottom: '2px dashed #FCD34D' }}>
        <IngredientBorder />
      </div>

      {/* Header */}
      <header className="sticky top-0 z-10" style={{ background: '#FFFBEB', borderBottom: '2px dashed #FCD34D' }}>
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-black tracking-tight" style={{ color: '#92400E' }}>
              🍳 Flavor Graph
            </h1>
          </div>
          <nav className="flex gap-1 rounded-full p-1" style={{ background: '#FDE68A' }}>
            {[
              { id: 'explore', label: 'Pairings' },
              { id: 'recipes', label: 'Recipes' },
            ].map(t => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className="px-4 py-1.5 rounded-full text-xs font-bold transition-all"
                style={tab === t.id
                  ? { background: '#F59E0B', color: 'white', boxShadow: '0 1px 4px rgba(0,0,0,0.15)' }
                  : { color: '#92400E' }
                }
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-2xl mx-auto px-4 py-6 w-full flex-1">
        {tab === 'explore' && <PairingExplorer />}
        {tab === 'recipes' && <RecipeFinder />}
      </main>

      {/* Bottom ingredient border / footer */}
      <div className="mt-auto" style={{ background: '#FEF3C7', borderTop: '2px dashed #FCD34D' }}>
        <IngredientBorder />
        <p className="text-center text-xs pb-3" style={{ color: '#B45309' }}>
          39k recipes · 3k ingredients · 113k pairing relationships · CognoDB
        </p>
      </div>
    </div>
  );
}
