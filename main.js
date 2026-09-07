// Guardamos la dirección del servidor en una constante
const API_URL = 'http://localhost:3000/tasks';

// 1. FUNCIÓN PRINCIPAL (El motor que arranca todo)
async function getTasks() {
    try {
        const response = await fetch(API_URL);
        const tasks = await response.json();
        
        console.log("¡Éxito! Tareas cargadas:", tasks);
        
        // Primero dibujamos las tareas en la pantalla...
        renderTasks(tasks); 
        
        // ...y justo DESPUÉS encendemos el Drag & Drop para que se puedan mover
        initSortable(); 
        
    } catch (error) {
        console.error("Error al cargar las tareas:", error);
    }
}

// 2. FUNCIÓN PARA DIBUJAR LAS TARJETAS (La que inyecta el HTML)
function renderTasks(tasks) {
    // Limpiamos las columnas primero
    document.getElementById('todo-list').innerHTML = '';
    document.getElementById('doing-list').innerHTML = '';
    document.getElementById('done-list').innerHTML = '';

    // Recorremos cada tarea y creamos su tarjeta
    tasks.forEach(task => {
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

        // Metemos la tarjeta en la columna correspondiente
        if (task.status === 'todo') {
            document.getElementById('todo-list').innerHTML += cardHTML;
        } else if (task.status === 'doing') {
            document.getElementById('doing-list').innerHTML += cardHTML;
        } else if (task.status === 'done') {
            document.getElementById('done-list').innerHTML += cardHTML;
        }
    });
}

// 3. FUNCIÓN DEL DRAG & DROP (La que usa SortableJS)
function initSortable() {
    const todoList = document.getElementById('todo-list');
    const doingList = document.getElementById('doing-list');
    const doneList = document.getElementById('done-list');

    const sortableOptions = {
        group: 'kanban', // Permite mover entre diferentes columnas
        animation: 150,  // Animación fluida
        
        // El "vigilante" que nos avisa cuando soltamos una tarjeta
        onEnd: function (event) {
            const card = event.item; 
            const taskId = card.getAttribute('data-id'); 
            const newStatus = event.to.parentElement.getAttribute('data-status');
            
            // Avisamos a la base de datos del cambio de columna
            updateTaskStatus(taskId, newStatus);
        }
    };

    // Activamos las 3 columnas
    new Sortable(todoList, sortableOptions);
    new Sortable(doingList, sortableOptions);
    new Sortable(doneList, sortableOptions);
}

// 4. FUNCIÓN PARA ACTUALIZAR EL ESTADO EN EL SERVIDOR (PATCH)
async function updateTaskStatus(id, newStatus) {
    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PATCH', // Usamos PATCH porque solo actualizamos el status
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus }) 
        });
        
        console.log(`¡Base de datos actualizada! Tarea ${id} ahora es ${newStatus}`);
    } catch (error) {
        console.error("Error al guardar en el servidor:", error);
    }
}

// 5. ¡Damos la orden de arrancar!
getTasks();