// Конфигурация
const CONFIG = {
    GITHUB_REPO: 'ваш-логин/название-репозитория',
    GITHUB_TOKEN: '', // Опционально, для приватного репозитория
    BOOKS_FOLDER: 'books',
    BOOKS_LIST_FILE: 'books.json'
};

// Основной скрипт плеера
document.addEventListener('DOMContentLoaded', async function() {
    // Элементы DOM
    const audioPlayer = document.getElementById('audioPlayer');
    const playBtn = document.getElementById('playBtn');
    const prevBtn = document.getElementById('prevBtn');
    const nextBtn = document.getElementById('nextBtn');
    const rewindBack = document.getElementById('rewindBack');
    const rewindForward = document.getElementById('rewindForward');
    const progress = document.getElementById('progress');
    const progressSlider = document.getElementById('progressSlider');
    const currentTimeEl = document.getElementById('currentTime');
    const durationEl = document.getElementById('duration');
    const volumeSlider = document.getElementById('volumeSlider');
    const speedSelect = document.getElementById('speedSelect');
    const nowPlaying = document.getElementById('nowPlaying');
    const bookList = document.getElementById('bookList');
    const searchInput = document.getElementById('searchInput');
    const refreshBtn = document.getElementById('refreshBtn');
    const bookCount = document.getElementById('bookCount');
    const totalDuration = document.getElementById('totalDuration');
    const totalBooks = document.getElementById('totalBooks');
    const volumeIcon = document.getElementById('volumeIcon');
    
    // Переменные
    let books = [];
    let currentBookIndex = -1;
    let filteredBooks = [];
    let bookmarks = {};
    
    // Инициализация
    await initPlayer();
    
    // Функция инициализации
    async function initPlayer() {
        await loadBooks();
        renderBookList();
        setupEventListeners();
        loadBookmarks();
        
        // Если есть книга в localStorage (последняя слушанная)
        const lastBook = localStorage.getItem('lastBook');
        if (lastBook) {
            const index = books.findIndex(b => b.id === lastBook);
            if (index !== -1) {
                loadBook(index, false); // Загружаем, но не воспроизводим
            }
        }
    }
    
    // Загрузка списка книг
    async function loadBooks() {
        try {
            // Пробуем несколько источников
            
            // 1. GitHub (через raw.githubusercontent.com)
            const githubBooks = await loadFromGitHub();
            if (githubBooks.length > 0) {
                books = githubBooks;
                console.log(`Загружено ${books.length} книг с GitHub`);
                return;
            }
            
            // 2. localStorage (резервный вариант)
            const localBooks = loadFromLocalStorage();
            if (localBooks.length > 0) {
                books = localBooks;
                console.log(`Загружено ${books.length} книг из localStorage`);
                return;
            }
            
            // 3. Примерные книги (для демо)
            books = getDemoBooks();
            console.log('Загружены демо-книги');
            
        } catch (error) {
            console.error('Ошибка загрузки книг:', error);
            books = getDemoBooks();
        }
        
        filteredBooks = [...books];
        updateStats();
    }
    
    // Загрузка с GitHub
    async function loadFromGitHub() {
        try {
            // Пробуем загрузить books.json
            const booksJsonUrl = `https://raw.githubusercontent.com/${CONFIG.GITHUB_REPO}/main/${CONFIG.BOOKS_LIST_FILE}`;
            const response = await fetch(booksJsonUrl);
            
            if (!response.ok) {
                // Если файла нет, пробуем сканировать папку books
                return await scanGitHubFolder();
            }
            
            const data = await response.json();
            return data.books.map(book => ({
                ...book,
                url: `https://raw.githubusercontent.com/${CONFIG.GITHUB_REPO}/main/${CONFIG.BOOKS_FOLDER}/${encodeURIComponent(book.file)}`
            }));
            
        } catch (error) {
            console.log('Не удалось загрузить с GitHub:', error);
            return [];
        }
    }
    
    // Сканирование папки GitHub
    async function scanGitHubFolder() {
        try {
            // Это упрощенный метод - на GitHub Pages сложно сканировать папки
            // В реальном проекте лучше вести books.json вручную
            
            // Пример структуры books.json:
            /*
            {
                "books": [
                    {
                        "id": "1",
                        "title": "Название книги",
                        "file": "book1.mp3",
                        "author": "Автор",
                        "duration": 3600
                    }
                ]
            }
            */
            
            return [];
        } catch (error) {
            return [];
        }
    }
    
    // Загрузка из localStorage
    function loadFromLocalStorage() {
        try {
            const saved = localStorage.getItem('audiobooks');
            if (!saved) return [];
            
            const data = JSON.parse(saved);
            return data.map(book => ({
                ...book,
                url: book.dataUrl, // Используем dataUrl из localStorage
                duration: book.duration || 0
            }));
        } catch (error) {
            console.error('Ошибка загрузки из localStorage:', error);
            return [];
        }
    }
    
    // Демо-книги
    function getDemoBooks() {
        return [
            {
                id: 'demo1',
                title: 'Пример книги 1',
                author: 'Автор',
                file: 'demo1.mp3',
                duration: 300,
                url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3'
            },
            {
                id: 'demo2',
                title: 'Пример книги 2',
                author: 'Автор',
                file: 'demo2.mp3',
                duration: 420,
                url: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3'
            }
        ];
    }
    
    // Рендеринг списка книг
    function renderBookList() {
        bookList.innerHTML = '';
        
        if (filteredBooks.length === 0) {
            bookList.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-headphones"></i>
                    <p>Книги не найдены</p>
                    ${books.length === 0 ? 
                        '<a href="upload.html" class="btn-primary"><i class="fas fa-upload"></i> Загрузить книги</a>' : 
                        '<button id="clearSearch" class="btn-secondary"><i class="fas fa-times"></i> Очистить поиск</button>'}
                </div>
            `;
            
            if (books.length > 0) {
                document.getElementById('clearSearch')?.addEventListener('click', () => {
                    searchInput.value = '';
                    filteredBooks = [...books];
                    renderBookList();
                    updateStats();
                });
            }
            
            return;
        }
        
        filteredBooks.forEach((book, index) => {
            const bookItem = document.createElement('div');
            bookItem.className = `book-item ${book.id === currentBookIndex ? 'active' : ''}`;
            bookItem.dataset.id = book.id;
            
            const duration = book.duration ? formatTime(book.duration) : '--:--';
            const author = book.author ? `<div class="book-author">${book.author}</div>` : '';
            
            bookItem.innerHTML = `
                <div class="book-icon">
                    <i class="fas fa-book"></i>
                </div>
                <div class="book-info">
                    <div class="book-title">${book.title}</div>
                    ${author}
                    <div class="book-meta">
                        <span class="book-duration"><i class="far fa-clock"></i> ${duration}</span>
                        ${book.size ? `<span class="book-size"><i class="fas fa-database"></i> ${formatFileSize(book.size)}</span>` : ''}
                    </div>
                </div>
                <div class="book-actions">
                    <button class="book-action-btn bookmark-action" title="Закладки">
                        <i class="far fa-bookmark"></i>
                    </button>
                </div>
            `;
            
            // Клик по книге
            bookItem.addEventListener('click', (e) => {
                if (!e.target.closest('.book-action-btn')) {
                    const globalIndex = books.findIndex(b => b.id === book.id);
                    if (globalIndex !== -1) {
                        playBook(globalIndex);
                    }
                }
            });
            
            // Кнопка закладок
            const bookmarkBtn = bookItem.querySelector('.bookmark-action');
            bookmarkBtn.addEventListener('click', () => {
                showBookmarksForBook(book.id);
            });
            
            bookList.appendChild(bookItem);
        });
        
        updateStats();
    }
    
    // Показать закладки для книги
    function showBookmarksForBook(bookId) {
        const book = books.find(b => b.id === bookId);
        if (!book) return;
        
        const bookBookmarks = bookmarks[bookId] || [];
        
        if (bookBookmarks.length === 0) {
            alert(`Для книги "${book.title}" нет закладок`);
            return;
        }
        
        let message = `Закладки для "${book.title}":\n\n`;
        bookBookmarks.forEach((bm, i) => {
            message += `${i + 1}. ${bm.name} - ${formatTime(bm.time)}\n`;
        });
        
        message += '\nПерейти к закладке:';
        
        const bookmarkNumber = prompt(message, '1');
        if (bookmarkNumber && !isNaN(bookmarkNumber)) {
            const index = parseInt(bookmarkNumber) - 1;
            if (index >= 0 && index < bookBookmarks.length) {
                if (currentBookIndex !== bookId) {
                    const globalIndex = books.findIndex(b => b.id === bookId);
                    if (globalIndex !== -1) {
                        playBook(globalIndex);
                    }
                }
                setTimeout(() => {
                    audioPlayer.currentTime = bookBookmarks[index].time;
                }, 500);
            }
        }
    }
    
    // Загрузка закладок
    function loadBookmarks() {
        const saved = localStorage.getItem('audiobookmarks');
        if (saved) {
            bookmarks = JSON.parse(saved);
        }
    }
    
    // Сохранение закладок
    function saveBookmarks() {
        localStorage.setItem('audiobookmarks', JSON.stringify(bookmarks));
    }
    
    // Добавление закладки
    function addBookmark() {
        if (currentBookIndex === -1 || !audioPlayer.src) return;
        
        const book = books[currentBookIndex];
        if (!book) return;
        
        const bookmarkName = prompt('Введите название закладки:', 
            `Закладка на ${formatTime(audioPlayer.currentTime)}`);
        
        if (bookmarkName) {
            if (!bookmarks[book.id]) {
                bookmarks[book.id] = [];
            }
            
            bookmarks[book.id].push({
                name: bookmarkName,
                time: audioPlayer.currentTime,
                date: new Date().toISOString()
            });
            
            saveBookmarks();
            
            // Показать уведомление
            showNotification(`Закладка "${bookmarkName}" добавлена`);
        }
    }
    
    // Уведомление
    function showNotification(message) {
        const notification = document.createElement('div');
        notification.className = 'notification';
        notification.textContent = message;
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4cc9f0;
            color: white;
            padding: 15px 20px;
            border-radius: 10px;
            z-index: 1000;
            animation: slideIn 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        setTimeout(() => {
            notification.style.animation = 'slideOut 0.3s ease';
            setTimeout(() => notification.remove(), 300);
        }, 3000);
    }
    
    // Форматирование времени
    function formatTime(seconds) {
        if (isNaN(seconds)) return '0:00';
        
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = Math.floor(seconds % 60);
        
        if (hours > 0) {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }
    
    // Форматирование размера файла
    function formatFileSize(bytes) {
        if (!bytes) return '';
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
    
    // Воспроизведение книги
    function playBook(index) {
        if (index < 0 || index >= books.length) return;
        
        currentBookIndex = index;
        const book = books[currentBookIndex];
        
        audioPlayer.src = book.url;
        nowPlaying.textContent = book.title;
        document.getElementById('currentBookInfo').textContent = 
            book.author ? `Автор: ${book.author}` : '';
        
        // Сохраняем последнюю книгу
        localStorage.setItem('lastBook', book.id);
        
        // Воспроизведение
        audioPlayer.play().catch(e => {
            console.log("Автовоспроизведение заблокировано");
        });
        
        // Обновление интерфейса
        updatePlayButton();
        highlightCurrentBook();
        
        // Установка громкости и скорости
        audioPlayer.volume = volumeSlider.value / 100;
        audioPlayer.playbackRate = parseFloat(speedSelect.value);
    }
    
    // Подсветка текущей книги
    function highlightCurrentBook() {
        document.querySelectorAll('.book-item').forEach(item => {
            item.classList.remove('active');
            if (item.dataset.id === books[currentBookIndex]?.id) {
                item.classList.add('active');
                item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        });
    }
    
    // Обновление кнопки play/pause
    function updatePlayButton() {
        const icon = playBtn.querySelector('i');
        if (audioPlayer.paused || !audioPlayer.src) {
            icon.className = 'fas fa-play';
            playBtn.title = 'Воспроизвести';
        } else {
            icon.className = 'fas fa-pause';
            playBtn.title = 'Пауза';
        }
    }
    
    // Следующая книга
    function nextBook() {
        if (books.length === 0) return;
        
        let nextIndex = currentBookIndex + 1;
        if (nextIndex >= books.length) {
            nextIndex = 0;
        }
        playBook(nextIndex);
    }
    
    // Предыдущая книга
    function prevBook() {
        if (books.length === 0) return;
        
        let prevIndex = currentBookIndex - 1;
        if (prevIndex < 0) {
            prevIndex = books.length - 1;
        }
        playBook(prevIndex);
    }
    
    // Перемотка назад
    function rewindBackward() {
        audioPlayer.currentTime = Math.max(0, audioPlayer.currentTime - 10);
    }
    
    // Перемотка вперед
    function rewindForward() {
        audioPlayer.currentTime = Math.min(audioPlayer.duration, audioPlayer.currentTime + 10);
    }
    
    // Обновление прогресса
    function updateProgress() {
        if (!audioPlayer.duration || isNaN(audioPlayer.duration)) return;
        
        const percent = (audioPlayer.currentTime / audioPlayer.duration) * 100;
        progress.style.width = `${percent}%`;
        progressSlider.value = percent;
        
        currentTimeEl.textContent = formatTime(audioPlayer.currentTime);
        durationEl.textContent = formatTime(audioPlayer.duration);
        
        // Сохраняем позицию
        if (currentBookIndex !== -1) {
            const book = books[currentBookIndex];
            if (book) {
                localStorage.setItem(`progress_${book.id}`, audioPlayer.currentTime);
            }
        }
    }
    
    // Перемотка по слайдеру
    function seekTo(e) {
        if (!audioPlayer.duration) return;
        const percent = e.target.value;
        audioPlayer.currentTime = (percent / 100) * audioPlayer.duration;
    }
    
    // Обновление статистики
    function updateStats() {
        bookCount.textContent = `${filteredBooks.length} книг`;
        totalBooks.textContent = filteredBooks.length;
        
        const totalSeconds = filteredBooks.reduce((sum, book) => sum + (book.duration || 0), 0);
        totalDuration.textContent = formatTime(totalSeconds);
    }
    
    // Поиск книг
    function searchBooks(query) {
        if (!query.trim()) {
            filteredBooks = [...books];
        } else {
            const q = query.toLowerCase();
            filteredBooks = books.filter(book => 
                book.title.toLowerCase().includes(q) ||
                (book.author && book.author.toLowerCase().includes(q))
            );
        }
        renderBookList();
    }
    
    // Настройка обработчиков событий
    function setupEventListeners() {
        // Кнопки управления
        playBtn.addEventListener('click', () => {
            if (!audioPlayer.src) {
                if (books.length > 0) playBook(0);
                return;
            }
            
            if (audioPlayer.paused) {
                audioPlayer.play();
            } else {
                audioPlayer.pause();
            }
            updatePlayButton();
        });
        
        prevBtn.addEventListener('click', prevBook);
        nextBtn.addEventListener('click', nextBook);
        rewindBack.addEventListener('click', rewindBackward);
        rewindForward.addEventListener('click', rewindForward);
        
        // Аудио события
        audioPlayer.addEventListener('play', updatePlayButton);
        audioPlayer.addEventListener('pause', updatePlayButton);
        audioPlayer.addEventListener('timeupdate', updateProgress);
        audioPlayer.addEventListener('ended', nextBook);
        audioPlayer.addEventListener('loadedmetadata', () => {
            if (currentBookIndex !== -1) {
                const book = books[currentBookIndex];
                const savedProgress = localStorage.getItem(`progress_${book.id}`);
                if (savedProgress && parseFloat(savedProgress) > 0) {
                    audioPlayer.currentTime = parseFloat(savedProgress);
                }
            }
        });
        
        // Элементы управления
        progressSlider.addEventListener('input', seekTo);
        
        volumeSlider.addEventListener('input', () => {
            const volume = volumeSlider.value / 100;
            audioPlayer.volume = volume;
            
            // Обновление иконки громкости
            if (volume === 0) {
                volumeIcon.className = 'fas fa-volume-mute';
            } else if (volume < 0.5) {
                volumeIcon.className = 'fas fa-volume-down';
            } else {
                volumeIcon.className = 'fas fa-volume-up';
            }
        });
        
        speedSelect.addEventListener('change', () => {
            audioPlayer.playbackRate = parseFloat(speedSelect.value);
        });
        
        // Поиск
        searchInput.addEventListener('input', (e) => {
            searchBooks(e.target.value);
        });
        
        // Обновление списка
        refreshBtn.addEventListener('click', async () => {
            refreshBtn.querySelector('i').className = 'fas fa-spinner fa-spin';
            await loadBooks();
            renderBookList();
            setTimeout(() => {
                refreshBtn.querySelector('i').className = 'fas fa-sync-alt';
            }, 1000);
        });
        
        // Добавление закладки
        document.getElementById('addBookmarkBtn')?.addEventListener('click', addBookmark);
        
        // Горячие клавиши
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
            
            switch(e.code) {
                case 'Space':
                    e.preventDefault();
                    playBtn.click();
                    break;
                case 'ArrowLeft':
                    if (e.ctrlKey) rewindBackward();
                    break;
                case 'ArrowRight':
                    if (e.ctrlKey) rewindForward();
                    break;
                case 'ArrowUp':
                    volumeSlider.value = Math.min(100, parseInt(volumeSlider.value) + 10);
                    volumeSlider.dispatchEvent(new Event('input'));
                    break;
                case 'ArrowDown':
                    volumeSlider.value = Math.max(0, parseInt(volumeSlider.value) - 10);
                    volumeSlider.dispatchEvent(new Event('input'));
                    break;
            }
        });
        
        // Касания для мобильных
        let touchStartX = 0;
        let touchStartTime = 0;
        
        document.addEventListener('touchstart', (e) => {
            touchStartX = e.touches[0].clientX;
            touchStartTime = Date.now();
        });
        
        document.addEventListener('touchend', (e) => {
            const touchEndX = e.changedTouches[0].clientX;
            const touchEndTime = Date.now();
            const deltaX = touchEndX - touchStartX;
            const deltaTime = touchEndTime - touchStartTime;
            
            // Быстрый свайп влево/вправо для перемотки
            if (deltaTime < 300) {
                if (deltaX > 50) {
                    // Свайп вправо - назад
                    rewindBackward();
                } else if (deltaX < -50) {
                    // Свайп влево - вперед
                    rewindForward();
                }
            }
        });
    }
    
    // Создание books.json для GitHub
    function generateBooksJson() {
        const booksData = {
            lastUpdated: new Date().toISOString(),
            books: books.map(book => ({
                id: book.id,
                title: book.title,
                author: book.author,
                file: book.file,
                duration: book.duration,
                size: book.size
            }))
        };
        
        const dataStr = JSON.stringify(booksData, null, 2);
        const dataBlob = new Blob([dataStr], { type: 'application/json' });
        
        // Скачивание файла
        const downloadLink = document.createElement('a');
        downloadLink.href = URL.createObjectURL(dataBlob);
        downloadLink.download = 'books.json';
        downloadLink.click();
    }
});