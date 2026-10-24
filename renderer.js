const { ipcRenderer } = require('electron');
const path = require('path');

let playlist = [], currentIndex = 0, isPlaying = false;
const audio = new Audio();

// элементы DOM
const playBtn = document.getElementById('playBtn');
const prevBtn = document.getElementById('prevBtn');
const nextBtn = document.getElementById('nextBtn');
const progress = document.getElementById('progress');
const progressContainer = document.getElementById('progressContainer');
const currentTimeEl = document.getElementById('currentTime');
const totalTimeEl = document.getElementById('totalTime');
const volumeSlider = document.getElementById('volumeSlider');
const songTitleEl = document.getElementById('songTitle');
const artistNameEl = document.getElementById('artistName');
const statusEl = document.getElementById('status');
const playlistContainer = document.getElementById('playlistContainer');

function loadTrack(index) {
    const track = playlist[index];
    if (!track) return;
    audio.src = track.file;
    songTitleEl.textContent = track.title;
    artistNameEl.textContent = track.artist;
    progress.style.width = '0%';
    currentTimeEl.textContent = '0:00';
    totalTimeEl.textContent = '0:00';
    statusEl.innerHTML = `<i class="fa-solid fa-music"></i> ${track.title}`;
    renderPlaylist();
}

function togglePlay() {
    if (playlist.length === 0) return;
    if (!audio.src || audio.src === '') loadTrack(currentIndex);

    if (isPlaying) {
        audio.pause();
        playBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        statusEl.innerHTML = '<i class="fa-solid fa-pause"></i> На паузе';
    } else {
        audio.play().then(() => {
            playBtn.innerHTML = '<i class="fa-solid fa-pause"></i>';
            statusEl.innerHTML = `<i class="fa-solid fa-play"></i> ${playlist[currentIndex].title}`;
        }).catch(err => {
            console.error(err);
            statusEl.textContent = 'Ошибка воспроизведения файла';
        });
    }
    isPlaying = !isPlaying;
}

function prevTrack() { 
    if (playlist.length === 0) return; 
    currentIndex = (currentIndex - 1 + playlist.length) % playlist.length; 
    loadTrack(currentIndex); 
    if (isPlaying) audio.play(); 
}

function nextTrack() { 
    if (playlist.length === 0) return; 
    currentIndex = (currentIndex + 1) % playlist.length; 
    loadTrack(currentIndex); 
    if (isPlaying) audio.play(); 
}

function renderPlaylist() {
    const container = document.getElementById('playlistsList');
    if (!container) return;
    if (playlists.length === 0) {
        container.innerHTML = '<p class="empty-playlist">Пока нет плейлистов. Создайте первый!</p>';
        return;
    }
    container.innerHTML = '';
    playlists.forEach(pl => {
        const div = document.createElement('div');
        div.className = 'playlist-row-item';

        const info = document.createElement('span');
        info.textContent = (pl.isDefault ? '⭐ ' : '📁 ') + pl.name + ' (' + pl.songs.length + ' песен)';

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 6px;';

        const loadBtn = document.createElement('button');
        loadBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        loadBtn.className = 'pl-play-btn';
        loadBtn.onclick = (e) => { e.stopPropagation(); loadPlaylistById(pl.id); };
        btnGroup.appendChild(loadBtn);

        if (!pl.isDefault) {
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            delBtn.className = 'pl-del-btn';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deletePlaylist(pl.id);
            };
            btnGroup.appendChild(delBtn);
        }

        div.appendChild(info);
        div.appendChild(btnGroup);
        div.onclick = () => loadPlaylistById(pl.id);
        container.appendChild(div);
    });
    // if (!playlistContainer) return;
    // playlistContainer.innerHTML = '';
    // playlist.forEach((track, index) => {
    //     const div = document.createElement('div');
    //     div.className = 'playlist-item' + (index === currentIndex ? ' active' : '');
    //     div.textContent = `${track.title} — ${track.artist}`;
    //     div.onclick = () => { 
    //         currentIndex = index; 
    //         loadTrack(currentIndex); 
    //         if (isPlaying) audio.play(); 
    //     };
    //     playlistContainer.appendChild(div);
        // const loadBtn = document.createElement('button');
        // loadBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        // loadBtn.className = 'pl-play-btn';
        // loadBtn.onclick = (e) => { e.stopPropagation(); loadPlaylistById(pl.id); };
        // btnGroup.appendChild(loadBtn);
        // if (!pl.isDefault) {
        //     const delBtn = document.createElement('button');
        //     delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
        //     delBtn.className = 'pl-del-btn';
        //     delBtn.onclick = (e) => {
        //         e.stopPropagation();
        //         deletePlaylist(pl.id);
        //     };
        //     btnGroup.appendChild(delBtn);
        // }
}

audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        progress.style.width = (audio.currentTime / audio.duration * 100) + '%';
        let m = Math.floor(audio.currentTime / 60), s = Math.floor(audio.currentTime % 60);
        currentTimeEl.textContent = m + ':' + (s < 10 ? '0' : '') + s;
        let tm = Math.floor(audio.duration / 60), ts = Math.floor(audio.duration % 60);
        totalTimeEl.textContent = tm + ':' + (ts < 10 ? '0' : '') + ts;
    }
});
audio.addEventListener('ended', nextTrack);

progressContainer.addEventListener('click', (e) => {
    const rect = progressContainer.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    if (audio.duration) audio.currentTime = percent * audio.duration;
});

volumeSlider.addEventListener('input', () => audio.volume = volumeSlider.value / 100);

playBtn.addEventListener('click', togglePlay);
prevBtn.addEventListener('click', prevTrack);
nextBtn.addEventListener('click', nextTrack);

document.addEventListener('keydown', (e) => { 
    if (e.code === 'Space') { 
        e.preventDefault(); 
        togglePlay(); 
    } 
});

/* фоны */
async function deleteBackground(file) {
    const filePath = `images/backgrounds/${file}`;
    try {
        const result = await ipcRenderer.invoke('delete-background', filePath);
        if (result.success) {
            showToast(`🗑 Фон удалён: ${file}`);
            loadBackgrounds();

            const currentBg = localStorage.getItem('currentBackground');
            if (currentBg === filePath) {
                localStorage.removeItem('currentBackground');
                document.getElementById('app').style.backgroundImage = '';
                showToast('Фон сброшен', 2000);
            }
        } else {
            showToast(`Ошибка: ${result.error}`);
        }
    } catch (e) {
        showToast(`Ошибка удаления: ${e.message}`);
    }
}

async function loadBackgrounds() {
    const container = document.getElementById('backgroundsGrid');
    if (!container) return;

    const files = await ipcRenderer.invoke('get-backgrounds');
    container.innerHTML = '';
    files.forEach(file => {
        const bgPath = `images/backgrounds/${encodeURIComponent(file)}`;
        const card = document.createElement('div');
        card.className = 'bg-card';
        card.dataset.file = file;
        
        const wrapper = document.createElement('div');
        wrapper.className = 'bg-preview-wrapper';

        const preview = document.createElement('div');
        preview.className = 'bg-preview';
        preview.style.backgroundImage = `url('${bgPath}')`;

        const delBtn = document.createElement('button');
        delBtn.className = 'bg-delete';
        delBtn.innerHTML = '✕';
        delBtn.onclick = (e) => {
            e.stopPropagation();
            deleteBackground(file);
        };

        wrapper.appendChild(preview);
        wrapper.appendChild(delBtn);

        const name = document.createElement('span');
        name.className = 'bg-name';
        name.textContent = file.replace(/\.[^.]+$/, '');
        
        card.appendChild(wrapper);
        card.appendChild(name);
        card.onclick = () => applyBackground(bgPath);
        
        container.appendChild(card);
    });
}

function applyBackground(bgPath) {
    const appEl = document.getElementById('app');
    appEl.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.25)), url('${bgPath}')`;
    appEl.style.backgroundSize = 'cover';
    appEl.style.backgroundPosition = 'center';
    appEl.style.backgroundRepeat = 'no-repeat';
    // document.body.style.backgroundImage = `url('${bgPath}')`;
    // document.body.style.backgroundSize = 'cover';
    // document.body.style.backgroundPosition = 'center';
    // document.body.style.backgroundRepeat = 'no-repeat';
    // document.body.style.backgroundAttachment = 'fixed';
    
    localStorage.setItem('currentBackground', bgPath);

    document.querySelectorAll('.bg-card').forEach(card => {
        card.classList.remove('active');
        const preview = card.querySelector('.bg-preview');
        if (preview && preview.style.backgroundImage.includes(bgPath)) {
            card.classList.add('active');
        }
    });
}

loadBackgrounds();
const savedBg = localStorage.getItem('currentBackground');
if (savedBg) applyBackground(savedBg);

async function addBackground() {
    const filePaths = await ipcRenderer.invoke('select-image-dialog');
    if (!filePaths || filePaths.length === 0) return;
    
    const sourcePath = filePaths[0];
    const fileName = path.basename(sourcePath);
    const destPath = `images/backgrounds/${fileName}`;
    
    const result = await ipcRenderer.invoke('copy-file', sourcePath, destPath);
    if (result.success) {
        showToast('Фон добавлен');
        loadBackgrounds();
    } else {
        showToast('❌ Ошибка: ' + result.error);
    }
}

/* плейлисты */
let playlists = [];

async function createPlaylist() {
    const folderPath = await ipcRenderer.invoke('select-folder-dialog');
    if (!folderPath) return;

    const songs = await ipcRenderer.invoke('scan-folder', folderPath);
    if (songs.length === 0) {
        showToast('В выбранной папке нет музыки!');
        return;
    }

    const defaultName = path.basename(folderPath);
    const name = await showModal(defaultName);
    if (!name) return;

    const playlistData = {
        id: Date.now(),
        name: name,
        folder: folderPath,
        songs: songs
    };
    playlists.push(playlistData);
    await ipcRenderer.invoke('save-playlists', playlists);
    renderPlaylistsList();
    showToast('Плейлист ' + name + ' создан!');
}

async function deletePlaylist(id) {
    const pl = playlists.find(p => p.id === id);
    if (!pl) return;

    const confirmed = await showConfirm('Удалить плейлист "' + pl.name + '"?');
    if (!confirmed) return;

    playlists = playlists.filter(p => p.id !== id);
    await ipcRenderer.invoke('save-playlists', playlists);
    renderPlaylistsList();
    showToast('🗑 Плейлист "' + pl.name + '" удалён');

    if (playlists.length === 0) {
        playlist = [];
        renderPlaylist();
        statusEl.textContent = '💡 Нет загруженных плейлистов';
    }
}

function loadPlaylistById(id) {
    const pl = playlists.find(p => p.id === id);
    if (pl) {
        playlist = pl.songs;
        currentIndex = 0;
        renderPlaylist();
        loadTrack(0);
        statusEl.innerHTML = `<i class="fa-solid fa-folder-open"></i> ${pl.name}`;
        switchView('player');
        setTimeout(() => { togglePlay(); }, 200);
    }
}

function renderPlaylistsList() {
    const container = document.getElementById('playlistsList');
    if (!container) return;
    if (playlists.length === 0) {
        container.innerHTML = '<p class="empty-playlist">Пока нет плейлистов. Создайте первый!</p>';
        return;
    }
    container.innerHTML = '';
    playlists.forEach(pl => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 10px 14px; margin-bottom: 8px; background: rgba(255,255,255,0.04); border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s;';
        div.onmouseover = () => div.style.background = 'rgba(255,255,255,0.08)';
        div.onmouseout = () => div.style.background = 'rgba(255,255,255,0.04)';

        const info = document.createElement('span');
        info.textContent = (pl.isDefault ? '⭐ ' : '📁 ') + pl.name + ' (' + pl.songs.length + ' песен)';

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 6px;';

        const loadBtn = document.createElement('button');
        loadBtn.innerHTML = '<i class="fa-solid fa-play"></i>';
        loadBtn.style.cssText = 'background: #e94560; border: none; color: white; padding: 6px 12px; border-radius: 8px; cursor: pointer; font-size: 12px;';
        loadBtn.onclick = (e) => { e.stopPropagation(); loadPlaylistById(pl.id); };
        btnGroup.appendChild(loadBtn);

        if (!pl.isDefault) {
            const delBtn = document.createElement('button');
            delBtn.innerHTML = '<i class="fa-solid fa-trash"></i>';
            delBtn.style.cssText = 'background: #2a2a4a; border: none; color: #ff6b6b; padding: 6px 10px; border-radius: 8px; cursor: pointer; font-size: 12px;';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deletePlaylist(pl.id);
            };
            btnGroup.appendChild(delBtn);
        }

        div.appendChild(info);
        div.appendChild(btnGroup);
        div.onclick = () => loadPlaylistById(pl.id);
        container.appendChild(div);
    });
}

// загрузка плейлистов с обязательным плейлистом
async function loadSavedPlaylists() {
    let saved = await ipcRenderer.invoke('load-playlists');
    if (!saved) saved = [];

    // всегда проверяем системную папку music
    const baseSongs = await ipcRenderer.invoke('get-songs');
    const hasDefault = saved.some(p => p.id === 'default');

    if (!hasDefault && baseSongs && baseSongs.length > 0) {
        const defaultPlaylist = {
            id: 'default',
            name: 'Моя музыка',
            folder: 'music',
            songs: baseSongs,
            isDefault: true
        };
        saved.unshift(defaultPlaylist);
        await ipcRenderer.invoke('save-playlists', saved);
    }

    playlists = saved;
    renderPlaylistsList();

    if (playlists.length > 0 && playlists[0].songs.length > 0) {
        playlist = playlists[0].songs;
        renderPlaylist();
        loadTrack(0);
        statusEl.innerHTML = `<i class="fa-solid fa-folder"></i> ${playlists[0].name}`;
    } else {
        statusEl.textContent = 'Создайте плейлист из папки';
    }
}

async function addFilesToPlaylist() {
    if (playlists.length === 0) {
        showToast('Сначала создайте плейлист!');
        return;
    }

    let targetPlaylistId;
    if (playlists.length === 1) {
        targetPlaylistId = playlists[0].id;
    } else {
        const names = playlists.map((p, i) => `${i + 1}. ${p.name}`).join('\n');
        const choice = prompt('Введите номер плейлиста для добавления песен:\n' + names);
        if (!choice) return;
        const idx = parseInt(choice) - 1;
        if (isNaN(idx) || idx < 0 || idx >= playlists.length) {
            showToast('Неверный номер!');
            return;
        }
        targetPlaylistId = playlists[idx].id;
    }

    const filePaths = await ipcRenderer.invoke('select-files-dialog');
    if (!filePaths || filePaths.length === 0) return;

    const newSongs = filePaths.map(filePath => {
        const fileName = path.basename(filePath);
        const name = fileName.replace(/\.mp3$/i, '');
        let artist = 'Неизвестен', title = name;
        if (name.includes(' - ')) {
            const parts = name.split(' - ');
            artist = parts[0];
            title = parts.slice(1).join(' - ');
        }
        return { title, artist, file: filePath };
    });

    const target = playlists.find(p => p.id === targetPlaylistId);
    if (target) {
        target.songs = target.songs.concat(newSongs);
        await ipcRenderer.invoke('save-playlists', playlists);
        renderPlaylistsList();
        showToast(`Добавлено ${newSongs.length} песен в плейлист "${target.name}"`);
    }
}

/* переключение страниц */
function switchView(view) {
    document.querySelectorAll('.titlebar-tab').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.querySelector(`.titlebar-tab[data-view="${view}"]`);
    if (activeTab) activeTab.classList.add('active');

    const playerContent = document.querySelector('.player-content');
    const playlistContent = document.querySelector('.playlist-content');
    const settingsView = document.getElementById('settingsView');

    playerContent.style.display = 'none';
    playlistContent.style.display = 'none';
    settingsView.style.display = 'none';

    if (view === 'player') playerContent.style.display = 'flex';
    else if (view === 'playlist') playlistContent.style.display = 'flex';
    else if (view === 'settings') settingsView.style.display = 'flex';
}

function windowMinimize() { ipcRenderer.send('window-minimize'); }
function windowClose() { ipcRenderer.send('window-close'); }

loadSavedPlaylists();

/* модальные окна */
let modalResolve = null;
function showModal(placeholder = 'Введите название...') {
    return new Promise((resolve) => {
        const modal = document.getElementById('modal');
        const input = document.getElementById('modalInput');
        const confirmBtn = document.getElementById('modalConfirmBtn');
        
        input.value = '';
        input.placeholder = placeholder;
        modal.style.display = 'flex';
        input.focus();
        
        modalResolve = (value) => {
            modal.style.display = 'none';
            resolve(value);
        };
        
        confirmBtn.onclick = () => {
            const val = input.value.trim();
            if (val) modalResolve(val);
            else {
                input.style.borderColor = '#e94560';
                setTimeout(() => input.style.borderColor = '', 1000);
            }
        };
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') confirmBtn.click();
            if (e.key === 'Escape') closeModal();
        };
    });
}

function closeModal() {
    if (modalResolve) modalResolve(null);
    modalResolve = null;
}

let confirmResolve = null;
function showConfirm(message) {
    return new Promise((resolve) => {
        document.getElementById('confirmMessage').textContent = message;
        document.getElementById('confirmModal').style.display = 'flex';
        confirmResolve = resolve;
    });
}
function confirmResponse(result) {
    document.getElementById('confirmModal').style.display = 'none';
    if (confirmResolve) confirmResolve(result);
    confirmResolve = null;
}

let toastTimeout = null;
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toast.style.opacity = '0';
        setTimeout(() => { toast.style.display = 'none'; }, 200);
    }
    toastMessage.textContent = message;
    toast.style.display = 'block';
    toast.style.opacity = '1';
    toastTimeout = setTimeout(() => {
        toast.style.opacity = '0';
        setTimeout(() => {
            toast.style.display = 'none';
            toastTimeout = null;
        }, 300);
    }, duration);
}

/* управление темами и акцентами */
const themeSelect = document.getElementById('themeSelect');
const accentColorInput = document.getElementById('accentColorInput');

function setAccentColor(color) {
    document.documentElement.style.setProperty('--user-accent', color);
    localStorage.setItem('appAccentColor', color);
}

function applyTheme(theme) {
    document.body.classList.remove('theme-dark', 'theme-light', 'theme-glass');
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('appTheme', theme);
}

if (themeSelect) {
    themeSelect.addEventListener('change', () => {
        applyTheme(themeSelect.value);
    });
}

if (accentColorInput) {
    accentColorInput.addEventListener('input', (e) => {
        setAccentColor(e.target.value);
    });
}

function saveSettings() {
    const selectedTheme = themeSelect ? themeSelect.value : 'glass';
    applyTheme(selectedTheme);
    if (accentColorInput) {
        setAccentColor(accentColorInput.value);
    }
    showToast('Настройки сохранены!');
}

function loadSettings() {
    const savedTheme = localStorage.getItem('appTheme') || 'glass';
    const savedAccent = localStorage.getItem('appAccentColor') || '#6c7086';

    if (themeSelect) themeSelect.value = savedTheme;
    if (accentColorInput) accentColorInput.value = savedAccent;

    applyTheme(savedTheme);
    setAccentColor(savedAccent);
}

loadSettings();