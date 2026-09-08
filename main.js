const API_URL = 'http://localhost:3000/tasks';
const API_PROJECTS = 'http://localhost:3000/projects';

let allTasks = []; 
let allProjects = []; 

const projectSelect = document.getElementById('project-select');

// ==========================================
// 1. GESTIÓN DE VISTAS (TABLERO VS LISTA)
// ==========================================
const btnKanban = document.querySelectorAll('.toolbar-tabs .tab')[0];
const btnList = document.querySelectorAll('.toolbar-tabs .tab')[1];
const boardKanban = document.querySelector('.kanban-board');
const boardList = document.getElementById('list-board');

// Cambiar a vista Kanban
btnKanban.addEventListener('click', () => {
    btnKanban.classList.add('active');
    btnList.classList.remove('active');
    boardKanban.classList.remove('hidden');
    boardList.classList.add('hidden');
});

// Cambiar a vista Lista
btnList.addEventListener('click', () => {
    btnList.classList.add('active');
    btnKanban.classList.remove('active');
    boardList.classList.remove('hidden');
    boardKanban.classList.add('hidden');
});

// Dibujar tareas en formato de fila
function renderList(tasks) {
    const listContent = document.getElementById('list-content');
    listContent.innerHTML = '';

    tasks.forEach(task => {
        let statusText = '';
        if(task.status === 'todo') statusText = 'Por Hacer';
        if(task.status === 'doing') statusText = 'En Proceso';
        if(task.status === 'done') statusText = 'Finalizado';

        listContent.innerHTML += `
            <div class="list-row" data-id="${task.id}">
                <div class="list-row-title">
                    <h4>${task.title}</h4>
                    <p>${task.description}</p>
                </div>
                <div><span class="badge ${task.priority.toLowerCase()}">${task.priority}</span></div>
                <div class="date">📅 ${task.dueDate}</div>
                <div><strong>${statusText}</strong></div>
                <div class="project-actions">
                    <button class="btn-edit" onclick="openEditModal('${task.id}')" title="Editar">✏️</button>
                    <button class="btn-delete" onclick="deleteTask('${task.id}')" title="Borrar">🗑️</button>
                </div>
            </div>
        `;
    });
}

// ==========================================
// 2. GESTIÓN DE PROYECTOS
// ==========================================

async function loadProjects() {
    try {
        const response = await fetch(API_PROJECTS);
        allProjects = await response.json();
        
        projectSelect.innerHTML = ''; 
        
        if (allProjects.length === 0) {
            projectSelect.innerHTML = '<option value="">Sin proyectos</option>';
            renderTasks([]); 
            renderList([]);
            return;
        }

        allProjects.forEach(proj => {
            const option = document.createElement('option');
            option.value = proj.id;
            option.textContent = proj.name;
            projectSelect.appendChild(option);
        });

        getTasks(); 
    } catch (error) {
        console.error("Error al cargar proyectos:", error);
    }
}

projectSelect.addEventListener('change', () => {
    document.getElementById('search-input').value = ''; 
    getTasks();
});

const modalManageProjects = document.getElementById('modal-manage-projects');

document.getElementById('btn-manage-projects').addEventListener('click', () => {
    renderManageProjectsList();
    modalManageProjects.showModal();
});

document.getElementById('btn-close-manage-projects').addEventListener('click', () => {
    modalManageProjects.close();
});

function renderManageProjectsList() {
    const list = document.getElementById('manage-projects-list');
    list.innerHTML = '';

    allProjects.forEach(proj => {
        const li = document.createElement('li');
        li.className = 'project-list-item';
        li.innerHTML = `
            <span>${proj.name}</span>
            <div class="project-actions">
                <button onclick="editProject('${proj.id}', '${proj.name}')" title="Renombrar">✏️</button>
                <button onclick="deleteProject('${proj.id}')" title="Borrar">🗑️</button>
            </div>
        `;
        list.appendChild(li);
    });
}

document.getElementById('form-add-project').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('new-project-name');
    const newId = 'proyecto-' + Date.now();

    try {
        await fetch(API_PROJECTS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: newId, name: input.value })
        });
        input.value = '';
        await loadProjects(); 
        renderManageProjectsList(); 
    } catch (error) { console.error("Error al crear proyecto:", error); }
});

window.editProject = async function(id, oldName) {
    const newName = prompt("Introduce el nuevo nombre del proyecto:", oldName);
    if (!newName || newName === oldName) return;

    try {
        await fetch(`${API_PROJECTS}/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name: newName })
        });
        await loadProjects();
        renderManageProjectsList();
    } catch (error) { console.error("Error al renombrar:", error); }
};

window.deleteProject = async function(id) {
    if (!confirm("¿Seguro que quieres borrar este proyecto entero?")) return;
    try {
        await fetch(`${API_PROJECTS}/${id}`, { method: 'DELETE' });
        await loadProjects();
        renderManageProjectsList();
    } catch (error) { console.error("Error al borrar:", error); }
};

// ==========================================
// 3. GESTIÓN DE TAREAS (CRUD Y DRAG&DROP)
// ==========================================

async function getTasks() {
    try {
        const currentProject = projectSelect.value;
        if (!currentProject) {
            renderTasks([]);
            renderList([]);
            return; 
        }

        const response = await fetch(`${API_URL}?projectId=${currentProject}`);
        allTasks = await response.json(); 
        
        const searchInput = document.getElementById('search-input');
        const currentSearch = searchInput ? searchInput.value.toLowerCase() : '';
        
        let finalTasks = allTasks;
        if (currentSearch !== '') {
            finalTasks = allTasks.filter(task => 
                task.title.toLowerCase().includes(currentSearch) || task.description.toLowerCase().includes(currentSearch)
            );
        }
        
        renderTasks(finalTasks); 
        renderList(finalTasks); 
    } catch (error) { console.error("Error al cargar tareas:", error); }
}

function renderTasks(tasks) {
    document.getElementById('todo-list').innerHTML = '';
    document.getElementById('doing-list').innerHTML = '';
    document.getElementById('done-list').innerHTML = '';

    let todoCount = 0; let doingCount = 0; let doneCount = 0;

    tasks.forEach(task => {
        const cardHTML = `
            <article class="task-card" data-id="${task.id}">
                <h3>${task.title}</h3>
                <p>${task.description}</p>
                <div class="card-footer">
                    <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>
                    <span class="date">📅 ${task.dueDate}</span>
                    <div>
                        <button class="btn-edit" onclick="openEditModal('${task.id}')" title="Editar">✏️</button>
                        <button class="btn-delete" onclick="deleteTask('${task.id}')" title="Borrar">🗑️</button>
                    </div>
                </div>
            </article>
        `;

        if (task.status === 'todo') { document.getElementById('todo-list').innerHTML += cardHTML; todoCount++; }
        else if (task.status === 'doing') { document.getElementById('doing-list').innerHTML += cardHTML; doingCount++; }
        else if (task.status === 'done') { document.getElementById('done-list').innerHTML += cardHTML; doneCount++; }
    });

    document.getElementById('count-todo').innerText = todoCount;
    document.getElementById('count-doing').innerText = doingCount;
    document.getElementById('count-done').innerText = doneCount;
}

function initSortable() {
    const sortableOptions = {
        group: 'kanban', animation: 150,
        onEnd: function (event) {
            const taskId = event.item.getAttribute('data-id'); 
            const newStatus = event.to.parentElement.getAttribute('data-status');
            updateTaskStatus(taskId, newStatus);
        }
    };
    new Sortable(document.getElementById('todo-list'), sortableOptions);
    new Sortable(document.getElementById('doing-list'), sortableOptions);
    new Sortable(document.getElementById('done-list'), sortableOptions);
}

async function updateTaskStatus(id, newStatus) {
    await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }) 
    });
    getTasks(); 
}

const modalCreate = document.getElementById('modal-create-task');
document.getElementById('btn-create-task').addEventListener('click', () => modalCreate.showModal());
document.getElementById('btn-cancel-task').addEventListener('click', () => modalCreate.close());

document.getElementById('form-create-task').addEventListener('submit', async (event) => {
    event.preventDefault(); 
    if(!projectSelect.value) { alert("¡Crea un proyecto primero!"); return; }

    const newTask = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-desc').value,
        priority: document.getElementById('task-priority').value,
        status: 'todo',
        dueDate: document.getElementById('task-date').value || 'Sin fecha',
        projectId: projectSelect.value 
    };
    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
    });
    document.getElementById('form-create-task').reset(); 
    modalCreate.close();
    getTasks(); 
});

document.getElementById('search-input').addEventListener('input', () => {
    getTasks();
});

const modalEdit = document.getElementById('modal-edit-task');
document.getElementById('btn-cancel-edit').addEventListener('click', () => modalEdit.close());

window.openEditModal = function(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-desc').value = task.description;
    document.getElementById('edit-task-priority').value = task.priority;
    document.getElementById('edit-task-date').value = task.dueDate !== 'Sin fecha' ? task.dueDate : '';
    modalEdit.showModal();
};

document.getElementById('form-edit-task').addEventListener('submit', async (event) => {
    event.preventDefault();
    const id = document.getElementById('edit-task-id').value;
    const dateValue = document.getElementById('edit-task-date').value;
    const updatedData = {
        title: document.getElementById('edit-task-title').value,
        description: document.getElementById('edit-task-desc').value,
        priority: document.getElementById('edit-task-priority').value,
        dueDate: dateValue ? dateValue : 'Sin fecha'
    };
    await fetch(`${API_URL}/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedData)
    });
    modalEdit.close();
    getTasks(); 
});

window.deleteTask = async function(taskId) {
    if (confirm("¿Estás seguro de que quieres borrar esta tarea definitivamente?")) {
        await fetch(`${API_URL}/${taskId}`, { method: 'DELETE' });
        getTasks(); 
    }
};

// ARRANQUE INICIAL
initSortable(); 
loadProjects();