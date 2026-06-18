const AO3_BASE = "https://archiveofourown.org";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";
let n = 0;
function browserHeaders(target) {
  const u = new URL(target);
  return {
    "User-Agent": UA,
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
    "Accept-Encoding": "gzip, deflate, br",
    "Referer": "https://archiveofourown.org/",
    "Origin": "https://archiveofourown.org",
    "Host": u.hostname,
    "Sec-Fetch-Dest": "document",
    "Sec-Fetch-Mode": "navigate",
    "Sec-Fetch-Site": "same-origin",
    "Sec-Fetch-User": "?1",
    "Sec-Ch-Ua": '"Google Chrome";v="125", "Chromium";v="125"',
    "Sec-Ch-Ua-Mobile": "?0",
    "Sec-Ch-Ua-Platform": '"Windows"',
    "Upgrade-Insecure-Requests": "1",
  };
}
Deno.serve(async (r) => {
  const u = new URL(r.url);
  if (r.method === "OPTIONS") return new Response(null, {headers: {"Access-Control-Allow-Origin": "*"}});
  const t = u.searchParams.get("url");
  if (t) {
    n++;
    try {
      const h = new URL(t);
      const resp = await fetch(t, {headers: {"User-Agent": UA, "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8", "Referer": "https://archiveofourown.org/", "Origin": "https://archiveofourown.org", "Host": h.hostname}, redirect: "follow"});
      if (!resp.ok) return new Response("Error " + resp.status, {status: 502});
      return new Response(await resp.arrayBuffer(), {headers: {"Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=86400", "Content-Type": resp.headers.get("content-type") || "image/webp"}});
    } catch (e) { return new Response(e.message, {status: 502}); }
  }
  if (u.pathname === "/_health") return new Response(JSON.stringify({ok: true, requests: n, version: "deno-v4"}), {headers: {"Content-Type": "application/json", "Access-Control-Allow-Origin": "*"}});
  n++;
  const target = AO3_BASE + u.pathname + u.search;
  const h = browserHeaders(target);
  const ck = r.headers.get("Cookie");
  if (ck) h["Cookie"] = ck;
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
    const rh = new Headers();
    for (const [k, v] of resp.headers) {
      if (k.toLowerCase() === "set-cookie") {
        let c = v.replace(/;\s*Domain=[^;]*/gi, "").replace(/;\s*Secure/gi, "").replace(/;\s*SameSite=None/gi, "; SameSite=Lax");
        rh.append("Set-Cookie", c);
      } else if (k.toLowerCase() !== "x-frame-options" && k.toLowerCase() !== "content-security-policy") {
        rh.append(k, v);
      }
    }
    rh.set("Access-Control-Allow-Origin", "*");
    rh.set("Access-Control-Allow-Credentials", "true");
    return new Response(resp.body, {status: resp.status, headers: rh});
  } catch (e) { return new Response(e.message, {status: 502}); }
});
