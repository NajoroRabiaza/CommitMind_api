const BASE = window.location.origin

const ROUTES = [
  {
    section: 'Health',
    routes: [
      { method: 'GET', path: '/health', desc: 'Check API status', auth: false }
    ]
  },
  {
    section: 'Auth',
    routes: [
      { method: 'GET', path: '/auth/github', desc: 'Login with GitHub', auth: false, external: true },
      { method: 'GET', path: '/auth/me', desc: 'Current user profile', auth: true },
      { method: 'GET', path: '/auth/logout', desc: 'Logout info', auth: true }
    ]
  },
  {
    section: 'Repositories',
    routes: [
      { method: 'POST', path: '/repositories/sync', desc: 'Sync repos from GitHub', auth: true },
      { method: 'GET',  path: '/repositories', desc: 'List repositories', auth: true }
    ]
  },
  {
    section: 'Commits',
    routes: [
      { method: 'POST', path: '/repositories/:repoId/commits/sync', desc: 'Sync commits from GitHub', auth: true, params: ['repoId'] },
      { method: 'GET',  path: '/repositories/:repoId/commits', desc: 'List commits', auth: true, params: ['repoId'] },
      { method: 'POST', path: '/repositories/:repoId/commits/:commitId/files/sync', desc: 'Sync commit files', auth: true, params: ['repoId', 'commitId'] },
      { method: 'GET',  path: '/repositories/:repoId/commits/:commitId/files', desc: 'List commit files', auth: true, params: ['repoId', 'commitId'] }
    ]
  },
  {
    section: 'Concepts',
    routes: [
      { method: 'POST',   path: '/concepts', desc: 'Create a concept', auth: true, body: '{\n  "name": "JWT Authentication",\n  "description": "Token-based auth"\n}' },
      { method: 'GET',    path: '/concepts', desc: 'List concepts', auth: true },
      { method: 'GET',    path: '/concepts/:id', desc: 'Get a concept', auth: true, params: ['id'] },
      { method: 'PUT',    path: '/concepts/:id', desc: 'Update a concept', auth: true, params: ['id'], body: '{\n  "name": "JWT Authentication",\n  "description": "Updated description"\n}' },
      { method: 'DELETE', path: '/concepts/:id', desc: 'Delete a concept', auth: true, params: ['id'] },
      { method: 'GET',    path: '/concepts/:conceptId/commits', desc: 'Commits linked to a concept', auth: true, params: ['conceptId'] }
    ]
  },
  {
    section: 'Linking',
    routes: [
      { method: 'POST',   path: '/repositories/:repoId/commits/:commitId/concepts', desc: 'Link a concept manually', auth: true, params: ['repoId', 'commitId'], body: '{\n  "conceptId": 1\n}' },
      { method: 'POST',   path: '/repositories/:repoId/commits/:commitId/concepts/auto', desc: 'Auto-detect concepts', auth: true, params: ['repoId', 'commitId'] },
      { method: 'DELETE', path: '/repositories/:repoId/commits/:commitId/concepts/:conceptId', desc: 'Unlink a concept', auth: true, params: ['repoId', 'commitId', 'conceptId'] }
    ]
  },
  {
    section: 'History & Stats',
    routes: [
      { method: 'GET', path: '/history', desc: 'Learning timeline grouped by month', auth: true },
      { method: 'GET', path: '/stats',   desc: 'Progression statistics', auth: true }
    ]
  }
]

let currentRoute = null
let paramInputs = {}
let loadingId = null

function buildSidebar() {
  const sidebar = document.getElementById('sidebar')

  ROUTES.forEach(group => {
    const label = document.createElement('div')
    label.className = 'sidebar-section-label'
    label.textContent = group.section
    sidebar.appendChild(label)

    group.routes.forEach(route => {
      const item = document.createElement('div')
      item.className = 'sidebar-item'

      const badge = document.createElement('span')
      badge.className = `method-badge ${route.method}`
      badge.textContent = route.method

      const path = document.createElement('span')
      path.className = 'sidebar-path'
      path.textContent = route.path

      item.appendChild(badge)
      item.appendChild(path)
      item.addEventListener('click', () => selectRoute(route, item))
      sidebar.appendChild(item)
    })
  })
}

function selectRoute(route, el) {
  document.querySelectorAll('.sidebar-item').forEach(i => i.classList.remove('active'))
  el.classList.add('active')

  currentRoute = route
  paramInputs = {}

  document.getElementById('centerTitle').textContent = route.desc
  const methodEl = document.getElementById('centerMethod')
  methodEl.className = `request-method method-badge ${route.method}`
  methodEl.textContent = route.method
  document.getElementById('centerUrl').value = BASE + route.path
  document.getElementById('centerDesc').textContent = route.desc

  // Params
  const paramsSection = document.getElementById('paramsSection')
  paramsSection.innerHTML = ''

  if (route.params && route.params.length > 0) {
    const label = document.createElement('div')
    label.className = 'field-label'
    label.textContent = 'Path parameters'
    paramsSection.appendChild(label)

    const table = document.createElement('div')
    table.className = 'params-table'

    route.params.forEach(param => {
      const row = document.createElement('div')
      row.className = 'params-row'

      const name = document.createElement('div')
      name.className = 'param-name'
      name.textContent = `:${param}`

      const input = document.createElement('input')
      input.className = 'param-input'
      input.type = 'text'
      input.placeholder = `Enter ${param}...`
      input.addEventListener('input', updateUrl)

      paramInputs[param] = input

      row.appendChild(name)
      row.appendChild(input)
      table.appendChild(row)
    })

    paramsSection.appendChild(table)
  }

  // Body
  const bodySection = document.getElementById('bodySection')
  bodySection.innerHTML = ''

  if (route.body) {
    const label = document.createElement('div')
    label.className = 'field-label'
    label.textContent = 'Request body (JSON)'

    const textarea = document.createElement('textarea')
    textarea.className = 'body-textarea'
    textarea.value = route.body
    textarea.id = 'bodyTextarea'

    bodySection.appendChild(label)
    bodySection.appendChild(textarea)
  }
}

function updateUrl() {
  if (!currentRoute) return
  let path = currentRoute.path
  for (const [param, input] of Object.entries(paramInputs)) {
    const val = input.value.trim() || `:${param}`
    path = path.replace(`:${param}`, val)
  }
  document.getElementById('centerUrl').value = BASE + path
}

function resolvePath() {
  if (!currentRoute) return null
  let path = currentRoute.path
  for (const [param, input] of Object.entries(paramInputs)) {
    const val = input.value.trim()
    if (!val) {
      alert(`Please fill in the parameter: ${param}`)
      return null
    }
    path = path.replace(`:${param}`, val)
  }
  return path
}

async function runCurrent() {
  if (!currentRoute) {
    alert('Please select a request from the sidebar first.')
    return
  }

  if (currentRoute.external) {
    window.open(BASE + currentRoute.path, '_blank')
    return
  }

  const token = document.getElementById('tokenInput').value.trim()
  if (currentRoute.auth && !token) {
    appendError(currentRoute, currentRoute.path, 'No token provided. Paste your JWT token above.')
    return
  }

  const resolvedPath = resolvePath()
  if (!resolvedPath) return

  const headers = { 'Content-Type': 'application/json' }
  if (currentRoute.auth && token) headers['Authorization'] = `Bearer ${token}`

  const options = { method: currentRoute.method, headers }

  const bodyTextarea = document.getElementById('bodyTextarea')
  if (bodyTextarea && (currentRoute.method === 'POST' || currentRoute.method === 'PUT')) {
    try {
      JSON.parse(bodyTextarea.value)
      options.body = bodyTextarea.value
    } catch {
      appendError(currentRoute, resolvedPath, 'Invalid JSON in request body.')
      return
    }
  }

  const btn = document.getElementById('runBtn')
  btn.disabled = true
  btn.innerHTML = '<span class="run-icon loading-anim">Running</span>'

  const id = `log-${Date.now()}`
  loadingId = id
  appendLoading(currentRoute, resolvedPath, id)

  const start = Date.now()

  try {
    const res = await fetch(BASE + resolvedPath, options)
    const duration = Date.now() - start
    const ct = res.headers.get('content-type') || ''
    const data = ct.includes('application/json') ? await res.json() : await res.text()
    updateLoading(id, currentRoute, resolvedPath, res.status, data, duration)
  } catch (err) {
    updateLoadingFail(id, currentRoute, resolvedPath, err.message)
  } finally {
    btn.disabled = false
    btn.innerHTML = '<span class="run-icon">&#9654;</span> Run'
  }
}

function hidePlaceholder() {
  const p = document.getElementById('placeholder')
  if (p) p.style.display = 'none'
}

function appendLoading(route, path, id) {
  hidePlaceholder()
  const terminal = document.getElementById('terminal')
  const entry = document.createElement('div')
  entry.className = 'log-entry'
  entry.id = id
  entry.innerHTML = `
    <div class="log-meta">
      <span class="log-prompt">&#x276F;</span>
      <span class="method-badge ${route.method}" style="font-size:9px;padding:1px 5px;">${route.method}</span>
      <span class="log-path">${path}</span>
    </div>
    <div class="log-json loading-anim" style="color:#4b5563">Waiting</div>
  `
  terminal.appendChild(entry)
  terminal.scrollTop = terminal.scrollHeight
}

function updateLoading(id, route, path, status, data, duration) {
  const entry = document.getElementById(id)
  if (!entry) return

  const isOk   = status >= 200 && status < 300
  const isWarn = status >= 400 && status < 500
  const statusClass = isOk ? 'log-status-ok' : isWarn ? 'log-status-warn' : 'log-status-err'
  const jsonClass   = isOk ? 'ok' : isWarn ? 'warn' : 'err'
  const formatted   = typeof data === 'string' ? data : JSON.stringify(data, null, 2)

  entry.innerHTML = `
    <div class="log-meta">
      <span class="log-prompt">&#x276F;</span>
      <span class="method-badge ${route.method}" style="font-size:9px;padding:1px 5px;">${route.method}</span>
      <span class="log-path">${path}</span>
      <span class="${statusClass}">${status}</span>
      <span class="log-duration">${duration}ms</span>
    </div>
    <div class="log-json ${jsonClass}">${escapeHtml(formatted)}</div>
    <hr class="log-divider" />
  `
  const terminal = document.getElementById('terminal')
  terminal.scrollTop = terminal.scrollHeight
}

function updateLoadingFail(id, route, path, message) {
  const entry = document.getElementById(id)
  if (!entry) return
  entry.innerHTML = `
    <div class="log-meta">
      <span class="log-prompt">&#x276F;</span>
      <span class="method-badge ${route.method}" style="font-size:9px;padding:1px 5px;">${route.method}</span>
      <span class="log-path">${path}</span>
      <span class="log-status-err">Network Error</span>
    </div>
    <div class="log-json err">${escapeHtml(message)}</div>
    <hr class="log-divider" />
  `
}

function appendError(route, path, message) {
  hidePlaceholder()
  const terminal = document.getElementById('terminal')
  const entry = document.createElement('div')
  entry.className = 'log-entry'
  entry.innerHTML = `
    <div class="log-meta">
      <span class="log-prompt">&#x276F;</span>
      <span class="log-path">${path}</span>
      <span class="log-status-warn">Warning</span>
    </div>
    <div class="log-json warn">${escapeHtml(message)}</div>
    <hr class="log-divider" />
  `
  terminal.appendChild(entry)
  terminal.scrollTop = terminal.scrollHeight
}

function clearTerminal() {
  document.getElementById('terminal').innerHTML = `
    <div class="placeholder-msg" id="placeholder">
      <div class="ph-icon">&#x276F;_</div>
      <p>Hit Run to see<br>the response here.</p>
    </div>
  `
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

buildSidebar()
