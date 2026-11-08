/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        noche: "#2E2A5C",      // texto principal: azul noche
        lavanda: { 50: "#F6F3FF", 100: "#ECE6FF", 200: "#D9CEFB", 300: "#BFAEF2", 400: "#9C86E3", 500: "#7E6BB8", 600: "#5F4F98" },
        rosa: { 50: "#FFF4F8", 100: "#FDE6EF", 200: "#F9CCDD", 300: "#F2A9C4", 400: "#E584A8" },
        cielo: { 100: "#E3EEFF", 200: "#C9DCFB", 300: "#A5C3F2" },
        menta: { 100: "#E1F4EC", 300: "#9ED7BE", 500: "#4E9E7C" },
        miel: { 100: "#FFF1D6", 300: "#F6CB7A", 500: "#C98A1B" },
      },
      fontFamily: {
        display: ['"Fraunces"', "Georgia", "serif"],
        sans: ['"Nunito"', "system-ui", "-apple-system", "Segoe UI", "sans-serif"],
      },
      boxShadow: {
        nube: "0 10px 30px -12px rgba(94, 79, 152, 0.35)",
        suave: "0 4px 18px -8px rgba(94, 79, 152, 0.28)",
      },
      keyframes: {
        flotar: { "0%,100%": { transform: "translateY(0)" }, "50%": { transform: "translateY(-6px)" } },
        entrar: { from: { opacity: "0", transform: "translateY(10px)" }, to: { opacity: "1", transform: "none" } },
        latido: { "0%,100%": { transform: "scale(1)" }, "50%": { transform: "scale(1.06)" } },
        brillo: { "0%,100%": { opacity: ".35" }, "50%": { opacity: "1" } },
        sello: { "0%": { transform: "scale(.4) rotate(-20deg)", opacity: "0" }, "70%": { transform: "scale(1.15) rotate(4deg)", opacity: "1" }, "100%": { transform: "scale(1) rotate(0)" } },
      },
      animation: {
        flotar: "flotar 6s ease-in-out infinite",
        entrar: "entrar .45s cubic-bezier(.2,.7,.2,1) both",
        latido: "latido 2.4s ease-in-out infinite",
        brillo: "brillo 3s ease-in-out infinite",
        sello: "sello .55s cubic-bezier(.2,.8,.2,1.2) both",
      },
    },
  },
  plugins: [],
};
