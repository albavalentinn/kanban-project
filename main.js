// Guardamos la dirección del servidor
const API_URL = 'http://localhost:3000/tasks';
let allTasks = []; // Memoria de tareas

// 1. FUNCIÓN PRINCIPAL
async function getTasks() {
    try {
        const response = await fetch(API_URL);
        allTasks = await response.json(); 
        
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

// 2. FUNCIÓN PARA DIBUJAR LAS TARJETAS (Con botones de Editar ✏️ y Borrar 🗑️)
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
                    <div>
                        <button class="btn-edit" onclick="openEditModal('${task.id}')" title="Editar tarea">✏️</button>
                        <button class="btn-delete" onclick="deleteTask('${task.id}')" title="Borrar tarea">🗑️</button>
                    </div>
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

// 4. ACTUALIZAR ESTADO AL ARRASTRAR (PATCH)
async function updateTaskStatus(id, newStatus) {
    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status: newStatus }) 
        });
        getTasks(); 
    } catch (error) {
        console.error("Error al mover la tarea:", error);
    }
}

// 5. LÓGICA DEL MODAL DE CREAR
const modalCreate = document.getElementById('modal-create-task');
document.getElementById('btn-create-task').addEventListener('click', () => modalCreate.showModal());
document.getElementById('btn-cancel-task').addEventListener('click', () => modalCreate.close());

// 6. CREAR TAREA NUEVA (POST)
const formCreate = document.getElementById('form-create-task');
formCreate.addEventListener('submit', async (event) => {
    event.preventDefault(); 

    const newTask = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-desc').value,
        priority: document.getElementById('task-priority').value,
        status: 'todo',
        dueDate: document.getElementById('task-date').value || 'Sin fecha'
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
        console.error("Error al guardar:", error);
    }
});

// 7. BUSCADOR
document.getElementById('search-input').addEventListener('input', (event) => {
    const searchText = event.target.value.toLowerCase();
    const filteredTasks = allTasks.filter(task => 
        task.title.toLowerCase().includes(searchText) || 
        task.description.toLowerCase().includes(searchText)
    );
    renderTasks(filteredTasks);
    initSortable(); 
});

// 8. ABRIR VENTANA DE EDICIÓN Y RELLENAR DATOS
const modalEdit = document.getElementById('modal-edit-task');
document.getElementById('btn-cancel-edit').addEventListener('click', () => modalEdit.close());

function openEditModal(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;

    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-desc').value = task.description;
    document.getElementById('edit-task-priority').value = task.priority;
    document.getElementById('edit-task-date').value = task.dueDate !== 'Sin fecha' ? task.dueDate : '';

    modalEdit.showModal();
}

// 9. GUARDAR LOS CAMBIOS EDITADOS (PATCH)
const formEdit = document.getElementById('form-edit-task');
formEdit.addEventListener('submit', async (event) => {
    event.preventDefault();

    const id = document.getElementById('edit-task-id').value;
    const dateValue = document.getElementById('edit-task-date').value;

    const updatedData = {
        title: document.getElementById('edit-task-title').value,
        description: document.getElementById('edit-task-desc').value,
        priority: document.getElementById('edit-task-priority').value,
        dueDate: dateValue ? dateValue : 'Sin fecha'
    };

    try {
        await fetch(`${API_URL}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedData)
        });
        
        modalEdit.close();
        getTasks(); 
    } catch (error) {
        console.error("Error al actualizar la tarea:", error);
    }
});

// 10. --- BORRAR TAREA (DELETE) ---
async function deleteTask(taskId) {
    // Usamos una ventana de confirmación nativa del navegador
    const confirmDelete = confirm("¿Estás seguro de que quieres borrar esta tarea definitivamente?");
    
    if (confirmDelete) {
        try {
            await fetch(`${API_URL}/${taskId}`, {
                method: 'DELETE'
            });
            console.log(`Tarea ${taskId} eliminada.`);
            getTasks(); // Recargamos las tareas para que desaparezca
        } catch (error) {
            console.error("Error al borrar la tarea:", error);
        }
    }
}

// 11. ¡ARRANCAMOS!
getTasks();