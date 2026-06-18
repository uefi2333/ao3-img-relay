const AO3_BASE = "https://archiveofourown.org";
const UA = [
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.5 Safari/605.1.15",
];
let n = 0;
function buildH(target, img) {
  const u = new URL(target);
  const h = {
    "User-Agent": UA[Math.floor(Math.random()*UA.length)],
    "Accept-Language": "en-US,en;q=0.9",
    "Host": u.hostname,
    "Referer": "https://archiveofourown.org/",
    "Origin": "https://archiveofourown.org",
  };
  if (img) return {...h, "Accept": "image/avif,image/webp,image/apng,image/*,*/*;q=0.8"};
  return {...h, "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8"};
}
function rewrite(body) {
  body = body.replace(/<meta[^>]*http-equiv=["']Content-Security-Policy["'][^>]*>/gi, "");
  body = body.replace(/<head>/i,'<head><meta name="referrer" content="no-referrer">');
  body = body.replace(/(href|action|value|src|content)=["']https?:\/\/(www\.)?archiveofourown\.org/gi,'$1="');
  body = body.replace(/<body/i,'<div style="background:linear-gradient(135deg,#667eea,#764ba2);color:#fff;padding:6px;text-align:center;font:13px sans-serif;position:sticky;top:0;z-index:99999">🌟 <b>UEFI233镜像站</b> | ⚠️ 本站为镜像站，请勿登录 | 📧 QQ:1658438693</div><body');
  return body;
}
Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (req.method==="OPTIONS") return new Response(null,{headers:{"Access-Control-Allow-Origin":"*"}});
  if (u.pathname==="/") return new Response(JSON.stringify({ok:true,requests:n}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
  n++;
  const isImg = /\.(jpg|jpeg|png|gif|webp|svg|ico|avif)(\?.*)?$/i.test(u.pathname);
  const target = AO3_BASE + u.pathname + u.search;
  try {
    const h = buildH(target, isImg);
    const r = await fetch(target, {headers:h, redirect:"follow"});
    if (r.status===429) return new Response("⏳ 限流中，请稍后重试",{status:429,headers:{"Access-Control-Allow-Origin":"*"}});
    if (!r.ok) return new Response(`Error ${r.status}`,{status:r.status});
    const ct = r.headers.get("content-type")||"";
    if (ct.includes("text/html")) {
      let body = await r.text();
      body = rewrite(body);
      return new Response(body,{headers:{"Content-Type":"text/html; charset=utf-8","Access-Control-Allow-Origin":"*","Cache-Control":"no-cache"}});
    }
    return new Response(r.body,{headers:{"Access-Control-Allow-Origin":"*","Cache-Control":"public, max-age=86400","Content-Type":ct}});
  } catch(e) { return new Response(e.message,{status:502}); }
});
});
