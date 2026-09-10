const API_URL = 'http://localhost:3000/tasks';
const API_PROJECTS = 'http://localhost:3000/projects';
const API_USERS = 'http://localhost:3000/users';
const API_COMMENTS = 'http://localhost:3000/comments'; 

let allTasks = []; 
let allProjects = []; 
let currentUser = null; 
let currentPriorityFilter = 'all'; 
let currentProjectId = null; 

const projectList = document.getElementById('project-list'); 
const authContainer = document.getElementById('auth-container');
const appContainer = document.getElementById('app-container');

// ==========================================
// 1. SISTEMA DE AUTENTICACIÓN
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
            } else { alert('Usuario o contraseña incorrectos.'); }
        } catch (error) { console.error("Error", error); }
    } else {
        try {
            const resCheck = await fetch(API_USERS);
            const allUsers = await resCheck.json();
            if (allUsers.find(u => u.username === userVal)) {
                alert('Usuario cogido. ¡Elige otro!');
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
        } catch (error) { console.error("Error", error); }
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
            localStorage.removeItem('kanban_project');
            currentUser = null;
            currentProjectId = null;
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
        
        const commentsBadge = (task.comments && task.comments.length > 0)
            ? `<span title="${task.comments.length} comentarios" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; background:#e2e8f0; padding:2px 8px; border-radius:12px; color:#475569; margin-left: 8px; font-weight: bold;">💬 ${task.comments.length}</span>`
            : '';

        listContent.innerHTML += `
            <article class="list-row" data-id="${task.id}">
                <div class="list-row-title">
                    <div style="display: flex; align-items: center;">
                        <h4 class="${isDone}" style="cursor: pointer; color: #0369a1; text-decoration: underline; margin: 0;" onclick="openTaskViewModal('${task.id}')" title="Hacer clic para editar y ver comentarios">${task.title}</h4>
                        ${commentsBadge}
                    </div>
                    <p class="${isDone}">${task.description}</p>
                </div>
                <div><span class="badge ${task.priority.toLowerCase()}">${task.priority}</span></div>
                <div class="date ${isDone}">📅 ${task.dueDate}</div>
                <div><strong>${statusText}</strong></div>
                <div><!-- Espacio limpio --></div>
            </article>
        `;
    });
}

// ==========================================
// 3. GESTIÓN DE PROYECTOS DIRECTA EN LISTA
// ==========================================
async function loadProjects() {
    try {
        const response = await fetch(API_PROJECTS);
        const todosLosProyectos = await response.json();
        allProjects = todosLosProyectos.filter(proj => proj.userIds && proj.userIds.includes(currentUser.id));
        projectList.innerHTML = ''; 
        
        if (allProjects.length === 0) {
            projectList.innerHTML = '<li style="color: #6b778c; font-size: 0.9rem;">Sin proyectos</li>';
            currentProjectId = null;
            localStorage.removeItem('kanban_project');
            renderTasks([]); renderList([]); return;
        }

        if (!currentProjectId) {
            currentProjectId = localStorage.getItem('kanban_project');
        }

        const projectExists = allProjects.find(p => p.id === currentProjectId);
        if (!projectExists) {
            currentProjectId = allProjects[0].id;
        }

        localStorage.setItem('kanban_project', currentProjectId);

        allProjects.forEach(proj => {
            const li = document.createElement('li');
            li.style.display = 'flex';
            li.style.justifyContent = 'space-between';
            li.style.alignItems = 'center';
            
            if (currentProjectId === proj.id) {
                li.classList.add('active');
            }

            const nameSpan = document.createElement('span');
            nameSpan.textContent = proj.name;
            nameSpan.style.flex = '1';
            nameSpan.style.overflow = 'hidden';
            nameSpan.style.textOverflow = 'ellipsis';
            nameSpan.style.whiteSpace = 'nowrap';
            
            li.addEventListener('click', () => {
                document.querySelectorAll('#project-list li').forEach(el => el.classList.remove('active'));
                li.classList.add('active');
                currentProjectId = proj.id;
                localStorage.setItem('kanban_project', currentProjectId);

                document.getElementById('search-input').value = ''; 
                currentPriorityFilter = 'all'; 
                document.querySelectorAll('.filter-btn').forEach(b => {
                    b.classList.remove('active');
                    if(b.getAttribute('data-priority') === 'all') b.classList.add('active');
                });
                getTasks();
            });

            const actionsDiv = document.createElement('div');
            actionsDiv.style.display = 'flex';
            actionsDiv.style.gap = '8px';

            const btnEdit = document.createElement('button');
            btnEdit.innerHTML = '✏️';
            btnEdit.style.cssText = 'background:none; border:none; cursor:pointer; font-size:0.85rem; padding:0; opacity: 0.6; transition: opacity 0.2s;';
            btnEdit.title = "Renombrar";
            btnEdit.onmouseover = () => btnEdit.style.opacity = '1';
            btnEdit.onmouseout = () => btnEdit.style.opacity = '0.6';
            btnEdit.onclick = (e) => {
                e.stopPropagation(); 
                editProject(proj.id, proj.name);
            };

            const btnDelete = document.createElement('button');
            btnDelete.innerHTML = '🗑️';
            btnDelete.style.cssText = 'background:none; border:none; cursor:pointer; font-size:0.85rem; padding:0; opacity: 0.6; transition: opacity 0.2s;';
            btnDelete.title = "Borrar";
            btnDelete.onmouseover = () => btnDelete.style.opacity = '1';
            btnDelete.onmouseout = () => btnDelete.style.opacity = '0.6';
            btnDelete.onclick = (e) => {
                e.stopPropagation(); 
                deleteProject(proj.id);
            };

            actionsDiv.appendChild(btnEdit);
            actionsDiv.appendChild(btnDelete);

            li.appendChild(nameSpan);
            li.appendChild(actionsDiv);
            projectList.appendChild(li);
        });

        getTasks(); 
    } catch (error) { console.error("Error", error); }
}

document.getElementById('btn-add-project').addEventListener('click', async () => {
    const newName = prompt("Introduce el nombre del nuevo proyecto:");
    if (!newName || !newName.trim()) return;
    
    const newId = 'proyecto-' + Date.now();
    try {
        await fetch(API_PROJECTS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ id: newId, name: newName.trim(), userIds: [currentUser.id] })
        });
        
        currentProjectId = newId; 
        localStorage.setItem('kanban_project', currentProjectId);
        await loadProjects(); 
    } catch (error) { console.error("Error", error); }
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
    } catch (error) { console.error("Error", error); }
};

window.deleteProject = async function(id) {
    if (!confirm("¿Seguro que quieres borrar este proyecto entero y sus tareas?")) return;
    try {
        await fetch(`${API_PROJECTS}/${id}`, { method: 'DELETE' });
        if (currentProjectId === id) {
            currentProjectId = null; 
            localStorage.removeItem('kanban_project');
        }
        await loadProjects(); 
    } catch (error) { console.error("Error", error); }
};

// ==========================================
// 4. GESTIÓN DE TAREAS
// ==========================================
async function getTasks() {
    try {
        if (!currentProjectId) { renderTasks([]); renderList([]); return; }

        const response = await fetch(`${API_URL}?projectId=${currentProjectId}&_embed=comments`);
        allTasks = await response.json(); 
        
        allTasks.sort((a, b) => {
            if (a.dueDate === 'Sin fecha' && b.dueDate === 'Sin fecha') return 0;
            if (a.dueDate === 'Sin fecha') return 1;
            if (b.dueDate === 'Sin fecha') return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
        
        const searchInput = document.getElementById('search-input');
        const currentSearch = searchInput ? searchInput.value.toLowerCase() : '';
        
        let finalTasks = allTasks;
        if (currentSearch !== '') {
            finalTasks = allTasks.filter(task => 
                task.title.toLowerCase().includes(currentSearch) || task.description.toLowerCase().includes(currentSearch)
            );
        }
        
        renderTasks(finalTasks); 
        
        let listTasks = finalTasks;
        if (currentPriorityFilter !== 'all') {
            listTasks = finalTasks.filter(task => task.priority === currentPriorityFilter);
        }
        renderList(listTasks); 
        
    } catch (error) { console.error("Error al cargar tareas:", error); }
}

function renderTasks(tasks) {
    document.getElementById('todo-list').innerHTML = '';
    document.getElementById('doing-list').innerHTML = '';
    document.getElementById('done-list').innerHTML = '';
    let todoCount = 0; let doingCount = 0; let doneCount = 0;

    tasks.forEach(task => {
        const commentsBadge = (task.comments && task.comments.length > 0)
            ? `<span title="${task.comments.length} comentarios" style="display:inline-flex; align-items:center; gap:4px; font-size:0.75rem; background:#e2e8f0; padding:2px 8px; border-radius:12px; color:#475569;">💬 ${task.comments.length}</span>`
            : '';

        const cardHTML = `
            <article class="task-card" data-id="${task.id}">
                <div style="display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 0.5rem; gap: 8px;">
                    <h3 style="cursor: pointer; color: #0369a1; margin: 0; text-decoration: underline;" onclick="openTaskViewModal('${task.id}')" title="Clic para editar y ver comentarios">${task.title}</h3>
                    ${commentsBadge}
                </div>
                <p>${task.description}</p>
                <div class="card-footer" style="margin-top: 1rem;">
                    <span class="badge ${task.priority.toLowerCase()}">${task.priority}</span>
                    <span class="date">📅 ${task.dueDate}</span>
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
    if(!currentProjectId) { alert("¡Crea un proyecto primero!"); return; }
    
    const activeProj = currentProjectId;

    const newTask = {
        title: document.getElementById('task-title').value,
        description: document.getElementById('task-desc').value,
        priority: document.getElementById('task-priority').value,
        status: 'todo',
        dueDate: document.getElementById('task-date').value || 'Sin fecha',
        projectId: activeProj, 
        id: Date.now().toString() 
    };

    await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newTask)
    });

    document.getElementById('form-create-task').reset(); 
    modalCreate.close(); 
    
    currentProjectId = activeProj;
    getTasks(); 
});

document.getElementById('search-input').addEventListener('input', () => getTasks());

// ==========================================
// 5. EVENTOS FILTROS DE PRIORIDAD
// ==========================================
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.currentTarget.classList.add('active');
        currentPriorityFilter = e.currentTarget.getAttribute('data-priority');
        getTasks();
    });
});

// ==========================================
// 6. MODAL UNIFICADO: VISTA, EDICIÓN Y COMENTARIOS
// ==========================================
const modalTaskView = document.getElementById('modal-task-view');
const btnCloseTaskView = document.getElementById('btn-close-task-view');
const commentsList = document.getElementById('comments-list');
const formAddComment = document.getElementById('form-add-comment');
let currentViewTaskId = null; 

window.openTaskViewModal = function(taskId) {
    const task = allTasks.find(t => t.id === taskId);
    if (!task) return;
    
    // Aseguramos que se actualice siempre el ID de la tarea activa al abrir el modal
    currentViewTaskId = task.id;

    document.getElementById('edit-task-id').value = task.id;
    document.getElementById('edit-task-title').value = task.title;
    document.getElementById('edit-task-desc').value = task.description;
    document.getElementById('edit-task-priority').value = task.priority;
    document.getElementById('edit-task-date').value = task.dueDate !== 'Sin fecha' ? task.dueDate : '';

    modalTaskView.showModal();
    renderCommentsList(task.comments || [], task.id);
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
    modalTaskView.close(); getTasks(); 
});

document.getElementById('btn-delete-task').addEventListener('click', async () => {
    if (confirm("¿Estás segura de que quieres borrar esta tarea definitivamente?")) {
        await fetch(`${API_URL}/${currentViewTaskId}`, { method: 'DELETE' });
        modalTaskView.close();
        getTasks(); 
    }
});

function renderCommentsList(comments, taskId) {
    commentsList.innerHTML = ''; 

    if (comments.length === 0) {
        commentsList.innerHTML = '<li style="color: #64748b; font-size: 0.9rem;">No hay comentarios todavía.</li>';
        return;
    }

    comments.forEach(comment => {
        const li = document.createElement('li');
        li.style.cssText = 'background: #f1f5f9; padding: 0.8rem; border-radius: 6px; margin-bottom: 0.5rem; font-size: 0.9rem;';
        const date = new Date(comment.createdAt).toLocaleDateString();
        
        let deleteBtnHTML = '';
        if (comment.author === currentUser.username) {
            deleteBtnHTML = `<button onclick="deleteComment('${comment.id}', '${taskId}')" style="background: none; border: none; color: #ef4444; font-size: 0.75rem; cursor: pointer; text-decoration: underline; padding: 0; margin-top: 0.4rem; font-weight: 500;">Eliminar</button>`;
        }
        
        li.innerHTML = `
            <strong style="color: #0369a1;">${comment.author}</strong> 
            <span style="color: #64748b; font-size: 0.8rem;">(${date})</span>
            <p style="margin: 0.3rem 0 0 0; color: #334155;">${comment.text}</p>
            ${deleteBtnHTML}
        `;
        commentsList.appendChild(li);
    });
}

window.deleteComment = async function(commentId, taskId) {
    if (confirm("¿Eliminar este comentario?")) {
        try {
            await fetch(`${API_COMMENTS}/${commentId}`, { method: 'DELETE' });
            await getTasks(); 
            const updatedTask = allTasks.find(t => t.id === taskId);
            renderCommentsList(updatedTask.comments || [], taskId); 
        } catch (error) {
            console.error("Error al borrar comentario:", error);
        }
    }
};

formAddComment.addEventListener('submit', async (e) => {
    e.preventDefault();
    const textInput = document.getElementById('new-comment-text');
    
    const newComment = {
        id: 'comment-' + Date.now(), 
        taskId: currentViewTaskId,
        author: currentUser.username, 
        text: textInput.value,
        createdAt: new Date().toISOString()
    };

    try {
        await fetch(API_COMMENTS, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newComment)
        });

        textInput.value = ''; 
        await getTasks(); 
        const updatedTask = allTasks.find(t => t.id === currentViewTaskId);
        renderCommentsList(updatedTask.comments || [], currentViewTaskId); 
    } catch (error) {
        console.error("Error al guardar comentario:", error);
    }
});

btnCloseTaskView.addEventListener('click', () => {
    modalTaskView.close();
});

// ARRANQUE INICIAL
initSortable(); 
comprobarSesion();

// ==========================================
// 7. MENÚ HAMBURGUESA (MÓVIL)
// ==========================================
const btnHamburger = document.getElementById('btn-hamburger');
const sidebar = document.querySelector('.sidebar');
const btnCloseSidebar = document.getElementById('btn-close-sidebar');

if (btnHamburger && sidebar) {
    // Abrir el menú
    btnHamburger.addEventListener('click', (e) => {
        e.stopPropagation();
        sidebar.classList.add('open');
    });

    // Cerrar el menú con la X
    if (btnCloseSidebar) {
        btnCloseSidebar.addEventListener('click', () => {
            sidebar.classList.remove('open');
        });
    }

    // (Opcional) Mantenemos también el cierre al tocar fuera por comodidad
    document.addEventListener('click', (e) => {
        if (sidebar.classList.contains('open') && !sidebar.contains(e.target)) {
            sidebar.classList.remove('open');
        }
    });
}

// ==========================================
// 8. BUSCADOR MÓVIL
// ==========================================
const btnSearchMobile = document.getElementById('btn-search-mobile');
const searchInput = document.getElementById('search-input');

if (btnSearchMobile && searchInput) {
    // Abrir/cerrar el buscador al tocar la lupa
    btnSearchMobile.addEventListener('click', (e) => {
        e.stopPropagation(); // Evita que se cierre instantáneamente
        searchInput.classList.toggle('show-mobile');
        
        // Magia UX: Si se ha abierto, ponemos el cursor dentro automáticamente
        if (searchInput.classList.contains('show-mobile')) {
            searchInput.focus(); 
        }
    });

    // Cerrar el buscador al tocar cualquier otra parte de la pantalla
    document.addEventListener('click', (e) => {
        if (searchInput.classList.contains('show-mobile') && e.target !== searchInput) {
            searchInput.classList.remove('show-mobile');
        }
    });
}