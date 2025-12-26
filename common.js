// common.js - Funzioni e variabili condivise
const url = "https://script.google.com/macros/s/AKfycbx4hX7_B0Iqkll1dRNzXa-sgNG6FQJQuqBlairJApKK-fsNDzNl0I70Hma8_-pi4Q75Tw/exec";

const giocatoriA = [
  "E. Carfora","K. Popa","G. Giacco","H. Taylor","C. Licata","L. Migliari","F. Piazzano","V. Occhipinti",
  "A. Salvatore","R. Bontempi","L. Ostuni","L. Jugrin", "A. Mollo", "A. DiFranco", "C. Gallo", "A. Tusa", "X. Undefined"
];

const numeriMaglia = ["5","18","4","21","15","34","20","31","25","11","23","17", "9", "26", "41", "29", "99"];

function extractYouTubeId(input) {
  try {
    if (/^[a-zA-Z0-9_-]{11}$/.test(input)) return input;
    const urlObj = new URL(input);
    if (urlObj.searchParams.has("v")) return urlObj.searchParams.get("v");
    if (urlObj.hostname.includes("youtu.be")) return urlObj.pathname.slice(1);
    if (urlObj.pathname.includes("/embed/")) return urlObj.pathname.split("/embed/")[1].split(/[?&]/)[0];
    if (urlObj.pathname.includes("/live/")) return urlObj.pathname.split("/live/")[1].split(/[?&]/)[0];
    return "";
  } catch (e) {
    return "";
  }
}

function extractYoutubeTime(input) {
  try {
    const urlObj = new URL(input);
    if (urlObj.searchParams.has("t")) {
      const t = urlObj.searchParams.get("t");
      const match = t.match(/(?:(\d+)m)?(?:(\d+)s)?$/);
      if (match) {
        const minutes = parseInt(match[1] || "0", 10);
        const seconds = parseInt(match[2] || "0", 10);
        return minutes * 60 + seconds;
      }
      return parseInt(t, 10);
    }
    return 0;
  } catch (e) {
    console.error("Input non valido:", e);
    return 0;
  }
}