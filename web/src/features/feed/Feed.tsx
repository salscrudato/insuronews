import { useEffect, useRef, useState } from "react";
import { collection, getDocs, limit, orderBy, query, startAfter, where } from "firebase/firestore";
import { db } from "../../lib/firebase";
import type { NewsDoc, Category } from "../../lib/types";
import NewsCard from "./NewsCard";
import FilterBar from "./FilterBar";

const PAGE = 20;

export default function Feed() {
  const [items, setItems] = useState<NewsDoc[]>([]);
  const [loading, setLoading] = useState(false);
  const [cursor, setCursor] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);
  const [filters, setFilters] = useState<Category[]>([]);

  const load = async () => {
    if (loading || !hasMore) return;
    setLoading(true);
    try {
      const col = collection(db, "news");
      const base = filters.length
        ? query(col, where("categories", "array-contains-any", filters), orderBy("publishedAt", "desc"), limit(PAGE))
        : query(col, orderBy("publishedAt", "desc"), limit(PAGE));
      const q = cursor ? query(col, where("categories", "array-contains-any", filters.length ? filters : undefined), orderBy("publishedAt", "desc"), startAfter(cursor), limit(PAGE)) : base;
      const snap = await getDocs(q);
      const docs = snap.docs.map((d) => ({ id: d.id, ...(d.data() as any) })) as NewsDoc[];
      setItems(prev => [...prev, ...docs]);
      setCursor(snap.docs[snap.docs.length - 1]);
      setHasMore(snap.size === PAGE);
    } catch (error) {
      console.error("Error loading news:", error);
    }
    setLoading(false);
  };

  useEffect(() => { setItems([]); setCursor(null); setHasMore(true); }, [filters]);
  useEffect(() => { load(); }, [filters]);

  // infinite scroll
  const sentinel = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    const io = new IntersectionObserver(([e]) => { if (e.isIntersecting) load(); });
    if (sentinel.current) io.observe(sentinel.current);
    return () => io.disconnect();
  }, [sentinel.current, cursor, filters, hasMore, loading]);

  return (
    <div className="max-w-3xl mx-auto p-3 sm:p-4">
      <header className="sticky top-0 backdrop-blur bg-mist/70 z-10 py-3">
        <h1 className="font-semibold text-2xl text-ink">InsuroNews</h1>
        <p className="text-sm text-subtle">Latest P&amp;C insurance news. Hourly, filtered, summarized.</p>
        <FilterBar selected={filters} onChange={setFilters} />
      </header>

      <section className="space-y-3 mt-3">
        {items.map(n => <NewsCard key={n.id} item={n} />)}
        <div ref={sentinel} className="py-10 text-center text-subtle">
          {loading ? "Loading…" : (hasMore ? "" : "You're up to date")}
        </div>
      </section>
    </div>
  );
}

