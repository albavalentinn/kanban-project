const API_URL = 'http://localhost:3000/tasks';
const API_PROJECTS = 'http://localhost:3000/projects';
const API_USERS = 'http://localhost:3000/users';

let allTasks = []; 
let allProjects = []; 
let currentUser = null; 

const projectSelect = document.getElementById('project-select');
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

// ==========================================
// 1. SISTEMA DE AUTENTICACIÓN (LOGIN/REGISTRO)
// ==========================================
let isLoginMode = true;

document.getElementById('auth-switch-link').addEventListener('click', (e) => {
    e.preventDefault();
    isLoginMode = !isLoginMode;
    
    if (isLoginMode) {
        document.getElementById('auth-title').innerText = 'Iniciar Sesión';
        document.getElementById('btn-auth-submit').innerText = 'Entrar';
        document.getElementById('auth-switch-text').innerText = '¿No tienes cuenta?';
        e.target.innerText = 'Regístrate aquí';
    } else {
        document.getElementById('auth-title').innerText = 'Crear Cuenta';
        document.getElementById('btn-auth-submit').innerText = 'Registrarse';
        document.getElementById('auth-switch-text').innerText = '¿Ya tienes cuenta?';
        e.target.innerText = 'Inicia sesión aquí';
    }
});

document.getElementById('auth-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    const userVal = document.getElementById('auth-username').value.trim();
    const passVal = document.getElementById('auth-password').value.trim();

    if (isLoginMode) {
        try {
            const res = await fetch(API_USERS);
            const users = await res.json();
            const foundUser = users.find(u => u.username === userVal && u.password === passVal);
            if (foundUser) {
                iniciarSesion(foundUser);
            } else {
                alert('Usuario o contraseña incorrectos. Inténtalo de nuevo.');
            }
        } catch (error) { console.error("Error al iniciar sesión", error); }
    } else {
        try {
            const resCheck = await fetch(API_USERS);
            const allUsers = await resCheck.json();
            const exists = allUsers.find(u => u.username === userVal);
            if (exists) {
                alert('Ese nombre de usuario ya está cogido. ¡Elige otro!');
                return;
            }
            const newUser = { id: 'user-' + Date.now(), username: userVal, password: passVal };
            const res = await fetch(API_USERS, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(newUser)
            });
            const createdUser = await res.json();
            iniciarSesion(createdUser);
        } catch (error) { console.error("Error al registrar", error); }
    }
});

function iniciarSesion(user) {
    currentUser = user;
    localStorage.setItem('kanban_user', JSON.stringify(user));
    authContainer.classList.add('hidden');
    appContainer.classList.remove('hidden');
    crearBotonCerrarSesion();
    loadProjects(); 
}

function crearBotonCerrarSesion() {
    if (!document.getElementById('btn-logout')) {
        const sidebar = document.querySelector('.sidebar');
        const logoutBtn = document.createElement('button');
        logoutBtn.id = 'btn-logout';
        logoutBtn.className = 'btn-text';
        logoutBtn.style.marginTop = 'auto'; 
        logoutBtn.style.color = '#bf2600'; 
        logoutBtn.innerHTML = `🚪 Cerrar Sesión (${currentUser.username})`;
        
        logoutBtn.onclick = () => {
            localStorage.removeItem('kanban_user');
            currentUser = null;
            appContainer.classList.add('hidden');
            authContainer.classList.remove('hidden');
            document.getElementById('auth-form').reset();
            logoutBtn.remove();
        };
        sidebar.appendChild(logoutBtn);
    }
}

function comprobarSesion() {
    const sesionGuardada = localStorage.getItem('kanban_user');
    if (sesionGuardada) {
        currentUser = JSON.parse(sesionGuardada);
        authContainer.classList.add('hidden');
        appContainer.classList.remove('hidden');
        crearBotonCerrarSesion();
        loadProjects();
    } else {
        authContainer.classList.remove('hidden');
        appContainer.classList.add('hidden');
    }
}

// ==========================================
// 2. GESTIÓN DE VISTAS (TABLERO VS LISTA)
// ==========================================
const btnKanban = document.querySelectorAll('.toolbar-tabs .tab')[0];
const btnList = document.querySelectorAll('.toolbar-tabs .tab')[1];
const boardKanban = document.querySelector('.kanban-board');
const boardList = document.getElementById('list-board');

btnKanban.addEventListener('click', () => {
    btnKanban.classList.add('active');
    btnList.classList.remove('active');
    boardKanban.classList.remove('hidden');
    boardList.classList.add('hidden');
});

btnList.addEventListener('click', () => {
    btnList.classList.add('active');
    btnKanban.classList.remove('active');
    boardList.classList.remove('hidden');
    boardKanban.classList.add('hidden');
});

function renderList(tasks) {
    const listContent = document.getElementById('list-content');
    listContent.innerHTML = '';
    
    tasks.forEach(task => {
        let statusText = '';
        if(task.status === 'todo') statusText = 'Por Hacer';
        if(task.status === 'doing') statusText = 'En Proceso';
        if(task.status === 'done') statusText = 'Finalizado';

        const isDone = task.status === 'done' ? 'text-strikethrough' : '';

        listContent.innerHTML += `
            <div class="list-row" data-id="${task.id}">
                <div class="list-row-title">
                    <h4 class="${isDone}">${task.title}</h4>
                    <p class="${isDone}">${task.description}</p>
                </div>
                <div><span class="badge ${task.priority.toLowerCase()}">${task.priority}</span></div>
                <div class="date ${isDone}">📅 ${task.dueDate}</div>
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
// 3. GESTIÓN DE PROYECTOS (Equipos)
// ==========================================
async function loadProjects() {
    try {
        const response = await fetch(API_PROJECTS);
        const todosLosProyectos = await response.json();
        
        allProjects = todosLosProyectos.filter(proj => proj.userIds && proj.userIds.includes(currentUser.id));
        
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
    } catch (error) { console.error("Error al cargar proyectos:", error); }
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
            <span>${proj.name} <small style="color: #6b778c;">👥 (${proj.userIds.length})</small></span>
            <div class="project-actions">
                <button onclick="inviteToProject('${proj.id}')" title="Añadir miembro">➕</button>
                <button onclick="removeFromProject('${proj.id}')" title="Expulsar miembro">➖</button>
                <button onclick="editProject('${proj.id}', '${proj.name}')" title="Renombrar">✏️</button>
                <button onclick="deleteProject('${proj.id}')" title="Borrar">🗑️</button>
            </div>
        `;
        list.appendChild(li);
    });
}

// NUEVA FUNCIÓN: Eliminar a alguien del proyecto
window.removeFromProject = async function(projectId) {
    const usernameToRemove = prompt("Introduce el nombre de usuario que quieres expulsar:");
    if (!usernameToRemove) return;
    
    try {
        // 1. Buscamos al usuario por su nombre
        const res = await fetch(API_USERS);
        const allUsers = await res.json();
        const userToRemove = allUsers.find(u => u.username === usernameToRemove.trim());
        
        if (!userToRemove) {
            alert("No existe ningún usuario con ese nombre.");
            return;
        }

        // Evitamos que te borres a ti misma por accidente
        if (userToRemove.id === currentUser.id) {
            alert("¡No puedes expulsarte a ti misma de tu propio proyecto!");
            return;
        }
        
        // 2. Traemos el proyecto actual
        const projRes = await fetch(`${API_PROJECTS}/${projectId}`);
        const project = await projRes.json();
        
        // 3. Comprobamos si realmente estaba en el equipo
        if (!project.userIds.includes(userToRemove.id)) {
            alert("Ese usuario no forma parte de este proyecto.");
            return;
        }
        
        // 4. Lo borramos de la lista usando .filter()
        const nuevaLista = project.userIds.filter(id => id !== userToRemove.id);
        
        // 5. Guardamos los cambios
        await fetch(`${API_PROJECTS}/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: nuevaLista })
        });
        
        alert(`¡Listo! El usuario ${userToRemove.username} ha sido eliminado del proyecto.`);
        await loadProjects();
        renderManageProjectsList();
        
    } catch (error) {
        console.error("Error al expulsar:", error);
    }
};

window.inviteToProject = async function(projectId) {
    const usernameToInvite = prompt("Introduce el nombre de usuario de tu compañero:");
    if (!usernameToInvite) return;
    
    try {
        const res = await fetch(API_USERS);
        const allUsers = await res.json();
        const userToInvite = allUsers.find(u => u.username === usernameToInvite.trim());
        
        if (!userToInvite) {
            alert("No existe ningún usuario con ese nombre.");
            return;
        }
        
        const projRes = await fetch(`${API_PROJECTS}/${projectId}`);
        const project = await projRes.json();
        
        if (project.userIds.includes(userToInvite.id)) {
            alert("Ese usuario ya está en este proyecto.");
            return;
        }
        
        project.userIds.push(userToInvite.id);
        
        await fetch(`${API_PROJECTS}/${projectId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ userIds: project.userIds })
        });
        
        alert(`¡Misión cumplida! ${userToInvite.username} ahora tiene acceso al proyecto.`);
        await loadProjects();
        renderManageProjectsList();
        
    } catch (error) {
        console.error("Error al invitar:", error);
    }
};

document.getElementById('form-add-project').addEventListener('submit', async (event) => {
    event.preventDefault();
    const input = document.getElementById('new-project-name');
    const newId = 'proyecto-' + Date.now();

    try {
        await fetch(API_PROJECTS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: newId, name: input.value, userIds: [currentUser.id] })
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
// 4. GESTIÓN DE TAREAS
// ==========================================
async function getTasks() {
    try {
        const currentProject = projectSelect.value;
        if (!currentProject) {
            renderTasks([]); renderList([]); return; 
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

document.getElementById('search-input').addEventListener('input', () => { getTasks(); });

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
comprobarSesion();