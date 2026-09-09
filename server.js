// The rack, with its three inputs swapped for the arcade's: the games list is the arcade's
// carts feed (start order, live games only), each label is the arcade's plate for that game,
// and analytics go to the hub. The page itself is Mack's, byte for byte where it could be.
const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 3000;
const ARCADE = (process.env.ARCADE_URL || 'https://bhc-arcade.fly.dev').replace(/\/$/, '');
const read = f => fs.readFileSync(path.join(__dirname, f), 'utf8');
const page = read('index.html').split('__ARCADE__').join(ARCADE);
const resources = read('resources.html');
const bar = read('bar.js');
const snapshot = JSON.parse(read('tools/games-snapshot.json'));
const HTML = { 'content-type': 'text/html; charset=utf-8', 'cache-control': 'public, max-age=60' };

// The list the page bakes in: slug, name, url, shell. Refreshed from the arcade every minute;
// the committed snapshot is the fallback if the arcade is unreachable at boot.
let games = { at: 0, list: snapshot };
async function gamesList() {
  if (Date.now() - games.at < 60_000) return games.list;
  try {
    const r = await fetch(`${ARCADE}/api/carts.json?sort=started`, { signal: AbortSignal.timeout(8000) });
    if (!r.ok) throw new Error(`arcade ${r.status}`);
    const rows = await r.json();
    // start order, oldest first: the rack reads the list as days, last entry = today's cart
    rows.reverse();
    games = { at: Date.now(), list: rows.map(g => ({ s: g.s, n: g.n, u: g.u, a: g.a, plays: g.plays })) };
  } catch (e) {
    console.error('rack: using the last list:', e.message);
    games.at = Date.now() - 30_000;   // try again in half a minute
  }
  return games.list;
}

http.createServer(async (req, res) => {
  const url = req.url.split('?')[0];
  if (url === '/healthz' || url === '/health') { res.writeHead(200); return res.end('ok'); }
  if (url === '/bar.js') {
    res.writeHead(200, { 'content-type': 'application/javascript; charset=utf-8', 'cache-control': 'public, max-age=600', 'access-control-allow-origin': '*' });
    return res.end(bar);
  }
  if (url === '/resources' || url === '/resources.html') { res.writeHead(200, HTML); return res.end(resources); }
  const list = await gamesList();
  res.writeHead(200, HTML);
  res.end(page.replace('__GAMES__', JSON.stringify(list)));
}).listen(port, () => console.log('rack on ' + port + ', games from ' + ARCADE));
