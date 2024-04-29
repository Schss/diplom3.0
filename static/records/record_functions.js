// Функция для отправки рекорда на сервер
function submitRecord(name, score, game_name) {
    const playerHash = localStorage.getItem('playerHash');
    const recordData = {
        name: name,
        game: game_name,
        score: score
    };

    // Если hash существует, добавляем его в объект данных
    if (playerHash) {
        recordData.hash = playerHash;
    }

    fetch('/api/record', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(recordData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.error === 'name already registered with a different hash') {
            // Запрашиваем новое имя пользователя
            const newName = prompt("Name already registered by another user. Please enter a new name:");
            if (newName) {
                submitRecord(newName, score, game_name);
            }
        } else {
            if (data.hash) {
                // Сохраняем хеш в localStorage для последующих запросов
                localStorage.setItem('playerHash', data.hash);
            }
            console.log('Record submitted:', data);
            loadRecords(game_name);
        }
    })
    .catch(error => console.error('Error submitting record:', error));
}


// Функция для загрузки таблицы рекордов
function loadRecords(game_name) {
    fetch('/api/records?game=' + game_name)
    .then(response => response.json())
    .then(data => {
        console.log('Records loaded:', data);
        displayRecords(data, game_name);
    })
    .catch(error => console.error('Error loading records:', error));
}

function displayRecords(records, game_name) {
    // Создаем или находим элемент для отображения рекордов
    let recordsTable = document.getElementById('recordsTable');
    if (!recordsTable) {
        recordsTable = document.createElement('div');
        recordsTable.id = 'records-table';
        document.body.appendChild(recordsTable);
    }

    // Очищаем предыдущие записи
    recordsTable.innerHTML = '';

    let title = document.createElement('h2');
    title.textContent = 'Top Scores for ' + game_name;
    recordsTable.appendChild(title);

    // Создаем список для отображения рекордов
    let list = document.createElement('ol');
    records.forEach(record => {
        let listItem = document.createElement('li');
        listItem.textContent = `${record.name}: ${record.score}`;
        list.appendChild(listItem);
    });
    recordsTable.appendChild(list);
}

function updateRecordDisplay(record, game_name) {
    let recordDisplay = document.getElementById('record-display');
    if (!recordDisplay) {
        recordDisplay = document.createElement('div');
        recordDisplay.id = 'record-display';
        document.body.appendChild(recordDisplay);
    }
    recordDisplay.textContent = 'Record: ' + record;
    recordDisplay.classList.add('record-update-animation');

    // Удаление класса анимации после её завершения
    setTimeout(() => {
        recordDisplay.classList.remove('record-update-animation');
    }, 2000); // Время до 2 секунд
    loadRecords(game_name);
}

function writeRecord(record, game_name) {
    // Создание уникального ключа для каждой игры
    const recordKey = 'maxScore_' + game_name;

    // Сохранение рекорда в localStorage с использованием созданного ключа
    localStorage.setItem(recordKey, record);

    // Обновление отображения рекорда
    updateRecordDisplay(record);

    // Запрос имени пользователя, если достигнут новый рекорд
    const playerName = prompt("New high score for " + game_name + "! Enter your name:");
    if (playerName) {
        submitRecord(playerName, record, game_name);
    }
}

export {updateRecordDisplay, submitRecord, writeRecord, loadRecords};