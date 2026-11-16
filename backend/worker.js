// Cloudflare Worker – návrh bezpečnej AI brány pre VOLLEY REF.
// Pred nasadením nastavte secret OPENAI_API_KEY a ALLOWED_ORIGIN.
// Prístup musí byť autentifikovaný; bez autentifikácie sa táto ukážka NESMIE nasadiť verejne.
// Táto súčasť je zámerne len kostra: neobsahuje verejne zneužiteľný endpoint.
export default {
  async fetch(request, env) {
    return new Response(JSON.stringify({
      error: "AI endpoint is not configured. Authentication and deployment required."
    }), {
      status: 503,
      headers: { "content-type": "application/json; charset=utf-8" }
    });
  }
};
