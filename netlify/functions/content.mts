import { getStore } from "@netlify/blobs";
import type { Config } from "@netlify/functions";

const STORE_NAME = "prompt-era-content";
const POSTS_KEY = "posts.json";

const demo = [
  ["1","Cinematic Neon Portrait","AI Portrait","9:16","Cinematic","Advanced","A cinematic neon-lit portrait with glossy highlights, atmospheric depth and a premium editorial finish.","portrait, cinematic, neon, realistic","https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=900&q=85"],
  ["2","Cyberpunk Street Girl","Cyberpunk","4:5","Cyberpunk","Advanced","A futuristic street scene featuring a confident character under electric signage and rain.","cyberpunk, street, neon, character","https://images.unsplash.com/photo-1519608487953-e999c86e7455?auto=format&fit=crop&w=900&q=85"],
  ["3","Luxury Fashion Portrait","Fashion","4:5","Editorial","Intermediate","Luxury fashion portrait with controlled studio light, rich texture and magazine-grade composition.","fashion, luxury, editorial, portrait","https://images.unsplash.com/photo-1529139574466-a303027c1d8b?auto=format&fit=crop&w=900&q=85"],
  ["4","Dark Fantasy Warrior","Fantasy","4:5","Dark Fantasy","Advanced","A dramatic fantasy warrior in an ancient environment with cinematic fog and detailed armor.","fantasy, warrior, dark, cinematic","https://images.unsplash.com/photo-1518709268805-4e9042af9f23?auto=format&fit=crop&w=900&q=85"],
  ["5","Futuristic Dubai","Architecture","16:9","Futuristic","Intermediate","A visionary futuristic city skyline inspired by luxury architecture and glowing night streets.","dubai, architecture, futuristic, city","https://images.unsplash.com/photo-1512453979798-5ea266f8880c?auto=format&fit=crop&w=1200&q=85"],
  ["6","AI Product Advertisement","Product Ads","1:1","Commercial","Intermediate","A premium product advertisement with clean reflections, controlled lighting and a bold visual hierarchy.","product, commercial, advertisement, studio","https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?auto=format&fit=crop&w=900&q=85"],
  ["7","Fantasy Queen","Fantasy","4:5","Fantasy","Advanced","A regal fantasy queen surrounded by soft atmospheric light, ornate costume details and cinematic depth.","queen, fantasy, character, portrait","https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&w=900&q=85"],
  ["8","Rainy Tokyo Street","Photography","16:9","Cinematic","Intermediate","A moody rainy urban street filled with reflections, soft neon and documentary-style atmosphere.","tokyo, rain, street, cinematic","https://images.unsplash.com/photo-1519501025264-65ba15a82390?auto=format&fit=crop&w=1200&q=85"],
  ["9","Ultra Realistic Male Portrait","AI Portrait","4:5","Photorealistic","Advanced","An ultra-realistic close portrait with natural skin texture, controlled contrast and subtle film grain.","male, portrait, realistic, photography","https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=900&q=85"],
  ["10","Futuristic Space Station","Sci-Fi","16:9","Sci-Fi","Advanced","A vast orbital station with glowing corridors, monumental scale and cinematic science-fiction lighting.","space, station, sci-fi, futuristic","https://images.unsplash.com/photo-1446776811953-b23d57bd21aa?auto=format&fit=crop&w=1200&q=85"],
  ["11","Dreamy Nature Landscape","Nature","16:9","Dreamy","Beginner","A tranquil dreamlike landscape with soft morning haze, layered mountains and painterly light.","nature, landscape, dreamy, mountains","https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=1200&q=85"],
  ["12","Luxury Car Cinematic Shot","Photography","16:9","Automotive","Advanced","A luxury car photographed like a film still, with dramatic reflections and a premium night setting.","car, luxury, cinematic, automotive","https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=85"]
].map(x => ({id:x[0], title:x[1], category:x[2], aspectRatio:x[3], aiStyle:x[4], difficulty:x[5], description:x[6], tags:x[7].split(", "), image:x[8], prompt:`${x[6]} Ultra-detailed composition, professional lighting, realistic materials and textures, cinematic color grading, strong focal point, subtle atmospheric depth, high-end visual storytelling, carefully balanced framing, crisp details, premium finish. Keywords: ${x[7]}.`}));

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" } });
}

function authorized(req: Request) {
  const expected = Netlify.env.get("ADMIN_TOKEN");
  const auth = req.headers.get("authorization") || "";
  return Boolean(expected && auth === `Bearer ${expected}`);
}

async function readPosts() {
  const store = getStore(STORE_NAME, { consistency: "strong" });
  return (await store.get(POSTS_KEY, { type: "json" })) || demo;
}

export default async (req: Request) => {
  const url = new URL(req.url);
  const store = getStore(STORE_NAME, { consistency: "strong" });

  if (req.method === "GET" && url.searchParams.has("image")) {
    const id = url.searchParams.get("image")!;
    const meta = await store.getMetadata(`images/${id}`);
    if (!meta) return new Response("Not found", { status: 404 });
    const blob = await store.get(`images/${id}`, { type: "blob" });
    return new Response(blob, { headers: { "content-type": String(meta.metadata?.contentType || "image/jpeg"), "cache-control": "public, max-age=31536000, immutable" } });
  }

  const posts = await readPosts();

  if (req.method === "GET" && url.searchParams.has("prompt")) {
    const post = posts.find((p: any) => p.id === url.searchParams.get("prompt"));
    return post ? json({ prompt: post.prompt }) : json({ error: "Post not found" }, 404);
  }

  if (req.method === "GET") {
    const isAdmin = url.searchParams.get("admin") === "1" && authorized(req);
    return json(isAdmin ? posts : posts.map(({prompt, ...p}: any) => p));
  }

  if (!authorized(req)) return json({ error: "Unauthorized" }, 401);

  if (req.method === "DELETE") {
    const id = url.searchParams.get("id");
    if (!id) return json({ error: "Missing id" }, 400);
    const next = posts.filter((p: any) => p.id !== id);
    const old = posts.find((p: any) => p.id === id);
    await store.setJSON(POSTS_KEY, next);
    if (old?.imageKey) await store.delete(old.imageKey);
    return json({ ok: true, posts: next });
  }

  if (req.method === "POST" || req.method === "PUT") {
    const body = await req.json();
    if (!body.title || !body.prompt) return json({ error: "Title and prompt are required" }, 400);
    const id = String(body.id || Date.now());
    let image = body.image || "";
    let imageKey = body.imageKey || "";

    if (body.imageData) {
      const match = String(body.imageData).match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);
      if (!match) return json({ error: "Invalid image data" }, 400);
      const contentType = match[1];
      const bytes = Uint8Array.from(atob(match[2]), c => c.charCodeAt(0));
      imageKey = `images/${id}`;
      await store.set(imageKey, bytes.buffer, { metadata: { contentType } });
      image = `/api/content?image=${encodeURIComponent(id)}`;
    }

    const item = { id, title:String(body.title), category:String(body.category || "AI Art"), aspectRatio:String(body.aspectRatio || "1:1"), aiStyle:String(body.aiStyle || "Creative"), difficulty:String(body.difficulty || "Intermediate"), description:String(body.description || ""), tags:Array.isArray(body.tags) ? body.tags : String(body.tags || "").split(",").map((x:string)=>x.trim()).filter(Boolean), image, imageKey, prompt:String(body.prompt), updatedAt:new Date().toISOString() };
    const idx = posts.findIndex((p:any)=>p.id===id);
    if (idx >= 0) posts[idx] = {...posts[idx], ...item}; else posts.push(item);
    await store.setJSON(POSTS_KEY, posts);
    return json({ ok:true, post:item });
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config: Config = { path: "/api/content" };
