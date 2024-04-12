// Глобальные переменные
const gameBoard = document.getElementById('game-board');
const plusCubes = 2; 
let isGameOver = false;
let cubesPerColor;
let numberOfColors;

function generateRandomColor() {
    // Генерация случайного цвета в формате RGB
    const red = Math.floor(Math.random() * 256);
    const green = Math.floor(Math.random() * 256);
    const blue = Math.floor(Math.random() * 256);
    return `rgb(${red},${green},${blue})`;
}

function initializeGame(numberOfColors, cubes) {
    gameBoard.innerHTML = '';  // Очищаем игровое поле

    let colors = [];
    for (let i = 0; i < numberOfColors; i++) {
        colors.push(generateRandomColor());
    }

    const columns = numberOfColors + 1; // Количество столбцов на один больше количества цветов

    // Создание столбцов
    for (let i = 0; i < columns; i++) {
        let column = document.createElement('div');
        column.classList.add('column');
        column.dataset.columnId = i;
        column.onclick = () => selectGroup(column);
        gameBoard.appendChild(column);
    }
    const cubeHeight = 50; // Высота одного кубика
    const columnHeight = (cubes + 1 + plusCubes) * cubeHeight + 'px'; // Вычисляем минимальную высоту столбца

    const allcolumns = document.querySelectorAll('.column');
    allcolumns.forEach(column => {
        column.style.height = columnHeight;
    });
    // Создание массива для отслеживания количества кубиков в каждом столбце
    let cubeCountInColumns = new Array(columns).fill(0);

    // Создание равного количества кубиков каждого выбранного цвета и распределение по столбцам
    colors.slice(0, numberOfColors).forEach((color, colorIndex) => {
        for (let i = 0; i < cubes; i++) {
            let cube = document.createElement('div');
            cube.classList.add('cube');
            cube.dataset.color = color;
            cube.style.backgroundColor = color;
            cube.style.order = -((colorIndex * cubes) + i);

            // Выбор столбца для размещения кубика
            let columnIndex;
            do {
                columnIndex = Math.floor(Math.random() * columns);
            } while (cubeCountInColumns[columnIndex] >= cubesPerColor); // Проверка, чтобы не превысить лимит в столбце

            // Добавление кубика в выбранный столбец
            let column = gameBoard.children[columnIndex];
            column.appendChild(cube);
            cubeCountInColumns[columnIndex]++;
        }
    });
}

document.addEventListener('DOMContentLoaded', restartGame);

let selectedGroup = null;

function restartGame() {
    showRestartButton();
    numberOfColors = parseInt(prompt("Enter the number of colors:", 4)); // Запрашиваем количество цветов
    cubesPerColor = parseInt(prompt("Enter the number of cubes per color:", 3)); // Запрашиваем количество кубиков на цвет

    if (numberOfColors === null || cubesPerColor === null || isNaN(numberOfColors) || isNaN(cubesPerColor) || numberOfColors <= 0 || cubesPerColor <= 0) {
        alert('Please enter valid positive numbers.');
        return; // Выходим из функции, чтобы не продолжать инициализацию игры
    }

    // Очищаем игровое поле
    while (gameBoard.firstChild) {
        gameBoard.removeChild(gameBoard.firstChild);
    }

    // Сбрасываем все переменные и состояния игры
    selectedGroup = null;
    isGameOver = false;

    // Повторная инициализация игры с новыми параметрами
    initializeGame(numberOfColors, cubesPerColor);
    const maxFieldSizeRecord = localStorage.getItem('maxFieldSizeRecord') || 0;
    updateRecordDisplay(maxFieldSizeRecord);
}


function showRestartButton() {
    // Проверяем, существует ли уже кнопка перезапуска
    let restartButton = document.querySelector('.restart-button');
    if (!restartButton) {
        restartButton = document.createElement('button');
        restartButton.textContent = 'Restart Game';
        restartButton.classList.add('restart-button'); // Добавляем класс для стилизации
        restartButton.onclick = restartGame;
        document.body.appendChild(restartButton); // Добавляем кнопку в тело документа
    }
}

function updateRecordDisplay(record) {
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
    loadRecords();
}

function checkWin() {

    if (isGameOver) {
        return; // Если игра уже завершена, не выполнять проверку
    }

    let colorColumns = new Map(); // Создаем карту для отслеживания колонок каждого цвета

    for (let column of gameBoard.children) {
        let cubes = Array.from(column.children);
        
        // Если в столбце есть кубики, проверяем их цвета
        if (cubes.length > 0) {
            let columnColor = cubes[0].dataset.color;
            if (cubes.some(cube => cube.dataset.color !== columnColor)) {
                // Если в столбце есть кубики разных цветов, игрок еще не выиграл
                return false;
            }
            if (colorColumns.has(columnColor)) {
                // Если уже есть столбец с таким цветом, и это не текущий столбец, игрок еще не выиграл
                return false;
            }
            // Запоминаем столбец для данного цвета
            colorColumns.set(columnColor, column);
        }
    }

    // Если все кубики одного цвета находятся в одном столбце и нет смешанных столбцов, игрок выиграл
    // Обновление рекорда
    const currentRecord = localStorage.getItem('maxFieldSizeRecord') || 0;
    const currentFieldSize = numberOfColors * cubesPerColor;
    if (currentFieldSize > currentRecord) {
        localStorage.setItem('maxFieldSizeRecord', currentFieldSize);
        // Обновляем отображаемый рекорд
        updateRecordDisplay(currentFieldSize);
        // Запрос на загрузку рекорда на сервер
        if (window.confirm('Congratulations! You set a new record. Would you like to submit your score to the leaderboard?')) {
            const playerName = window.prompt('Please enter your name:', '');
            if (playerName) {
                submitRecord(playerName, currentFieldSize); // Отправляем рекорд на сервер
            }
        }
    }
    alert("You win!");
    isGameOver = true; // Обновляем флаг, указывая на окончание игры

    //showRestartButton(); // Показываем кнопку перезагрузки
    return true;
}

// Эта функция вызывается при клике на столбец. Она выбирает группу или перемещает уже выбранную.
function selectGroup(column) {
    if (isGameOver) {
        return; // Игнорируем клики, если игра завершена
    }
    // Если уже есть выбранная группа, попробовать поместить ее в новый столбец
    if (selectedGroup) {
        placeGroup(column);
    } else {
        // Если группа не выбрана, получить верхнюю группу из кликнутого столбца
        selectedGroup = getTopGroup(column);
        if (selectedGroup) {
            // Визуально отметить, что группа выбрана
            selectedGroup.cubes.forEach(cube => cube.classList.add('selected'));
            // Сохраняем исходный столбец для возможного возврата группы
            selectedGroup.originColumn = column;
        }
    }
}

// Эта функция возвращает верхнюю группу кубиков одного цвета из столбца
function getTopGroup(column) {
    let group = [];
    const cubes = Array.from(column.children);

    // Получить цвет последнего (верхнего) кубика в столбце
    let topCubeColor = cubes.length > 0 ? cubes[cubes.length - 1].dataset.color : null;

    // Собираем кубики с вершины столбца, пока цвет совпадает
    while (cubes.length > 0 && cubes[cubes.length - 1].dataset.color === topCubeColor) {
        group.push(cubes.pop());
    }

    // Переворачиваем массив, так как push добавлял элементы в конец
    group = group.reverse();

    // Возвращаем группу кубиков или null, если кубиков нет
    return group.length > 0 ? { color: topCubeColor, cubes: group } : null;
}


// Эта функция помещает выбранную группу в новый столбец
function placeGroup(targetColumn) {
    let targetTopCube = targetColumn.children[targetColumn.children.length - 1];
    let targetColor = targetTopCube ? targetTopCube.dataset.color : null;
    let groupLength = selectedGroup.cubes.length;

    console.log("targetColumn.children.length: " + targetColumn.children.length + " groupLength: " + groupLength + " cubesPerColor: " + cubesPerColor);
    // Проверка на превышение максимальной высоты столбца
    if (targetColumn.children.length + groupLength > cubesPerColor + plusCubes) {
        alert("You cannot add more cubes to this column as it would exceed the maximum height!");
        selectedGroup.cubes.forEach(cube => {
            selectedGroup.originColumn.appendChild(cube);
            cube.classList.remove('selected');
        });
        selectedGroup = null;
        return; // Прерываем функцию, чтобы предотвратить добавление кубиков
    }

    if (targetColumn.children.length === 0 || targetColor === selectedGroup.color) {
        selectedGroup.cubes.forEach((cube, index) => {
            // Добавляем кубик в целевой столбец
            targetColumn.appendChild(cube);
            cube.classList.remove('selected');

            // Вычисляем высоту "падения" в зависимости от количества переносимых кубиков
            let height = groupLength * 50; // Предполагаем, что высота кубика 50px
            cube.style.transform = `translateY(-${height}px)`;

            // Анимируем падение
            setTimeout(() => {
                cube.style.transition = 'transform 0.5s ease-in-out';
                cube.style.transform = 'translateY(0)';
            }, index * 100); // Минимальная задержка для начала анимации

            // Очистить стили после анимации
            setTimeout(() => {
                cube.style.transition = '';
                cube.style.transform = '';
            }, index * 100 + 500); // После завершения анимации
        });

        // Запуск проверки на выигрыш после последней анимации
        setTimeout(checkWin, groupLength * 100 + 500);
        selectedGroup = null;
    } else {
        selectedGroup.cubes.forEach(cube => {
            selectedGroup.originColumn.appendChild(cube);
            cube.classList.remove('selected');
        });
        selectedGroup = null;
        alert("You can only place on top of the same color or in an empty column!");
    }
}


// Функция для отправки рекорда на сервер
function submitRecord(name, score) {
    fetch('/api/record', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({
            name: name,
            game: 'cubes',
            score: score
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.hash) {
            // Сохраняем хеш в localStorage для последующих запросов
            localStorage.setItem('playerHash', data.hash);
        }
        console.log('Record submitted:', data);
        loadRecords();
    })
    .catch(error => console.error('Error submitting record:', error));
}

// Функция для загрузки таблицы рекордов
function loadRecords() {
    fetch('/api/records?game=cubes')
    .then(response => response.json())
    .then(data => {
        console.log('Records loaded:', data);
        displayRecords(data);
    })
    .catch(error => console.error('Error loading records:', error));
}

// Функция для отображения таблицы рекордов
function displayRecords(records) {
    // Создаем или находим элемент для отображения рекордов
    let recordsTable = document.getElementById('records-table');
    if (!recordsTable) {
        recordsTable = document.createElement('div');
        recordsTable.id = 'records-table';
        document.body.appendChild(recordsTable);
    }

    // Очищаем предыдущие записи
    recordsTable.innerHTML = '';

    // Добавляем заголовок таблицы
    recordsTable.innerHTML += '<h2>Top Scores for Cubes</h2>';

    // Создаем список для отображения рекордов
    let list = document.createElement('ol');
    records.forEach(record => {
        let listItem = document.createElement('li');
        listItem.textContent = `${record.name}: ${record.score}`;
        list.appendChild(listItem);
    });
    recordsTable.appendChild(list);
}



function getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min)) + min;
}
