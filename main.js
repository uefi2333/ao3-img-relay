const AO3_BASE = "https://archiveofourown.org";
const UA = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36"];
let n = 0;
Deno.serve(async (r) => {
  const u = new URL(r.url);
  if (r.method === "OPTIONS") return new Response(null, {headers: {"Access-Control-Allow-Origin": "*"}});
  // 图片中继
  const t = u.searchParams.get("url");
  if (t) {
    n++;
    try {
      const h = new URL(t);
      const resp = await fetch(t, {headers: {"User-Agent": UA[Math.floor(Math.random()*UA.length)], "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8", "Referer": "https://archiveofourown.org/", "Origin": "https://archiveofourown.org", "Host": h.hostname}, redirect: "follow"});
      if (!resp.ok) return new Response("Error " + resp.status, {status: 502});
      const body = await resp.arrayBuffer();
      return new Response(body, {headers: {"Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400", "Content-Type": resp.headers.get("content-type") || "image/webp"}});
    } catch (e) { return new Response(e.message, {status: 502}); }
  }
  // 健康检查
  if (u.pathname === "/_health") return new Response(JSON.stringify({ok: true, requests: n}), {headers: {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}});
  // 全代理（支持 POST + cookie 转发）
  n++;
  const target = AO3_BASE + u.pathname + u.search;
  const h = {"User-Agent": UA[Math.floor(Math.random()*UA.length)], "Accept-Language": "en-US,en;q=0.9", "Referer": "https://archiveofourown.org/", "Origin": "https://archiveofourown.org"};
  // 转发 cookie（关键修复！）
  const ck = r.headers.get("Cookie");
  if (ck) h["Cookie"] = ck;
  const isImg = /\.(jpg|jpeg|png|gif|webp|svg|ico|avif)(\?.*)?$/i.test(u.pathname);
  if (isImg) h["Accept"] = "image/avif,image/webp,image/apng,image/*,*/*;q=0.8";
  else h["Accept"] = "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8";
  const opts = {headers: h, redirect: "follow"};
  if (r.method === "POST") {
    opts.method = "POST";
    const ct = r.headers.get("Content-Type");
    if (ct) h["Content-Type"] = ct;
    opts.body = await r.text();
  } else {
    opts.method = "GET";
  }
  try {
    const resp = await fetch(target, opts);
    if (resp.status === 429) return new Response("Rate limited", {status: 429});
    if (!resp.ok) return new Response("Upstream " + resp.status, {status: resp.status});
    const ct = resp.headers.get("content-type") || "";
    const rh = new Headers();
    rh.set("Access-Control-Allow-Origin", "*");
    rh.set("Access-Control-Allow-Credentials", "true");
    // 转发 Set-Cookie（关键修复！）
    for (const [k, v] of resp.headers) {
      if (k.toLowerCase() === "set-cookie") {
        let c = v.replace(/;\\s*Domain=[^;]*/gi, "").replace(/;\\s*Secure/gi, "").replace(/;\\s*SameSite=None/gi, "; SameSite=Lax");
        rh.append("Set-Cookie", c);
      } else if (k.toLowerCase() !== "x-frame-options" && k.toLowerCase() !== "content-security-policy") {
        rh.append(k, v);
      }
    }
    if (ct.includes("text/html")) {
      let body = await resp.text();
      body = body.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
      return new Response(body, {headers: rh});
    }
    rh.set("Content-Type", ct);
    return new Response(resp.body, {headers: rh});
  } catch (e) { return new Response(e.message, {status: 502}); }
});
