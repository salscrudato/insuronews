import type { NewsDoc } from "../../lib/types";
import dayjs from "dayjs";
import relativeTime from "dayjs/plugin/relativeTime";

dayjs.extend(relativeTime);

export default function NewsCard({ item }: { item: NewsDoc }) {
  const publishedDate = item.publishedAt && typeof item.publishedAt === 'object' && 'seconds' in item.publishedAt
    ? new Date(item.publishedAt.seconds * 1000)
    : new Date();

  return (
    <article className="bg-white shadow-card rounded-xl p-4 hover:shadow-lg transition">
      <div className="flex items-start gap-3">
        <div className="grow">
          <a href={item.url} target="_blank" rel="noreferrer"
             className="text-lg font-semibold text-ink hover:text-accent">
            {item.title}
          </a>
          <div className="text-xs text-subtle mt-1">
            {new URL(item.source || item.url).hostname.replace(/^www\./, "")} · {dayjs(publishedDate).fromNow()}
          </div>
        </div>
        {item.imageUrl ? <img src={item.imageUrl} alt={item.title} className="w-20 h-20 object-cover rounded-md" /> : null}
      </div>
      <ul className="list-disc ml-6 mt-3 space-y-1 text-[15px]">
        {item.summaryBullets?.slice(0, 5).map((b, i) => <li key={i}>{b}</li>)}
      </ul>
      <div className="flex flex-wrap gap-2 mt-3">
        {item.categories?.map(t => (
          <span key={t} className="text-xs bg-mist text-ink/80 px-2 py-1 rounded-full border">{t}</span>
        ))}
      </div>
    </article>
  );
}

