import { WebSocketServer } from 'ws';

const wss = new WebSocketServer({ port: 9090 });
const map = new Map();

wss.on('connection', (ws, req) => {
	if (req.url.length < 4 || req.url[2] !== '/')
		return ws.close();

	const app = req.url.substr(3);
	const partner = map.get(app);
	if (req.url[1] === 'h' && partner)
		return ws.close(3000, 'Room exists');
	if (req.url[1] === 'j' && !partner)
		return ws.close(3001, 'No such room');
	
	const ping = setInterval(ws.ping.bind(ws), 30000);
	ws.pm_pingtimeout = setTimeout(ws.terminate.bind(ws), 60000);

	ws.on('pong', () => {
		clearTimeout(ws.pm_pingtimeout);
		ws.pm_pingtimeout = setTimeout(ws.terminate.bind(ws), 60000);
	});

	ws.on('close', () => {
		clearTimeout(ws.pm_pingtimeout);
		clearInterval(ping);
		if (ws.pm_partner)
			ws.pm_partner.close();
		else
			map.delete(app);
	});

	if (partner) {
		ws.pm_partner = partner;
		partner.pm_partner = ws;
		map.delete(app);

		ws.on('message', (msg, binary) => partner.send(msg, {binary}));
		partner.on('message', (msg, binary) => ws.send(msg, {binary}));

		const rand = Math.floor(Math.random() * 4294967296);
		ws.send(`{"index":1,"seed":${rand}}`);
		partner.send(`{"index":0,"seed":${rand}}`);
	} else {
		map.set(app, ws);
	}
})
