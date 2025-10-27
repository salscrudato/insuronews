/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: "#0B1220",
        mist: "#f7f9fc",
        accent: "#2563eb",
        subtle: "#6b7280"
      },
      boxShadow: { card: "0 2px 16px rgba(0,0,0,0.06)" }
    }
  },
  plugins: [],
};

