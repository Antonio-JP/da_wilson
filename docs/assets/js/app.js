/* SPA prototype: fetch file lists from GitHub repo, render LaTeX via MathJax, and package downloads using JSZip.
   Notes: For public repos, unauthenticated GitHub API requests are rate-limited. You can set a token in the UI later. */

const state = {
  owner: '', repo: 'da_wilson', branch: '', files: [], index: {n:[], m:[], j:[]}, cacheTTL: 1000*60*60
}

const el = id => document.getElementById(id)

async function getRepoInfo(owner, repo){
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}`)
  if(!r.ok) throw new Error('Repo not found or API rate-limited')
  return r.json()
}

async function listFolder(owner, repo, path, branch){
  const q = branch?`?ref=${branch}`:''
  const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/${path}${q}`)
  if(!r.ok) return []
  return r.json()
}

async function tryFetchPreindex(owner, repo, branch){
  // Try to fetch a precomputed JSON index at repository root: files_index.json
  try{
    const raw = `https://raw.githubusercontent.com/${owner}/${repo}/${branch}/files_index.json`
    const r = await fetch(raw)
    if(!r.ok) return null
    const j = await r.json()
    return j
  }catch(e){ return null }
}

function parseFilename(name){
  // Strip extension then parse. Examples: (3_0)[P].tex  or (3_0)[H_0].tex
  const base = name.replace(/\.[^.]+$/, '')
  const m = base.match(/^\((\d+)_(\d+)\)\[([^\]]+)\]$/)
  if(!m) return null
  const n = parseInt(m[1],10), mm=parseInt(m[2],10)
  const inside = m[3] // 'P' or 'H_0'
  if(inside === 'P') return {name, n, m:mm, type:'P', j:null, filename:name}
  const h = inside.match(/^H_(\d+)$/)
  if(h) return {name, n, m:mm, type:'H', j:parseInt(h[1],10), filename:name}
  return null
}

function buildIndex(files){
  // Only index LaTeX (.tex) files for the viewer list to avoid duplicates
  const index = {n:new Set(), m:new Set(), j:new Set(), byKey:{}}
  for(const f of files){
    // Prefer `.tex` sources only (viewer always shows .tex)
    const isTex = (f.name && f.name.toLowerCase().endsWith('.tex')) || (f.path && f.path.toLowerCase().endsWith('.tex'))
    if(!isTex) continue
    const p = parseFilename(f.name)
    if(!p) continue
    index.n.add(p.n)
    index.m.add(p.m)
    if(p.j!==null) index.j.add(p.j)
    const key = `${p.n}_${p.m}`
    if(!index.byKey[key]) index.byKey[key]=[]
    index.byKey[key].push({...p, path:f.path})
  }
  index.n = Array.from(index.n).sort((a,b)=>a-b)
  index.m = Array.from(index.m).sort((a,b)=>a-b)
  index.j = Array.from(index.j).sort((a,b)=>a-b)
  return index
}

function populateFilters(){
  const nSel = el('nFilter'), mSel=el('mFilter'), jSel=el('jFilter')
  nSel.innerHTML = '<option value="">—</option>'
  mSel.innerHTML = '<option value="">—</option>'
  jSel.innerHTML = '<option value="">—</option>'
  for(const n of state.index.n) nSel.innerHTML += `<option value="${n}">${n}</option>`
  for(const m of state.index.m) mSel.innerHTML += `<option value="${m}">${m}</option>`
  for(const j of state.index.j) jSel.innerHTML += `<option value="${j}">${j}</option>`
}

function showFileList(filtered){
  const list = el('fileList'); list.innerHTML=''
  for(const group of filtered){
    const li = document.createElement('li')
    // Display concise label: (n_m)[P] or (n_m)[H_j]
    const label = `(${group.n}_${group.m})[${group.type}${group.j!==null?`_${group.j}`:''}]`
    li.textContent = label
    // ensure the path points to the .tex source so viewer always loads LaTeX
    li.dataset.path = group.path
    li.tabIndex = 0
    li.setAttribute('role','option')
    li.addEventListener('click', ()=>selectFile(group))
    li.addEventListener('keydown', (ev)=>{
      if(ev.key === 'Enter' || ev.key === ' '){ ev.preventDefault(); selectFile(group) }
    })
    list.appendChild(li)
  }
}

async function selectFile(f){
  const rawUrl = `https://raw.githubusercontent.com/${state.owner}/${state.repo}/${state.branch}/${f.path}`
  el('rawLink').href = rawUrl
  el('downloadFileBtn').onclick = ()=>downloadSingle(rawUrl, f.filename)
  const spinner = el('spinner')
  const preview = el('previewArea')
  try{
    // show spinner
    if(spinner){ spinner.style.display = 'flex'; spinner.setAttribute('aria-hidden','false') }
    const r = await fetch(rawUrl)
    const txt = await r.text()

    preview.innerHTML = `$${txt}$`
    /*//Adding extra line breaks to avoid multiline equation issues
    let count = 0;
    let txt_ed = txt.replace(/[+-]/g, (match) => {
        count++;
        return (count % 3 === 0) ? match + "\\\\" : match;
    });

    // show as LaTeX block
    preview.innerHTML = `\\begin{align*}${txt_ed}\\end{align*}`*/
    if(window.MathJax && MathJax.typesetPromise){
      await MathJax.typesetPromise([preview])
    }
  }catch(err){
    preview.textContent = 'Error loading preview.'
    console.error('selectFile error', err)
  }finally{
    // hide spinner
    if(spinner){ spinner.style.display = 'none'; spinner.setAttribute('aria-hidden','true') }
  }
}

async function downloadSingle(url, filename){
  const r = await fetch(url)
  const blob = await r.blob()
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = filename
  a.click()
}

async function packageZip(){
  const include = {
    latex:el('includeLatex').checked,
    maple:el('includeMaple').checked,
    math:el('includeMathematica').checked,
    sage:el('includeSage').checked
  }
  const n = el('nFilter').value, m = el('mFilter').value, j = el('jFilter').value
  if(!n || !m){ alert('Please select at least N and M to package.'); return }
  el('downloadStatus').textContent = 'Collecting files...'
  const zip = new JSZip()
  const folderName = `${state.repo}_${n}_${m}`
  const paths = []
  // helper to fetch folder listings and add matching files
  async function addFromFolder(folder, extFilter, mapName){
    if(!include[mapName]) return
    try{
      const list = await listFolder(state.owner, state.repo, folder, state.branch)
      for(const it of list){
        // try to match (n_m) pattern
        if(it.type!=='file') continue
        if(it.name.startsWith(`(${n}_${m})`)){
          const raw = `https://raw.githubusercontent.com/${state.owner}/${state.repo}/${state.branch}/${it.path}`
          const r = await fetch(raw)
          const txt = await r.text()
          zip.file(`${folderName}/${it.name}`, txt)
        }
      }
    }catch(e){ console.warn('folder error', folder, e) }
  }
    // latex, maple, mathematica (paths include data/)
    await addFromFolder('data/latex', '.tex', 'latex')
    await addFromFolder('data/maple', '.mpl', 'maple')
    await addFromFolder('data/mathematica', '.nb', 'math')
  // sage: one file per n_m in 'sage' folder; include if present
  if(include.sage){
    try{
        const list = await listFolder(state.owner, state.repo, 'data/sage', state.branch)
      for(const it of list){
        if(it.type!=='file') continue
        // many sage files may include n_m inside name; include those that contain `${n}_${m}`
        if(it.name.includes(`${n}_${m}`)){
          const raw = `https://raw.githubusercontent.com/${state.owner}/${state.repo}/${state.branch}/${it.path}`
          const r = await fetch(raw)
          const txt = await r.text()
          zip.file(`${folderName}/${it.name}`, txt)
        }
      }
    }catch(e){ console.warn('no sage folder or error', e) }
  }

  el('downloadStatus').textContent = 'Generating ZIP...'
  const content = await zip.generateAsync({type:'blob'})
  const a = document.createElement('a')
  a.href = URL.createObjectURL(content)
  a.download = `${folderName}.zip`
  a.click()
  el('downloadStatus').textContent = 'Ready.'
}

async function loadRepository(){
  const owner = "Antonio-JP"
  const repo = "da_wilson"
  state.owner = owner; state.repo = repo
  try{
    const repoInfo = await getRepoInfo(owner, repo)
    state.branch = repoInfo.default_branch || 'main'
    // check cache
    const cacheKey = `fileIndex_${owner}_${repo}_${state.branch}`
    const cached = JSON.parse(localStorage.getItem(cacheKey)||'null')
    if(cached && (Date.now()-cached.ts<state.cacheTTL)){
      state.files = cached.files
    } else {
      // Try to use a precomputed index (generated by GitHub Action) for speed
      const pre = await tryFetchPreindex(owner, repo, state.branch)
      if(pre && Array.isArray(pre.files)){
        state.files = pre.files
      } else {
        // fetch all relevant folders: latex, maple, mathematica, sage
          const [latexFiles, mapleFiles, mathFiles, sageFiles] = await Promise.all([
            listFolder(owner, repo, 'data/latex', state.branch).catch(()=>[]),
            listFolder(owner, repo, 'data/maple', state.branch).catch(()=>[]),
            listFolder(owner, repo, 'data/mathematica', state.branch).catch(()=>[]),
            listFolder(owner, repo, 'data/sage', state.branch).catch(()=>[]),
          ])
        // Normalize arrays to contain objects with name and path
        state.files = [].concat(latexFiles || [], mapleFiles || [], mathFiles || [], sageFiles || [])
      }
      localStorage.setItem(cacheKey, JSON.stringify({ts:Date.now(), files:state.files}))
    }
    state.index = buildIndex(state.files)
    populateFilters()
    showFileList(Object.values(state.index.byKey).flat().map(x=>x))
    el('downloadStatus').textContent = `Loaded ${state.files.length} files.`
  }catch(e){ alert('Error loading repository: '+e.message); console.error(e) }
}

function attachHandlers(){
  el('loadBtn').addEventListener('click', loadRepository)
  el('applyFilters').addEventListener('click', ()=>{
    const n = el('nFilter').value, m=el('mFilter').value, j=el('jFilter').value, type=el('typeFilter').value
    let items = Object.values(state.index.byKey).flat().map(x=>x)
    if(n) items = items.filter(it=>it.n==parseInt(n))
    if(m) items = items.filter(it=>it.m==parseInt(m))
    if(j) items = items.filter(it=>it.j==parseInt(j))
    if(type==='P') items = items.filter(it=>it.type==='P')
    if(type==='H') items = items.filter(it=>it.type==='H')
    showFileList(items)
  })
  el('packageBtn').addEventListener('click', packageZip)
  // el('refreshBtn').addEventListener('click', ()=>{ localStorage.clear(); loadRepository() })
  el('themeToggle').addEventListener('click', ()=>document.documentElement.classList.toggle('dark'))
  // Buttons for showing sections of the website
  el('home-show').addEventListener('click', ()=>{
    document.getElementById("home").classList.remove('hidden')
    document.getElementById("viewer").classList.add('hidden')
    document.getElementById("download").classList.add('hidden')
    document.getElementById("sec-filters").classList.add('hidden')
  })
  el('viewer-show').addEventListener('click', ()=>{
    document.getElementById("home").classList.add('hidden')
    document.getElementById("viewer").classList.remove('hidden')
    document.getElementById("download").classList.add('hidden')
    document.getElementById("sec-filters").classList.remove('hidden')
  })
  el('download-show').addEventListener('click', ()=>{
    document.getElementById("home").classList.add('hidden')
    document.getElementById("viewer").classList.add('hidden')
    document.getElementById("download").classList.remove('hidden')
    document.getElementById("sec-filters").classList.remove('hidden')
  })
  // Sidebar collapse
  const collapseBtn = el('collapseSidebar')
  if(collapseBtn) collapseBtn.addEventListener('click', ()=>{
    const sb = document.getElementById('sidebar')
    const open = sb.classList.toggle('open')
    collapseBtn.setAttribute('aria-expanded', open? 'true' : 'false')
  })
  const expandBtn = el('expandSidebar')
  if(expandBtn) expandBtn.addEventListener('click', ()=>{
    const sb = document.getElementById('sidebar')
    const open = sb.classList.toggle('open')
    expandBtn.setAttribute('aria-expanded', open? 'true' : 'false')
  })
  // Keyboard navigation for file list: arrow up/down move focus
  const fileList = el('fileList')
  if(fileList){
    fileList.addEventListener('keydown', (ev)=>{
      const items = Array.from(fileList.querySelectorAll('li'))
      if(!items.length) return
      const active = document.activeElement
      let idx = items.indexOf(active)
      if(ev.key === 'ArrowDown'){
        ev.preventDefault(); const next = items[Math.min(items.length-1, Math.max(0, idx+1))]; next.focus()
      } else if(ev.key === 'ArrowUp'){
        ev.preventDefault(); const prev = items[Math.max(0, idx-1)]; prev.focus()
      }
    })
  }
}

// init
(function(){
  attachHandlers()
})()
