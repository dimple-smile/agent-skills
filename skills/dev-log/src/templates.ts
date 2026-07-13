/**
 * Per-language log statement templates.
 *
 * Each template is a function that receives the resolved endpoint URL and the
 * raw JSON body string (already including sessionId/time/type/data) and returns
 * a complete, paste-ready code snippet for that language.
 *
 * Languages are kept minimal: use the most widely available HTTP client per
 * language and avoid third-party dependencies unless they are idiomatic
 * (e.g. OkHttp on Android is near-universal).
 */

export interface GenInput {
  /** Target language. */
  lang: string;
  /** Resolved endpoint URL, e.g. http://localhost:7331 */
  url: string;
  /** Session id, e.g. sess_a1b2c3d4 */
  sessionId: string;
  /** Log type, e.g. state / error / validation / click */
  type: string;
  /**
   * Data payload expression. Raw string the caller provided; emitted verbatim
   * so callers can pass language-native literals ({count:1}) or variable
   * references (resp.body). Falls back to an empty object.
   */
  data?: string;
  /** Whether to mark this log as the __ready__ connectivity probe. */
  ready?: boolean;
}

type Renderer = (input: GenInput) => string;

/**
 * Build the JSON body as it should appear in-language. JS-family languages can
 * use object literals directly; most others need a JSON string. We centralize
 * the field set here so every language emits identical semantics.
 */
function jsLiteral(input: GenInput): string {
  const dataExpr = input.data && input.data.trim() ? input.data : '{}';
  const typeValue = input.ready ? `'__ready__'` : `'${input.type}'`;
  const dataValue = input.ready
    ? `{url:location.href,protocol:location.protocol}`
    : dataExpr;
  return `{sessionId:'${input.sessionId}',time:new Date().toTimeString().split(' ')[0],type:${typeValue},data:${dataValue}}`;
}

const renderers: Record<string, Renderer> = {
  // ---- JS family: emit native object literals, fetch with .catch ----
  js(input) {
    return `fetch('${input.url}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(${jsLiteral(input)})}).catch(()=>{})`;
  },
  ts: (input) => renderers.js(input),
  jsx: (input) => renderers.js(input),
  tsx: (input) => renderers.js(input),

  // ---- Languages that POST a raw JSON string ----
  python(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : '{}';
    const typeVal = input.ready ? '__ready__' : input.type;
    const dataVal = input.ready
      ? "{'url':location.href,'protocol':location.protocol}"
      : dataExpr;
    return `import urllib.request,json
urllib.request.urlopen(urllib.request.Request('${input.url}',data=json.dumps({'sessionId':'${input.sessionId}','time':__import__('time').strftime('%H:%M:%S'),'type':'${typeVal}','data':${dataVal}}).encode(),headers={'Content-Type':'application/json'}))`;
  },

  go(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : '{}';
    const typeVal = input.ready ? '__ready__' : input.type;
    const body = `{"sessionId":"${input.sessionId}","time":"TIME","type":"${typeVal}","data":${dataExpr}}`;
    return `package main
import ("bytes";"net/http")
func main(){
  body:=bytes.NewBuffer([]byte(\`${body}\`))
  http.Post("${input.url}","application/json",body)
}`;
  },

  swift(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : '[:]';
    const typeVal = input.ready ? '__ready__' : input.type;
    return `var req=URLRequest(url:URL(string:"${input.url}")!)
req.httpMethod="POST"
req.setValue("application/json",forHTTPHeaderField:"Content-Type")
req.httpBody=try?JSONSerialization.data(withJSONObject:["sessionId":"${input.sessionId}","time":Date().description.prefix(8),"type":"${typeVal}","data":${dataExpr}])
URLSession.shared.dataTask(with:req).resume()`;
  },

  kotlin(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : '{}';
    const typeVal = input.ready ? '__ready__' : input.type;
    return `val body="{\\"sessionId\\":\\"${input.sessionId}\\",\\"time\\":\\"\\",\\"type\\":\\"${typeVal}\\",\\"data\\":${dataExpr}}".toRequestBody("application/json".toMediaType())
val req=Request.Builder().url("${input.url}").post(body).build()
OkHttpClient().newCall(req).execute()`;
  },

  dart(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : '{}';
    const typeVal = input.ready ? '__ready__' : input.type;
    // No imports and no await: dev-log snippets are statements inserted into
    // the user's code. Imports belong at file top (the user manages those),
    // and `await` only works inside an async function. Fire-and-forget the
    // Future so the snippet is valid at any call site.
    return `http.post(Uri.parse('${input.url}'),headers:{'Content-Type':'application/json'},body:jsonEncode({'sessionId':'${input.sessionId}','time':DateTime.now().toString().substring(11,19),'type':'${typeVal}','data':${dataExpr}}));`;
  },

  cpp(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : '{}';
    const typeVal = input.ready ? '__ready__' : input.type;
    const body = `{"sessionId":"${input.sessionId}","time":"TIME","type":"${typeVal}","data":${dataExpr}}`;
    return `CURL*curl=curl_easy_init();
curl_easy_setopt(curl,CURLOPT_URL,"${input.url}");
curl_easy_setopt(curl,CURLOPT_POST,1L);
curl_easy_setopt(curl,CURLOPT_POSTFIELDS,"${body.replace(/"/g, '\\"')}");
struct curl_slist*h=curl_slist_append(NULL,"Content-Type: application/json");
curl_easy_setopt(curl,CURLOPT_HTTPHEADER,h);
curl_easy_perform(curl);
curl_easy_cleanup(curl);`;
  },

  rust(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : 'serde_json::json!({})';
    const typeVal = input.ready ? '__ready__' : input.type;
    return `reqwest::blocking::Client::new()
  .post("${input.url}")
  .json(&serde_json::json!({"sessionId":"${input.sessionId}","time":"","type":"${typeVal}","data":${dataExpr}}))
  .send()?;`;
  },

  java(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : '{}';
    const typeVal = input.ready ? '__ready__' : input.type;
    const body = `{"sessionId":"${input.sessionId}","time":"","type":"${typeVal}","data":${dataExpr}}`;
    return `var body="${body.replace(/"/g, '\\"')}";
var req=HttpRequest.newBuilder()
  .uri(URI.create("${input.url}"))
  .header("Content-Type","application/json")
  .POST(HttpRequest.BodyPublishers.ofString(body))
  .build();
HttpClient.newHttpClient().send(req,HttpResponse.BodyHandlers.ofString());`;
  },

  csharp(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : 'new{}';
    const typeVal = input.ready ? '__ready__' : input.type;
    return `var body=JsonSerializer.Serialize(new{sessionId="${input.sessionId}",time=DateTime.Now.ToString("HH:mm:ss"),type="${typeVal}",data=${dataExpr}});
await new HttpClient().PostAsync("${input.url}",new StringContent(body,Encoding.UTF8,"application/json"));`;
  },

  php(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : '[]';
    const typeVal = input.ready ? '__ready__' : input.type;
    return `$ch=curl_init("${input.url}");
curl_setopt($ch,CURLOPT_POST,true);
curl_setopt($ch,CURLOPT_POSTFIELDS,json_encode(['sessionId'=>"${input.sessionId}",'time'=>date('H:i:s'),'type'=>"${typeVal}",'data'=>${dataExpr}]));
curl_setopt($ch,CURLOPT_HTTPHEADER,['Content-Type: application/json']);
curl_exec($ch);
curl_close($ch);`;
  },

  ruby(input) {
    const dataExpr = input.data && input.data.trim() ? input.data : '{}';
    const typeVal = input.ready ? '__ready__' : input.type;
    return `require 'net/http'
require 'json'
uri=URI("${input.url}")
Net::HTTP.post(uri,{sessionId:"${input.sessionId}",time:Time.now.strftime("%H:%M:%S"),type:"${typeVal}",data:${dataExpr}}.to_json,"Content-Type"=>"application/json")`;
  },
};

export const SUPPORTED_LANGS = Object.keys(renderers);

export function renderLog(input: GenInput): string {
  const fn = renderers[input.lang.toLowerCase()];
  if (!fn) {
    throw new Error(
      `Unsupported language: ${input.lang}. Supported: ${SUPPORTED_LANGS.join(', ')}`
    );
  }
  return fn(input);
}
