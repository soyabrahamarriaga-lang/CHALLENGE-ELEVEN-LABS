import { afterEach, describe, it, expect, vi } from 'vitest';
import { createServer } from 'node:http';
import { createVercelDemo } from './vercelDemo.mjs';
const env = { VERCEL_URL: 'demo-preview.vercel.app', VERCEL_PROJECT_PRODUCTION_URL: 'userhelper.vercel.app', LIVEKIT_JOIN_CODE: 'test-only-access-code-123', ELEVENLABS_API_KEY: 'private-test-key', ELEVENLABS_AGENT_ID: 'agent_senior', ELEVENLABS_TUTOR_AGENT_ID: 'agent_intern' };
const servers = [];
afterEach(async () => { await Promise.all(servers.splice(0).map(s => new Promise(resolve => { s.closeAllConnections(); s.close(resolve); }))); });
async function setup(overrides = {}, parsed = false) {
 const agentAccess = vi.fn(async mode => mode === 'voice' ? { conversationToken: 'senior-token' } : { signedUrl: 'wss://test.invalid/senior' });
 const tutorAccess = vi.fn(async () => ({ conversationToken: 'tutor-token' }));
 const handler = createVercelDemo({...env,...overrides}, { agentAccess, tutorAccess, agentAvailability: async()=>({availability:'available'}), tutorAvailability:async()=>({availability:'available'}) });
 const server = createServer(async(req,res)=>{
   if(parsed && req.method==='POST') { const chunks=[];for await(const c of req)chunks.push(c); req.body=JSON.parse(Buffer.concat(chunks).toString()); }
   if(parsed)req.query=Object.fromEntries(new URL(req.url,'https://test.invalid').searchParams);
   return handler(req,res);
 });
 await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));servers.push(server);
 const base=`http://127.0.0.1:${server.address().port}`;
 const post=(path='/api/elevenlabs/session',body={},headers={})=>fetch(base+path,{method:'POST',headers:{Origin:'https://userhelper.vercel.app','Content-Type':'application/json',...headers},body:JSON.stringify({displayName:'Test',consent:true,joinCode:env.LIVEKIT_JOIN_CODE,mode:'voice',...body})});
 return {base,post,agentAccess,tutorAccess};
}
describe('Vercel conversation-only deployment',()=>{
 it.each([false,true])('accepts raw and platform-parsed requests (parsed=%s) and keeps roles separate',async(parsed)=>{
  const api=await setup({},parsed);
  expect(await(await api.post()).json()).toEqual({conversationToken:'senior-token'});
  expect(await(await api.post('/api/demo?route=elevenlabs/tutor/session')).json()).toEqual({conversationToken:'tutor-token'});
  expect(await(await api.post('/api/demo?route=elevenlabs/session',{mode:'text'},{Origin:'https://demo-preview.vercel.app'})).json()).toEqual({signedUrl:'wss://test.invalid/senior'});
  expect(api.agentAccess).toHaveBeenCalledTimes(2);expect(api.tutorAccess).toHaveBeenCalledTimes(1);
 });
 it('requires the access code and consent even if a local open-access .env is imported',async()=>{
  const api=await setup({AGENT_OPEN_ACCESS:'true'});
  expect((await api.post(undefined,{joinCode:''})).status).toBe(401);
  expect((await api.post(undefined,{consent:false})).status).toBe(400);
  expect(await(await fetch(api.base+'/api/elevenlabs/status')).json()).toEqual({configured:true,requiresCode:true});
  expect(api.agentAccess).not.toHaveBeenCalled();
 });
 it('rejects external or absent POST origins and never trusts request Host for authorization',async()=>{
  const api=await setup();
  for(const Origin of ['https://attacker.example','https://userhelper.vercel.app.attacker.example',''])expect((await api.post(undefined,{}, {Origin,Host:'attacker.example'})).status).toBe(403);
  expect((await api.post(undefined,{}, {'Sec-Fetch-Site':'cross-site'})).status).toBe(403);
  expect(api.agentAccess).not.toHaveBeenCalled();
 });
 it('supports an explicit custom domain and fails closed without trusted deployment origins or code',async()=>{
  const api=await setup({APP_ORIGIN:'https://demo.example.com'});
  expect((await api.post(undefined,{}, {Origin:'https://demo.example.com'})).status).toBe(200);
  const invalid=await setup({VERCEL_URL:'',VERCEL_PROJECT_PRODUCTION_URL:'',APP_ORIGIN:'https://demo.example.com/path'});
  expect((await invalid.post()).status).toBe(503);
  const noCode=await setup({LIVEKIT_JOIN_CODE:'',AGENT_OPEN_ACCESS:'true'});
  expect((await noCode.post()).status).toBe(503);
 });
 it('enforces payload limits on platform-parsed JSON before reaching ElevenLabs',async()=>{
  const api=await setup({},true);
  expect((await api.post(undefined,{extra:'x'.repeat(5000)})).status).toBe(400);
  expect(api.agentAccess).not.toHaveBeenCalled();
 });
 it('disables all vault writes despite an imported local VAULT_PATH and does not expose old team calls',async()=>{
  const api=await setup({VAULT_PATH:'/private/must-not-be-used'});
  expect(await(await fetch(api.base+'/api/vault/status')).json()).toEqual({configured:false,canImport:false});
  expect((await api.post('/api/vault/conversations/test/import')).status).toBe(503);
  expect((await api.post('/api/vault/processes/test/delete',{confirm:true})).status).toBe(503);
  expect((await api.post('/api/livekit/token')).status).toBe(404);
  expect((await api.post('/api/demo?route=../server/main')).status).toBe(404);
  expect((await api.post('/api/elevenlabs/session?route=livekit/token')).status).toBe(200);
 });
});
