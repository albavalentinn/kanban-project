# 🚀 GetOrganized - Kanban Task Manager

Un gestor de tareas profesional inspirado en las interfaces SaaS modernas (estilo Atlassian/Jira). Este proyecto ha sido desarrollado como entrega final, combinando un cuidado diseño UI/UX con una robusta lógica en JavaScript Vanilla y una API REST simulada.

## ✨ Características Principales (Rúbrica superada)

*   **Diseño UI/UX:** Interfaz corporativa, limpia y totalmente responsive, con menús laterales intuitivos y modales unificados para maximizar la usabilidad.
*   **Sistema de Vistas:** Alternancia dinámica entre vista **Tablero Kanban** (Drag & Drop) y vista de **Lista** estructurada.
*   **Autenticación de Usuarios:** Sistema de registro y login con persistencia de sesión en el navegador (`localStorage`).
*   **Gestión de Espacios de Trabajo:** Creación, edición, eliminación y navegación rápida entre múltiples proyectos/equipos.
*   **CRUD Completo de Tareas:** Creación, lectura, actualización y borrado de tareas interactuando con la API (`fetch`).
*   **Interacciones Avanzadas:** 
    *   Arrastrar y soltar (Drag & Drop) entre columnas con actualización automática en servidor.
    *   Buscador en tiempo real por título y descripción.
    *   Sistema de filtros por etiquetas de prioridad (Alta, Media, Baja).
*   **Sistema de Comentarios:** Integración de mensajes por tarea con identificador de autor, fecha, y control de seguridad (solo puedes borrar tus propios comentarios).

## 🛠️ Tecnologías Utilizadas

*   **Frontend:** HTML5, CSS3, JavaScript (ES6+ Vanilla).
*   **Backend (Simulado):** [JSON Server](https://github.com/typicode/json-server) para la API REST local (`db.json`).
*   **Librerías Externas:** [SortableJS](https://sortablejs.github.io/Sortable/) (Gestión de Drag & Drop).

## ⚙️ Instrucciones de Ejecución (Para el Evaluador)

Dado que la aplicación consume una base de datos simulada localmente, es indispensable levantar el entorno de `json-server` para que funcionen las tareas y el inicio de sesión.

### Paso 1: Levantar el Servidor (API)
1. Abre una terminal en la carpeta raíz de este repositorio.
2. Si no tienes instalado JSON Server en tu equipo, instálalo ejecutando:
   ```bash
   npm install -g json-server
   ```
3. Arranca la base de datos en el puerto 3000 con el siguiente comando:
   ```bash
   json-server --watch db.json --port 3000
   ```
   *(Deja esta terminal abierta y corriendo en segundo plano).*

### Paso 2: Abrir la Aplicación
Con el servidor encendido, abre el archivo `index.html` en cualquier navegador web. Se recomienda encarecidamente utilizar la extensión **Live Server** de Visual Studio Code para evitar problemas de CORS al cargar los módulos locales.

---

**Autora:** Alba Valentín Parreño
**Fecha:** Septiembre 2026