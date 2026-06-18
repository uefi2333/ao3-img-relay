const AO3_BASE = "https://archiveofourown.org";
const UA = ["Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36","Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36","Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0"];
let n = 0;
function mkH(t, img) {
  const u = new URL(t);
  const h = {"User-Agent": UA[Math.floor(Math.random()*UA.length)], "Accept-Language": "en-US,en;q=0.9", "Host": u.hostname, "Referer": "https://archiveofourown.org/", "Origin": "https://archiveofourown.org"};
  if (img) return {...h, "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"};
  return {...h, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"};
}
Deno.serve(async (r) => {
  const u = new URL(r.url);
  if (r.method === "OPTIONS") return new Response(null, {headers: {"Access-Control-Allow-Origin": "*"}});
  // 图片中继
  const t = u.searchParams.get("url");
  if (t) {
    n++;
    try {
      const h = mkH(t, true);
      const resp = await fetch(t, {headers: h, redirect: "follow"});
      if (!resp.ok) return new Response("Error " + resp.status, {status: 502});
      const body = await resp.arrayBuffer();
      return new Response(body, {headers: {"Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400", "Content-Type": resp.headers.get("content-type") || "image/webp"}});
    } catch (e) { return new Response(e.message, {status: 502}); }
  }
  // 健康检查
  if (u.pathname === "/_health") return new Response(JSON.stringify({ok: true, requests: n}), {headers: {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}});
  // 全代理（仅被 CF Worker 调用时）
  n++;
  const target = AO3_BASE + u.pathname + u.search;
  const isImg = /\.(jpg|jpeg|png|gif|webp|svg|ico|avif)(\?.*)?$/i.test(u.pathname);
  try {
    const h = mkH(target, isImg);
    const resp = await fetch(target, {headers: h, redirect: "follow"});
    if (resp.status === 429) return new Response("Rate limited", {status: 429});
    if (!resp.ok) return new Response("Upstream " + resp.status, {status: resp.status});
    const ct = resp.headers.get("content-type") || "";
    if (ct.includes("text/html")) {
      let body = await resp.text();
      // 移除 CSP
      body = body.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
      // 不改写链接！让 CF Worker 来处理
      return new Response(body, {headers: {"Content-Type": "text/html; charset=utf-8", "Access-Control-Allow-Origin": "*", "Cache-Control": "no-cache"}});
    }
    return new Response(resp.body, {headers: {"Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400", "Content-Type": ct}});
  } catch (e) { return new Response(e.message, {status: 502}); }
});
