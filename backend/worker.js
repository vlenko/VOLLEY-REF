// VOLLEY REF AI proxy – Cloudflare Worker
// Secrets: OPENAI_API_KEY, APP_ACCESS_TOKEN
// Vars: ALLOWED_ORIGIN = https://vlenko.github.io
// Never commit secrets. Deploy to Cloudflare Workers separately.
const cors = origin => ({
  "Access-Control-Allow-Origin": origin,
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Vary": "Origin"
});
const json = (data, status, origin) => new Response(JSON.stringify(data), {
  status, headers: {"Content-Type":"application/json; charset=utf-8",...cors(origin)}
});
export default {
  async fetch(request, env) {
    const origin=request.headers.get("Origin")||"";
    const allowed=(env.ALLOWED_ORIGIN||"").split(",").map(x=>x.trim());
    if(!origin||!allowed.includes(origin))return new Response("Origin not allowed",{status:403});
    if(request.method==="OPTIONS")return new Response(null,{status:204,headers:cors(origin)});
    if(request.method!=="POST")return json({error:"Method not allowed"},405,origin);
    if(!env.OPENAI_API_KEY||!env.APP_ACCESS_TOKEN)return json({error:"Server is not configured"},503,origin);
    if(request.headers.get("Authorization")!==`Bearer ${env.APP_ACCESS_TOKEN}`)return json({error:"Unauthorized"},401,origin);
    if(Number(request.headers.get("Content-Length")||0)>6500000)return json({error:"Image too large"},413,origin);
    let body;
    try{body=await request.json()}catch{return json({error:"Invalid JSON"},400,origin)}
    if(!["lineup","roster"].includes(body.mode)||!/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(body.image||"")||body.image.length>6500000)
      return json({error:"Invalid image or mode"},400,origin);
    const lineup=body.mode==="lineup";
    const instruction=lineup?
      "Read the volleyball R-5 starting lineup slip. Output positions 1,2,3,4,5,6 as the jersey numbers written in cells I,II,III,IV,V,VI respectively. Do not guess illegible numbers. Return positions as strings or null. Also return team name if visible.":
      "Read the official volleyball match roster. Extract the selected team's full name, all player jersey numbers and player names, captain jersey number marked C, and libero jersey numbers marked L. Do not invent uncertain values. If two teams appear, use the requested team side if identifiable.";
    const schema=lineup?{
      type:"object",additionalProperties:false,required:["team_name","positions","warnings"],
      properties:{team_name:{type:["string","null"]},positions:{type:"object",additionalProperties:false,required:["1","2","3","4","5","6"],properties:Object.fromEntries(["1","2","3","4","5","6"].map(k=>[k,{type:["string","null"]}]))},warnings:{type:"array",items:{type:"string"}}}
    }:{
      type:"object",additionalProperties:false,required:["team_name","captain","liberos","players","warnings"],
      properties:{team_name:{type:["string","null"]},captain:{type:["string","null"]},liberos:{type:"array",items:{type:"string"}},players:{type:"array",items:{type:"object",additionalProperties:false,required:["number","name"],properties:{number:{type:"string"},name:{type:"string"}}}},warnings:{type:"array",items:{type:"string"}}}
    };
    const payload={
      model:"gpt-4.1-mini",
      input:[{role:"user",content:[{type:"input_text",text:instruction+" Team side: "+(body.team==="B"?"B":"A")},{type:"input_image",image_url:body.image}]}],
      text:{format:{type:"json_schema",name:lineup?"lineup":"roster",strict:true,schema}},
      max_output_tokens:1600
    };
    let response;
    try{response=await fetch("https://api.openai.com/v1/responses",{
      method:"POST",headers:{"Authorization":"Bearer "+env.OPENAI_API_KEY,"Content-Type":"application/json"},
      body:JSON.stringify(payload)
    })}catch{return json({error:"OpenAI network error"},502,origin)}
    if(!response.ok)return json({error:"AI request failed",status:response.status},502,origin);
    const result=await response.json();
    const output=(result.output||[]).flatMap(x=>x.content||[]).filter(x=>x.type==="output_text").map(x=>x.text).join("");
    try{return json({result:JSON.parse(output)},200,origin)}
    catch{return json({error:"AI returned invalid data"},502,origin)}
  }
};
