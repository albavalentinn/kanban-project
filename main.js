// Guardamos la dirección del servidor en una constante
const API_URL = 'http://localhost:3000/tasks';

// NUEVO: Variable para guardar todas las tareas en la memoria de tu Mac
let allTasks = [];

// 1. FUNCIÓN PRINCIPAL (El motor que arranca todo)
async function getTasks() {
    try {
        const response = await fetch(API_URL);
        allTasks = await response.json(); // Guardamos las tareas en la memoria
        
        console.log("¡Éxito! Tareas cargadas:", allTasks);
        
        // NUEVO: Comprobamos si hay texto en el buscador para no borrar la búsqueda al mover una tarjeta
        const searchInput = document.getElementById('search-input');
        const currentSearch = searchInput ? searchInput.value.toLowerCase() : '';
        
        if (currentSearch !== '') {
            const filteredTasks = allTasks.filter(task => 
                task.title.toLowerCase().includes(currentSearch) || 
                task.description.toLowerCase().includes(currentSearch)
            );
            renderTasks(filteredTasks);
        } else {
            renderTasks(allTasks); 
        }
        
        initSortable(); 
        
    } catch (error) {
        console.error("Error al cargar las tareas:", error);
    }
}

// 2. FUNCIÓN PARA DIBUJAR LAS TARJETAS Y CONTADORES
function renderTasks(tasks) {
    document.getElementById('todo-list').innerHTML = '';
    document.getElementById('doing-list').innerHTML = '';
    document.getElementById('done-list').innerHTML = '';

    let todoCount = 0;
    let doingCount = 0;
    let doneCount = 0;

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

        if (task.status === 'todo') {
            document.getElementById('todo-list').innerHTML += cardHTML;
            todoCount++;
        } else if (task.status === 'doing') {
            document.getElementById('doing-list').innerHTML += cardHTML;
            doingCount++;
        } else if (task.status === 'done') {
            document.getElementById('done-list').innerHTML += cardHTML;
            doneCount++;
        }
    });

    document.getElementById('count-todo').innerText = todoCount;
    document.getElementById('count-doing').innerText = doingCount;
    document.getElementById('count-done').innerText = doneCount;
}

// 3. FUNCIÓN DEL DRAG & DROP
function initSortable() {
    const todoList = document.getElementById('todo-list');
    const doingList = document.getElementById('doing-list');
    const doneList = document.getElementById('done-list');

    const sortableOptions = {
        group: 'kanban',
        animation: 150,
        onEnd: function (event) {
            const card = event.item; 
            const taskId = card.getAttribute('data-id'); 
            const newStatus = event.to.parentElement.getAttribute('data-status');
            
            updateTaskStatus(taskId, newStatus);
        }
    };

    new Sortable(todoList, sortableOptions);
    new Sortable(doingList, sortableOptions);
    new Sortable(doneList, sortableOptions);
}

// 4. FUNCIÓN PARA ACTUALIZAR EL ESTADO (PATCH)
async function updateTaskStatus(id, newStatus) {
    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PATCH',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ status: newStatus }) 
        });
        
        getTasks(); 
    } catch (error) {
        console.error("Error al guardar en el servidor:", error);
    }
}

// 5. --- LÓGICA DEL MODAL ---
const modalCreate = document.getElementById('modal-create-task');
const btnOpenCreate = document.getElementById('btn-create-task');
const btnCancelCreate = document.getElementById('btn-cancel-task');

btnOpenCreate.addEventListener('click', () => {
    modalCreate.showModal(); 
});

btnCancelCreate.addEventListener('click', () => {
    modalCreate.close();
});

// 6. --- LÓGICA PARA CREAR UNA TAREA NUEVA (POST) ---
const formCreate = document.getElementById('form-create-task');

formCreate.addEventListener('submit', async (event) => {
    event.preventDefault(); 

    const titleValue = document.getElementById('task-title').value;
    const descValue = document.getElementById('task-desc').value;
    const priorityValue = document.getElementById('task-priority').value;

    const newTask = {
        title: titleValue,
        description: descValue,
        priority: priorityValue,
        status: 'todo',
        dueDate: 'Sin fecha'
    };

    try {
        await fetch(API_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newTask)
        });
        
        formCreate.reset(); 
        modalCreate.close();
        getTasks(); 

    } catch (error) {
        console.error("Error al guardar la nueva tarea:", error);
    }
});

// 7. --- LÓGICA DEL BUSCADOR (Filtrado inteligente en JavaScript) ---
const searchInput = document.getElementById('search-input');

searchInput.addEventListener('input', (event) => {
    // 1. Convertimos lo que escribes a minúsculas
    const searchText = event.target.value.toLowerCase();
    
    // 2. Filtramos la memoria en lugar de pedirle datos al servidor
    const filteredTasks = allTasks.filter(task => {
        return task.title.toLowerCase().includes(searchText) || 
               task.description.toLowerCase().includes(searchText);
    });
    
    // 3. Dibujamos el resultado y reactivamos el Drag & Drop
    renderTasks(filteredTasks);
    initSortable(); 
});

// 8. ¡Damos la orden de arrancar!
getTasks();