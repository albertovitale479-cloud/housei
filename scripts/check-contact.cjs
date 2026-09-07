const assert = require('node:assert/strict');
const handler = require('../api/contact.js');
const valid = {name:'Test Housei',email:'test@example.com',interest:'Attico Velario',message:'Test automatico',consent:'on'};
const keys = ['RESEND_API_KEY','CONTACT_FROM_EMAIL','CONTACT_TO_EMAIL'];
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
  keys.forEach(key=>process.env[key]='test-only');
  global.fetch=async(url,options)=>{
    assert.equal(url,'https://api.resend.com/emails');
    const body=JSON.parse(options.body);
    assert.equal(body.reply_to,valid.email);
    assert(body.text.includes(valid.message));
    return {ok:true};
  };
  assert.equal((await call('POST',valid)).code,200);
  console.log('Contact API: validation, missing configuration, mocked delivery OK.');
})().finally(()=>{
  global.fetch=originalFetch;
  keys.forEach((key,i)=>originalEnv[i]===undefined?delete process.env[key]:process.env[key]=originalEnv[i]);
});
