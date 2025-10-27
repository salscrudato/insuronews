export type Category =
  | "Regulatory" | "Catastrophe" | "Auto" | "Homeowners" | "Commercial"
  | "Reinsurance" | "Claims" | "InsurTech" | "M&A" | "Cyber" | "Pricing";

export interface NewsDoc {
  id: string;                 // sha1(url)
  title: string;
  url: string;
  source: string;             // domain
  imageUrl?: string;
  publishedAt: { seconds: number, nanoseconds: number }; // Firestore Timestamp
  summaryBullets: string[];   // 3-5
  categories: Category[];     // tags in footer
  relevance: number;          // 0..1
  createdAt: { seconds: number, nanoseconds: number };
}

