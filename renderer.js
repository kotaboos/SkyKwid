const { ipcRenderer } = require('electron');
let playlist = [], currentIndex = 0, isPlaying = false;
const audio = new Audio();

ipcRenderer.invoke('get-songs').then(songs => {
    playlist = songs;
    if (playlist.length > 0) {
        renderPlaylist();
        loadTrack(0);
        statusEl.textContent = 'Готов к воспроизведению';
    } else {
        statusEl.textContent = '❌ Нет MP3 в папке music';
    }
});

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
    renderPlaylist();
}

function togglePlay() {
    if (playlist.length === 0) return;
    if (audio.src === '') loadTrack(currentIndex);
    if (isPlaying) {
        audio.pause();
        playBtn.textContent = '&#xf04b;';
        statusEl.textContent = '&#xf04c; На паузе';
    } else {
        audio.play().catch(() => statusEl.textContent = '❌ Ошибка файла');
        playBtn.textContent = '&#xf04c;';
        statusEl.textContent = '&#xf04b;' + playlist[currentIndex].title;
    }
    isPlaying = !isPlaying;
}

function prevTrack() { if (playlist.length === 0) return; currentIndex = (currentIndex - 1 + playlist.length) % playlist.length; loadTrack(currentIndex); if (isPlaying) audio.play(); }
function nextTrack() { if (playlist.length === 0) return; currentIndex = (currentIndex + 1) % playlist.length; loadTrack(currentIndex); if (isPlaying) audio.play(); }

function renderPlaylist() {
    playlistContainer.innerHTML = '';
    playlist.forEach((track, index) => {
        const div = document.createElement('div');
        div.className = 'playlist-item' + (index === currentIndex ? ' active' : '');
        div.textContent = track.title + ' — ' + track.artist;
        div.onclick = () => { currentIndex = index; loadTrack(currentIndex); if (isPlaying) audio.play(); };
        playlistContainer.appendChild(div);
    });
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
document.addEventListener('keydown', (e) => { if (e.code === 'Space') { e.preventDefault(); togglePlay(); } });

// плейлисты из папок
let playlists = [];

async function createPlaylist() {
    const folderPath = await ipcRenderer.invoke('select-folder-dialog');
    if (!folderPath) return;

    const songs = await ipcRenderer.invoke('scan-folder', folderPath);
    if (songs.length === 0) {
        showToast('В выбранной папке нет музыки!');
        return;
    }

    const name = await showModal(folderPath.split('\\').pop());
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
        statusEl.textContent = '🎵 Загружен плейлист: ' + pl.name;
        switchView('player');
        setTimeout(() => {
            togglePlay();
        }, 200);
    }
}

function renderPlaylistsList() {
    const container = document.getElementById('playlistsList');
    if (!container) return;
    if (playlists.length === 0) {
        container.innerHTML = '<p style="color: #ffffff; text-align: center">Пока нет плейлистов. Создайте первый!</p>';
        return;
    }
    container.innerHTML = '';
    playlists.forEach(pl => {
        const div = document.createElement('div');
        div.style.cssText = 'padding: 10px 14px; margin-bottom: 8px; background: rgba(255,255,255,0.04); border-radius: 12px; cursor: pointer; display: flex; justify-content: space-between; align-items: center; transition: 0.2s;';
        div.onmouseover = () => div.style.background = 'rgba(255,255,255,0.08)';
        div.onmouseout = () => div.style.background = 'rgba(255,255,255,0.04)';

        const info = document.createElement('span');
        info.textContent = '📁 ' + pl.name + ' (' + pl.songs.length + ' песен)';
        if (pl.isDefault) {
            info.textContent += ' ⭐';
        }

        const btnGroup = document.createElement('div');
        btnGroup.style.cssText = 'display: flex; gap: 6px;';

        const loadBtn = document.createElement('button');
        loadBtn.textContent = '▶';
        loadBtn.style.cssText = 'background: #e94560; border: none; color: white; padding: 4px 12px; border-radius: 8px; cursor: pointer; font-size: 13px;';
        loadBtn.onclick = (e) => { e.stopPropagation(); loadPlaylistById(pl.id); };
        btnGroup.appendChild(loadBtn);

        if (!pl.isDefault) {
            const delBtn = document.createElement('button');
            delBtn.textContent = '🗑';
            delBtn.style.cssText = 'background: #2a2a4a; border: none; color: #ff6b6b; padding: 4px 10px; border-radius: 8px; cursor: pointer; font-size: 13px;';
            delBtn.onclick = (e) => {
                e.stopPropagation();
                deletePlaylist(pl.id);
            };
            btnGroup.appendChild(delBtn);
        }

        // const btn = document.createElement('button');
        // btn.textContent = '▶ Загрузить';
        // btn.style.cssText = 'background: #e94560; border: none; color: white; padding: 4px 12px; border-radius: 8px; cursor: pointer; font-size: 13px;';
        // btn.onclick = (e) => { e.stopPropagation(); loadPlaylistById(pl.id); };

        div.appendChild(info);
        div.appendChild(btnGroup);
        div.onclick = () => loadPlaylistById(pl.id);
        container.appendChild(div);
    });
}

// загружаем сохранённые плейлисты при старте
async function loadSavedPlaylists() {
    const saved = await ipcRenderer.invoke('load-playlists');
    if (saved && saved.length > 0) {
        playlists = saved;
        renderPlaylistsList();
        if (playlists[0] && playlists[0].songs.length > 0) {
            playlist = playlists[0].songs;
            renderPlaylist();
            loadTrack(0);
            statusEl.textContent = '🎵 Загружен плейлист: ' + playlists[0].name;
        }
        return;
    }

    const songs = await ipcRenderer.invoke('get-songs');
    if (songs && songs.length > 0) {
        const defaultPlaylist = {
            id: 'default',
            name: '🎵 Моя музыка',
            folder: 'music',
            songs: songs,
            isDefault: true
        };
        playlists = [defaultPlaylist];
        await ipcRenderer.invoke('save-playlists', playlists);
        renderPlaylistsList();

        playlist = songs;
        renderPlaylist();
        loadTrack(0);
        statusEl.textContent = '🎵 Загружено: ' + songs.length + ' песен из "Моя музыка"';
    } else {

        playlists = [];
        renderPlaylistsList();
        statusEl.textContent = '💡 Добавьте MP3 в папку music или создайте плейлист';
    }
}

// добавление файлов
async function addFiles() {
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

    playlist = playlist.concat(newSongs);
    renderPlaylist();
    if (playlist.length > 0 && audio.src === '') {
        loadTrack(0);
    }
    statusEl.textContent = '✅ Добавлено песен: ' + newSongs.length;
}

// переключение вкладок
function switchView(view) {
    document.querySelectorAll('.titlebar-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    const activeTab = document.querySelector(`.titlebar-tab[data-view="${view}"]`);
    if (activeTab) activeTab.classList.add('active');

    const playerContent = document.querySelector('.player-content');
    const playlistContent = document.querySelector('.playlist-content');

    document.querySelectorAll('.content-page').forEach(page => page.style.display = 'none');

    if (view === 'player') {
        // показываем плеер
        playerContent.style.display = 'flex';
        playlistContent.style.display = 'none';

        // убираем и возвращаем класс
        const player = document.querySelector('.player');
        if (player) {
            player.classList.remove('player');
            void player.offsetHeight;
            player.classList.add('player');
        }

        // доп пересчёт через 100 мс
        setTimeout(() => {
            if (playerContent) {
                playerContent.style.display = 'none';
                void playerContent.offsetHeight;
                playerContent.style.display = 'flex';
            }
        }, 100);

    } else if (view === 'playlist') {
        playerContent.style.display = 'none';
        playlistContent.style.display = 'flex';
        renderPlaylistsList();
    } else if (view === 'settings') {
        playerContent.style.display = 'none';
        playlistContent.style.display = 'none';
        document.getElementById('settingsView').style.display = 'flex';
        loadSettings();
    }
}

function windowMinimize() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('window-minimize');
}
function windowMaximize() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('window-maximize');
}
function windowClose() {
    const { ipcRenderer } = require('electron');
    ipcRenderer.send('window-close');
}

window.addEventListener('resize', () => {
    const player = document.querySelector('.player');
    if (player && document.querySelector('.player-content').style.display !== 'none') {
        player.style.transform = 'scale(0.99)';
        requestAnimationFrame(() => {
            player.style.transform = 'scale(1)';
        });
    }
});

loadSavedPlaylists();

// добавить файлы в плейлист
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
        const choice = prompt('Введите номер плейлиста для добавления файлов:\n' + names);
        if (!choice) return;
        const idx = parseInt(choice) - 1;
        if (isNaN(idx) || idx < 0 || idx >= playlists.length) {
            showToast('❌ Неверный номер!');
            return;
        }
        targetPlaylistId = playlists[idx].id;
    }

    const filePaths = await ipcRenderer.invoke('select-files-dialog');
    if (!filePaths || filePaths.length === 0) return;

    const newSongs = filePaths.map(filePath => {
        const fileName = filePath.split('\\').pop();
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
        showToast('✅ Добавлено ' + newSongs.length + ' песен в плейлист "' + target.name + '"');
    }
}

// модальное окно
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
        
        // кнопка создать
        confirmBtn.onclick = () => {
            const val = input.value.trim();
            if (val) {
                modalResolve(val);
            } else {
                input.style.borderColor = '#e94560';
                setTimeout(() => input.style.borderColor = '', 1000);
            }
        };
        
        input.onkeydown = (e) => {
            if (e.key === 'Enter') {
                confirmBtn.click();
            }
            if (e.key === 'Escape') {
                closeModal();
            }
        };
    });
}

function closeModal() {
    if (modalResolve) modalResolve(null);
    modalResolve = null;
}

// подтверждение
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

// уведомление
let toastTimeout = null;
function showToast(message, duration = 3000) {
    const toast = document.getElementById('toast');
    const toastMessage = document.getElementById('toastMessage');
    if (toastTimeout) {
        clearTimeout(toastTimeout);
        toast.style.opacity = '0';
        setTimeout(() => { toast.style.display = 'none'; }, 300);
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