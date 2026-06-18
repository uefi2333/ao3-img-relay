const UA=[
"Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
"Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
"Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:127.0) Gecko/20100101 Firefox/127.0",
];
let n=0;
Deno.serve(async(r)=>{
const u=new URL(r.url);
if(r.method==="OPTIONS")return new Response(null,{headers:{"Access-Control-Allow-Origin":"*"}});
const t=u.searchParams.get("url");
if(t){
n++;
try{
const h=new URL(t);
const resp=await fetch(t,{
headers:{
"User-Agent":UA[Math.floor(Math.random()*UA.length)],
"Accept":"image/avif,image/webp,image/apng,image/*,*/*;q=0.8",
"Referer":"https://archiveofourown.org/",
"Origin":"https://archiveofourown.org",
"Host":h.hostname,
},
redirect:"follow"
});
if(!resp.ok)return new Response("Error "+resp.status,{status:502});
const body=await resp.arrayBuffer();
return new Response(body,{headers:{
"Access-Control-Allow-Origin":"*",
"Cache-Control":"public, max-age=86400",
"Content-Type":resp.headers.get("content-type")||"image/webp",
}});
}catch(e){return new Response(e.message,{status:502});}
}
return new Response(JSON.stringify({ok:true,requests:n}),{headers:{"Content-Type":"application/json","Access-Control-Allow-Origin":"*"}});
});
