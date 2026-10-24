# Chat grupal (chat-api)

## Qué se corrigió
- **Envío de mensajes**: el front ya no depende de una URL de Azure escrita a mano (`API = ""` → mismo origen), valida nombre/mensaje, muestra errores y envía también con Enter.
- **Servidor**: valida el cuerpo (400 si falta nombre o mensaje), límites de longitud, ids incrementales y errores en JSON.
- **Seguridad**: los mensajes se pintan con `textContent` (sin XSS) y solo se sirve la carpeta `public/` (antes se exponía `server.js`).
- **Rendimiento**: el front pide solo mensajes nuevos (`/mensajes?desde=ID`) en vez de redibujar todo cada segundo.

## Mejora aparte: historial persistente
Los mensajes se guardan en `DATA_DIR/mensajes.json` y se recuperan al reiniciar el servidor.

## Ejecutar local
    npm install
    npm start        # http://localhost:3000

## Despliegue
### Azure App Service (Linux, Node 20/22)
1. Sube el proyecto (GitHub Actions, `az webapp up` o zip deploy). Comando de inicio: `npm start`.
2. Configuración → Variables de entorno: `DATA_DIR=/home/data` (en `/home` el almacenamiento persiste).

### AWS Elastic Beanstalk (Node.js)
1. `eb init` → plataforma Node.js; `eb create chat-api`.
2. Variable `DATA_DIR=/var/app/current/data` (o monta EFS si necesitas persistencia entre despliegues).

### Render / Railway
Build: `npm install` · Start: `npm start`. Sin disco persistente el historial se pierde en cada redeploy.

Prueba de salud: `GET /health`
