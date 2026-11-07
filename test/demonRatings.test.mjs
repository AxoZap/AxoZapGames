import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile, mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { generateKeyPairSync, sign } from 'node:crypto';
import { Miniflare, Response, convertV4MiniflareOptions } from 'miniflare';

// Run against the same bundled Worker and local D1 schema used in deployment.
test('personal ratings persist, validate, clear, and remain independent of the GDDL snapshot', async () => {
  const output = await mkdtemp(join(tmpdir(), 'axozap-demon-ratings-'));
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const jwtPart = value => Buffer.from(JSON.stringify(value)).toString('base64url');
  const jwtBody = `${jwtPart({alg:'RS256',typ:'JWT'})}.${jwtPart({aud:'ratings-test',exp:Math.floor(Date.now()/1000)+300})}`;
  const jwt = `${jwtBody}.${sign('RSA-SHA256',Buffer.from(jwtBody),privateKey).toString('base64url')}`;
  execFileSync(process.execPath, ['node_modules/wrangler/bin/wrangler.js','deploy','--dry-run','--outdir',output], {
    stdio:'pipe', env:{...process.env, WRANGLER_LOG_PATH:join(output,'wrangler.log')},
  });
  const mf = new Miniflare(convertV4MiniflareOptions({
    rootPath:output, modules:[{type:'ESModule',path:join(output,'index.js'),contents:await readFile(join(output,'index.js'),'utf8')}], compatibilityDate:'2026-09-24', compatibilityFlags:['nodejs_compat'],
    d1Databases:{axozap_games:'ratings-test'},
    bindings:{ADMIN_PASSWORD:'test-only',CF_ACCESS_TEAM_DOMAIN:'https://access.test',CF_ACCESS_AUD:'ratings-test'},
    outboundService: async request => {
      assert.equal(request.url,'https://access.test/cdn-cgi/access/certs');
      return Response.json({keys:[publicKey.export({format:'jwk'})]});
    },
  }));
  try {
    const db = await mf.getD1Database('axozap_games');
    const base = await readFile('worker/migrations/0001_create_games.sql','utf8');
    const ratings = await readFile('worker/migrations/0003_demon_ratings.sql','utf8');
    for (const sql of `${base}\n${ratings}`.split(';').map(value=>value.trim()).filter(Boolean)) await db.prepare(sql).run();
    async function request(method, path, demon, authenticated=true) {
      return mf.dispatchFetch(`https://worker.test/api/gd/${path}`,{
        method,headers:{'Content-Type':'application/json',...(authenticated?{'cf-access-jwt-assertion':jwt}:{})},
        ...(demon?{body:JSON.stringify({demon})}:{}),
      });
    }
    const initial = {name:'Test demon',difficulty:'Easy',rating:'Star',levelId:'13519',tier:2,enjoyment:0};
    assert.equal((await request('POST','demons',initial,false)).status,401);
    for (const invalid of [{tier:0},{tier:2.5},{tier:'3'},{enjoyment:11},{enjoyment:-1},{enjoyment:'9'}]) {
      assert.equal((await request('POST','demons',{...initial,...invalid})).status,400);
    }
    const posted = await request('POST','demons',initial);
    assert.equal(posted.status,200);
    const saved = await posted.json();
    await db.prepare("INSERT INTO gd_gddl_snapshots (level_id,tier,avg_enjoyment,my_tier,enjoyment,fetched_at) VALUES ('13519',1.04,5.8,1,9,'2026-11-07T12:00:00Z')").run();
    const publicRows = await (await request('GET','demons',null,false)).json();
    assert.equal(publicRows[0].tier,2);
    assert.equal(publicRows[0].enjoyment,0);
    assert.equal(publicRows[0].gddl.tier,1.04);
    const {tier,enjoyment,...legacyEdit} = saved;
    assert.equal((await request('PUT',`demons/${saved.id}`,{...legacyEdit,name:'Updated'})).status,200);
    let row = await db.prepare('SELECT tier,enjoyment FROM "Geometry Dash" WHERE id=?').bind(saved.id).first();
    assert.deepEqual(row,{tier:2,enjoyment:0});
    assert.equal((await request('PUT',`demons/${saved.id}`,{...saved,tier:null,enjoyment:8.5,gddl:{tier:99}})).status,200);
    row = await db.prepare('SELECT tier,enjoyment FROM "Geometry Dash" WHERE id=?').bind(saved.id).first();
    assert.deepEqual(row,{tier:null,enjoyment:8.5});
    assert.equal(await db.prepare("SELECT tier FROM gd_gddl_snapshots WHERE level_id='13519'").first('tier'),1.04);
    assert.equal((await request('GET','gddl/13519',null,false)).status,404);
    const hidden = await request('POST','demons',{...initial,hidden:true});
    assert.equal(hidden.status,200);
    assert.equal((await (await request('GET','demons',null,false)).json()).length,1);
    // Native mod authentication uses the existing password path.
    const mod = await mf.dispatchFetch('https://worker.test/api/gd/demons',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({password:'test-only',demon:{...initial,tier:3,enjoyment:9.5}}),
    });
    assert.equal(mod.status,200);
    assert.equal((await mod.json()).enjoyment,9.5);
    const platformer = await request('POST','demons',{...initial,name:'Platformer',rating:'Moon',tier:12,enjoyment:8.5});
    const platformerData = await platformer.json();
    assert.equal(platformerData.tier,12);
    assert.equal(platformerData.gddl.tier,null);
  } finally { await mf.dispose(); await rm(output,{recursive:true,force:true}); }
});
