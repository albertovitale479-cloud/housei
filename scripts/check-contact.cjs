const assert = require('node:assert/strict');
const handler = require('../api/contact.js');
const valid = {name:'Test Housei',email:'test@example.com',interest:'Attico Velario',message:'Test automatico',consent:'on'};
const keys = ['N8N_WEBHOOK_URL','N8N_WEBHOOK_SECRET'];
const originalEnv = keys.map(key=>process.env[key]);
const originalFetch = global.fetch;
async function call(method,body) {
  const response={setHeader(){},status(code){this.code=code;return this;},json(payload){this.payload=payload;return this;}};
  await handler({method,body},response);
  return response;
}
(async()=>{
  keys.forEach(key=>delete process.env[key]);
  assert.equal((await call('GET')).code,405);
  assert.equal((await call('POST',{})).code,400);
  assert.equal((await call('POST',{...valid,email:'invalid'})).code,400);
  assert.equal((await call('POST',{...valid,consent:''})).code,400);
  assert.equal((await call('POST',valid)).code,503);
  process.env.N8N_WEBHOOK_URL='https://automazioni.example.com/webhook/housei-lead';
  process.env.N8N_WEBHOOK_SECRET='test-only';
  global.fetch=async(url,options)=>{
    assert.equal(url,process.env.N8N_WEBHOOK_URL);
    assert.equal(options.headers['X-Housei-Webhook-Secret'],process.env.N8N_WEBHOOK_SECRET);
    const body=JSON.parse(options.body);
    assert.equal(body.email,valid.email);
    assert.equal(body.message,valid.message);
    assert.equal(body.consentAccepted,true);
    assert.equal(body.source,'housei-private-visit');
    return {ok:true};
  };
  assert.equal((await call('POST',valid)).code,200);
  console.log('Contact API: validation, missing configuration, mocked n8n delivery OK.');
})().finally(()=>{
  global.fetch=originalFetch;
  keys.forEach((key,i)=>originalEnv[i]===undefined?delete process.env[key]:process.env[key]=originalEnv[i]);
});
