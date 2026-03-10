const JSON_URL = "https://raw.githubusercontent.com/Jitendra-unatti/fancode/refs/heads/main/data/fancode.json";

export async function onRequest(context) {
  const req = context.request;
  const url = new URL(req.url);

  // CORS Headers
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "*",
  };

  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const pathname = url.pathname.replace("/api", "");

  // Proxy Logic
  if (pathname === "/proxy") {
    const target = url.searchParams.get("u");
    if (!target) return new Response("Missing URL", { status: 400, headers: corsHeaders });

    // হেডার প্রিপেয়ার করা
    const requestHeaders = new Headers({
      "User-Agent": "Mozilla/5.0 (Linux; Android 10) Chrome/120.0.0.0 Mobile",
      "Referer": "https://fancode.com/"
    });
    
    // Range রিকুয়েস্ট সাপোর্ট (প্লেয়ারের জন্য জরুরি)
    if (req.headers.get("Range")) {
      requestHeaders.set("Range", req.headers.get("Range"));
    }

    const res = await fetch(target, { headers: requestHeaders });
    const ct = res.headers.get("content-type") || "";
    
    // যদি m3u8 হয় (মাস্টার বা মিডিয়া প্লেলিস্ট)
    if (ct.includes("mpegurl") || target.endsWith(".m3u8")) {
      let text = await res.text();
      const base = new URL(target);
      
      // লাইভ স্ট্রিমের জন্য লিংক রি-রাইট
      text = text.split("\n").map(l => {
        if (!l || l.startsWith("#")) return l;
        const absUrl = new URL(l.trim(), base).href;
        return `/api/proxy?u=${encodeURIComponent(absUrl)}`;
      }).join("\n");

      // এখানেই মূল ফিক্স: ক্যাশে বন্ধ করা হচ্ছে যাতে লাইভ ভিডিও আটকে না যায়
      const headers = new Headers(corsHeaders);
      headers.set("Content-Type", "application/vnd.apple.mpegurl");
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");
      
      return new Response(text, { headers });
    }

    // ভিডিও সেগমেন্ট (.ts) রিটার্ন করা
    // এখানে আগের রেসপন্সের হেডারের সাথে CORS যোগ করা হচ্ছে
    const newHeaders = new Headers(res.headers);
    Object.keys(corsHeaders).forEach(key => newHeaders.set(key, corsHeaders[key]));

    return new Response(res.body, { 
      headers: newHeaders, 
      status: res.status, 
      statusText: res.statusText 
    });
  }

  // Match Logic
  const match = pathname.match(/^\/(\d+)_([^\/]+)_sayan\.m3u8$/);
  if (match) {
    const id = match[1];
    const lang = match[2].toLowerCase();

    try {
      const data = await (await fetch(JSON_URL)).json();
      const game = data.matches.find(m => String(m.match_id) === id && String(m.language).toLowerCase() === lang);
      
      if (!game) return new Response("Match Not Found", { status: 404, headers: corsHeaders });

      let src = game.auto_streams?.[0]?.auto;
      if(!src) return new Response("Source missing", { status: 404, headers: corsHeaders });

      let content = src;
      let base = "https://fancode.com/";

      if (src && src.startsWith("http")) {
        const r = await fetch(src, { headers: { "Referer": "https://fancode.com/" }});
        content = await r.text();
        base = src;
      }
      
      content = content.split("\n").map(l => {
        if (!l || l.startsWith("#")) return l;
        const absUrl = new URL(l.trim(), base).href;
        return `/api/proxy?u=${encodeURIComponent(absUrl)}`;
      }).join("\n");

      // এখানেও ক্যাশে বন্ধ করা হচ্ছে
      const headers = new Headers(corsHeaders);
      headers.set("Content-Type", "application/vnd.apple.mpegurl");
      headers.set("Cache-Control", "no-store, no-cache, must-revalidate");

      return new Response(content, { headers });
    } catch (e) {
      return new Response("Error: " + e.message, { status: 500, headers: corsHeaders });
    }
  }

  return new Response("Use format: /api/ID_LANG_sayan.m3u8", { headers: corsHeaders });
}
