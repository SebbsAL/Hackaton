// nodejs-app/server.js
const http = require('http');

const PORT = process.env.PORT || 3000;

const server = http.createServer((req, res) => {
    // Configurar cabeceras CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', '*');

    if (req.method === 'OPTIONS') {
        res.writeHead(204);
        res.end();
        return;
    }

    // Ruta de estado simple para health check
    if (req.url === '/status' || req.url === '/health') {
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: 'OK', uptime: process.uptime() }));
        return;
    }

    // Respuesta genérica por defecto
    res.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Servidor de control Node.js activo y en funcionamiento.');
});

server.listen(PORT, () => {
    console.log(`Servidor Node.js escuchando en el puerto ${PORT}`);
});
