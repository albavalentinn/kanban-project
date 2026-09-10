const jsonServer = require('json-server');
const server = jsonServer.create();
const router = jsonServer.router('db.json');
const middlewares = jsonServer.defaults();

// Configuramos los middlewares (para que no haya problemas de conexión CORS)
server.use(middlewares);
server.use(router);

// La nube nos dará un puerto automático, o usará el 3000 por defecto
const port = process.env.PORT || 3000;
server.listen(port, () => {
    console.log(`¡Base de datos funcionando en el puerto ${port}!`);
});