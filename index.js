    const { Client, LocalAuth } = require('whatsapp-web.js');
    const express = require('express');
    const http = require('http');
    const socketIo = require('socket.io');
    const qrcode = require('qrcode');
    const fs = require('fs');
    const path = require('path');

    const app = express();
    const server = http.createServer(app);
    const io = socketIo(server);
    app.use(express.json()); 


    app.use(express.static('public'));

    const AUTH_FOLDER = path.join(__dirname, '.wwebjs_auth');
    const CACHE_FOLDER = path.join(__dirname, '.wwebjs_cache');


    let client;

    function createClient() {
        client = new Client({
            authStrategy: new LocalAuth()
        });

        setupClientEvents(client);
        client.initialize();
    }

    function setupClientEvents(clientInstance) {
        clientInstance.on('qr', async (qr) => {
            console.log('QR recibido, enviando a front...');
            const qrImage = await qrcode.toDataURL(qr);
            io.emit('qr', qrImage);
            io.emit('status', 'QR_RECEIVED');
        });

        clientInstance.on('ready', () => {
            console.log('Client is ready!');
            io.emit('ready');
            io.emit('status', 'READY');
        });

        clientInstance.on('authenticated', () => {
            console.log('Autenticado');
            io.emit('status', 'AUTHENTICATED');
        });

        clientInstance.on('auth_failure', () => {
            console.log('Fallo de autenticación');
            io.emit('status', 'AUTH_FAILURE');
        });

        clientInstance.on('disconnected', () => {
            console.log('Desconectado');
            io.emit('status', 'DISCONNECTED');
        });
    }

    createClient();

    io.on('connection', (socket) => {
        console.log('Cliente conectado al frontend');

        socket.on('disconnect_request', async () => {
            console.log('Petición de desconexión recibida...');
        
            try {
                if (client) {
                    await client.destroy();
                    console.log('Cliente destruido');
                }
        
                if (fs.existsSync(AUTH_FOLDER)) {
                    fs.rmSync(AUTH_FOLDER, { recursive: true, force: true });
                    console.log('Carpeta .wwebjs_auth eliminada');
                }
        
                if (fs.existsSync(CACHE_FOLDER)) {
                    fs.rmSync(CACHE_FOLDER, { recursive: true, force: true });
                    console.log('Carpeta .wwebjs_cache eliminada');
                }
        
                createClient();
        
            } catch (err) {
                console.error('Error al reiniciar el cliente:', err);
            }
        });
        
    });

    const PORT = process.env.PORT || 3000;
    server.listen(PORT, () => {
        console.log(`Servidor corriendo en http://localhost:${PORT}`);
    });

    app.post('/api/send-message', async (req, res) => {
        const body = req.body;

        if (!body || !body.number || !body.message) {
            return res.status(400).json({
                success: false,
                error: 'Faltan parámetros: number o message',
            });
        }
    
        const { number, message } = req.body;
    
    
        try {
            const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
            const sentMessage = await client.sendMessage(chatId, message);
            return res.json({ success: true, messageId: sentMessage.id._serialized });
        } catch (err) {
            console.error('Error enviando mensaje:', err);
            return res.status(500).json({ success: false, error: 'Error al enviar mensaje' });
        }
    });
    