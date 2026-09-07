// Guardamos la dirección del servidor en una constante
const API_URL = 'http://localhost:3000/tasks';

// Función principal para obtener datos
async function getTasks() {
    try {
        const response = await fetch(API_URL);
        const tasks = await response.json();
        
        console.log("¡Éxito! Tareas cargadas:", tasks);
        // Llamamos a la nueva función para dibujar las tareas
        renderTasks(tasks); 
        
    } catch (error) {
        console.error("Error al cargar las tareas:", error);
    }
}

// Nueva función para inyectar el HTML
function renderTasks(tasks) {
    // 1. Limpiamos las columnas para evitar duplicados si recargamos
    document.getElementById('todo-list').innerHTML = '';
    document.getElementById('doing-list').innerHTML = '';
    document.getElementById('done-list').innerHTML = '';

    // 2. Recorremos cada tarea
    tasks.forEach(task => {
        // Creamos la estructura visual de la tarjeta
        const cardHTML = `
            <article class="task-card" data-id="${task.id}">
                <h3>${task.title}</h3>
                <p>${task.description}</p>
                <div class="card-footer">
                    <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>
                    <span class="date">📅 ${task.dueDate}</span>
                </div>
            </article>
        `;

        // 3. La metemos en la columna correcta según su status
        if (task.status === 'todo') {
            document.getElementById('todo-list').innerHTML += cardHTML;
        } else if (task.status === 'doing') {
            document.getElementById('doing-list').innerHTML += cardHTML;
        } else if (task.status === 'done') {
            document.getElementById('done-list').innerHTML += cardHTML;
        }
    });
}

// Arrancamos la aplicación
getTasks();