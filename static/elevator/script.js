import {loadRecords, updateRecordDisplay, writeRecord} from '../records/record_functions.js';

var currentFloor = 1;
var totalFloors = 10;
var moving = null;
const elevatorElement = document.getElementById('elevator');
const buildingElement = document.getElementById('building');
var floorsWithPeople = {};  // Объект для хранения информации о людях на этажах
let maxCapacity = 3;
var isElevatorReady = false;
// Инициализация счётчика состояний
var moodCounter = {
    happy: 0,
    unhappy: 0,
    angry: 0
};

// Инициализация счетчика очков
var score = 0;

// Функция для обновления отображения счета
function updateScoreDisplay() {
    document.getElementById('current-score').textContent = `Счет: ${score}`;
    const recordScore = localStorage.getItem('maxScore_elevator') || 0;
    document.getElementById('record-score').textContent = `Рекорд: ${recordScore}`;
}

function getFloorHeight() {
    return buildingElement.clientHeight / totalFloors;
}

document.addEventListener('DOMContentLoaded', () => {
    // Получаем кнопки управления
    const upButton = document.getElementById('upButton');
    const downButton = document.getElementById('downButton');
    const stopButton = document.getElementById('stopButton');

    // Добавляем обработчики событий
    upButton.addEventListener('click', () => move('up'));
    downButton.addEventListener('click', () => move('down'));
    stopButton.addEventListener('click', stop);

    // Обновляем отображение счета при загрузке страницы
    updateScoreDisplay();
    loadRecords('elevator');
    // updateRecordDisplay(parseInt(localStorage.getItem('maxScore_elevator')) || 0, 'elevator');
    console.log(parseInt(localStorage.getItem('maxScore_elevator')|| 0))
});

function move(direction) {
    if (moving || !isElevatorReady) return;

    moving = setInterval(function() {
        let floorChanged = false;
        if (direction === 'up' && currentFloor < totalFloors) {
            currentFloor++;
            floorChanged = true;
        } else if (direction === 'down' && currentFloor > 1) {
            currentFloor--;
            floorChanged = true;
        }

        if (floorChanged) {
            updateMood(currentFloor);
            elevatorElement.style.bottom = `${(currentFloor - 1) * getFloorHeight()}px`;
            document.getElementById('current-floor').textContent = currentFloor;
        }

        // Проверка на остановку лифта на верхнем или нижнем этаже
        if (currentFloor === totalFloors || currentFloor === 1) {
            stop();
        }
    }, 1000);
}

function stop() {
    isElevatorReady = false;
    clearInterval(moving);
    moving = null;
    let humansOnFloor = floorsWithPeople[currentFloor] || [];
    if (elevatorElement.childElementCount < maxCapacity) { // Проверяем, не полон ли лифт
        humansOnFloor.forEach(improveMood);
    }

    setTimeout(() => {
        let humans = elevatorElement.querySelectorAll('svg');
        let exited = 0; // Счетчик вышедших

        humans.forEach(human => {
            let desiredFloor = parseInt(human.getAttribute('data-target-floor'));
            if (desiredFloor === currentFloor) {
                exitHuman(human);
                exited++;
            }
        });
        // Запускаем функцию входа в лифт после того, как все вышедшие покинули лифт
        setTimeout(() => {
            checkAndMoveHumans();
            isElevatorReady = true;
        }, 2000 * exited); // Ожидаем, пока все выйдут
    }, 500);  // Даем время лифту полностью остановиться
}

function exitHuman(human) {
    let floorElement = document.querySelector(`.floor:nth-child(${totalFloors - currentFloor + 1})`);

    // Устанавливаем z-index для анимации выхода
    human.style.zIndex = "102";
    human.style.position = null;
    human.style.left = null;

    // Получаем размеры лифта и этажа
    let elevatorRect = elevatorElement.getBoundingClientRect();
    let floorRect = floorElement.getBoundingClientRect();

    // Расстояние перемещения человечка зависит от размеров экрана
    let translateX = floorRect.width * 0.8;  // 40% ширины этажа

    human.querySelectorAll('.leg').forEach(leg => {
        leg.classList.remove("leg");
        leg.classList.add("walkingleg");
    });

    human.style.transition = 'transform 2s ease-in-out';
    human.style.transform = `translateX(${translateX}px)`;  // Перемещаем человечка

    setTimeout(() => {
        let mood = human.getAttribute('data-mood');
        updateMoodCounter(mood);
        
        // Добавляем очки в зависимости от настроения
        if (mood === 'happy') {
            score += 3;
        } else if (mood === 'unhappy') {
            score += 1;
        } else if (mood === 'angry') {
            score -= 1;
        }

        updateScoreDisplay(); // Обновляем отображение счета

        floorElement.appendChild(human);

        // Сбрасываем стили после завершения анимации
        human.style.transform = '';
        human.style.zIndex = '';
        human.querySelectorAll('.walkingleg').forEach(leg => {
            leg.classList.remove("walkingleg");
            leg.classList.add("leg");
        });

        // Ресайзим человечков на этаже
        resizeHumansOnFloor(floorElement);

        checkGameCompletion();
    }, 2000);  // Синхронизация с анимацией перемещения
}

function resizeHumansOnFloor(floorElement) {
    const humansOnFloor = floorElement.querySelectorAll('svg');
    const floorWidth = floorElement.clientWidth;

    humansOnFloor.forEach(human => {
        human.style.width = (floorWidth / (humansOnFloor.length + 1)) + 'px';
        human.style.height = 'auto';
        human.style.maxWidth = '20px'; // Ограничение максимальной ширины человечка
    });
}

function checkAndMoveHumans() {
    // Получаем массив людей на текущем этаже
    let humansOnFloor = floorsWithPeople[currentFloor] || [];
    if (humansOnFloor.length > 0) {
        let floorElement = document.querySelector(`.floor:nth-child(${totalFloors - currentFloor + 1})`);
        moveHumansToElevator(humansOnFloor.slice(), floorElement);
    }
}

function moveHumansToElevator(humans, floor) {
    let currentCount = elevatorElement.childElementCount;
    let availableSpace = maxCapacity - currentCount;

    for (let i = 0; i < humans.length && i < availableSpace; i++) {
        let human = humans[i];
        let humanClone = human.cloneNode(true);
        human.querySelectorAll('.leg').forEach(leg => {
            leg.classList.remove("leg");
            leg.classList.add("walkingleg");
        });

        let elevatorRect = elevatorElement.getBoundingClientRect();
        let floorRect = floor.getBoundingClientRect();

        // Calculate the target position inside the elevator
        let targetX = currentCount * (elevatorRect.width / maxCapacity);
        let targetY = 0;  // Assuming all humans stand in one row in the elevator

        // Calculate the initial position relative to the floor
        let initialX = elevatorRect.left - floorRect.left;
        let initialY = elevatorRect.top - floorRect.top;

        // Append the human to the floor to ensure it's in the correct context for positioning
        floor.appendChild(human);

        // Set the initial position to the current position
        human.style.zIndex = "102"; // Set z-index for animation
        human.style.position = 'absolute';
        human.style.left = `${human.getBoundingClientRect().left - floorRect.left}px`;
        human.style.top = `${human.getBoundingClientRect().top - floorRect.top}px`;
        human.style.transition = 'none'; // Disable transitions initially

        // Start the animation to move to the elevator
        setTimeout(() => {
            human.style.transition = 'transform 1s ease-in-out';
            human.style.transform = `translate(${initialX + targetX - parseFloat(human.style.left)}px, ${initialY + targetY - parseFloat(human.style.top)}px)`;

            setTimeout(() => {
                if (elevatorElement.childElementCount < maxCapacity) {
                    human.style.transition = 'none'; // Disable transitions after animation
                    human.style.transform = ''; // Reset transform
                    human.style.position = ''; // Reset position
                    human.style.zIndex = ""; // Reset z-index after animation
                    elevatorElement.appendChild(humanClone);
                    humanClone.querySelectorAll('.walkingleg').forEach(leg => {
                        leg.classList.remove("walkingleg");
                        leg.classList.add("leg");
                    });

                    // Remove the element from the array after successfully adding to the elevator
                    floorsWithPeople[currentFloor] = floorsWithPeople[currentFloor].filter(h => h !== human);
                    human.remove();

                    // Update style for correct display on small screens
                    updateHumanStyleInElevator();
                }
            }, 1000);
        }, 50); // Small delay to ensure initial position is set

        currentCount++; // Increment count to calculate the next target position
    }
}

function updateHumanStyleInElevator() {
    const humansInElevator = elevatorElement.querySelectorAll('svg');
    const elevatorWidth = elevatorElement.clientWidth;

    humansInElevator.forEach((human, index) => {
        human.style.width = (elevatorWidth / maxCapacity - 10) + 'px';
        human.style.height = 'auto';
        human.style.maxWidth = '20px'; // Limit max width of the human
        human.style.position = 'absolute';
        human.style.left = (index * (elevatorWidth / maxCapacity)) + 'px';
    });
}

// Вызовем эту функцию при инициализации и при каждом перемещении человечков
document.addEventListener('DOMContentLoaded', function() {
    updateHumanStyleInElevator();
});

document.addEventListener('DOMContentLoaded', function() {
    const floorsContainer = document.querySelector('.floors-container');
    const labelsContainer = document.createElement('div');
    labelsContainer.className = 'labels-container';
    floorsContainer.after(labelsContainer);

    for (let i = totalFloors; i > 0; i--) {
        let floor = document.createElement('div');
        floor.className = 'floor';
        floorsContainer.appendChild(floor);

        let floorLabel = document.createElement('div');
        floorLabel.className = 'floor-label';
        floorLabel.textContent = `${i}`;
        labelsContainer.appendChild(floorLabel);

        let numberOfHumans = Math.floor(Math.random() * 6);
        floorsWithPeople[i] = [];
        for (let j = 0; j < numberOfHumans; j++) {
            let human = createHumanSVG(i);
            floor.appendChild(human);
            floorsWithPeople[i].push(human);
        }
    }
    stop();
});

function createHumanSVG(currentFloor) {
    let svgNS = "http://www.w3.org/2000/svg";
    let human = document.createElementNS(svgNS, "svg");

    human.setAttribute("viewBox", "0 0 20 60");
    human.style.width = "auto";
    human.style.height = "calc(100% - 10%)"; // Чуть меньше высоты контейнера
    human.style.marginRight = "5px";
    human.setAttribute("data-mood", "happy"); // Начальное настроение
    human.setAttribute("data-passes", "0"); // Количество пропущенных проходов

    // Генерация случайного этажа, отличного от текущего
    let targetFloor;
    do {
        targetFloor = Math.floor(Math.random() * totalFloors) + 1;
    } while (targetFloor === currentFloor);

    human.setAttribute("data-target-floor", targetFloor);  // Сохраняем желаемый этаж

    // Создание элементов тела, как ранее
    let circle = document.createElementNS(svgNS, "circle");
    circle.setAttribute("cx", "10");
    circle.setAttribute("cy", "5");
    circle.setAttribute("r", "5");
    circle.style.fill = "#00ff00"; // Зеленый для 'happy'
    circle.classList.add('body-part');

    let body = document.createElementNS(svgNS, "line");
    body.setAttribute("x1", "10");
    body.setAttribute("y1", "10");
    body.setAttribute("x2", "10");
    body.setAttribute("y2", "30");
    body.style.stroke = "#666";
    body.style.strokeWidth = "2";
    body.classList.add('body-part');

    let leftArm = document.createElementNS(svgNS, "line");
    leftArm.setAttribute("x1", "10");
    leftArm.setAttribute("y1", "15");
    leftArm.setAttribute("x2", "5");
    leftArm.setAttribute("y2", "20");
    leftArm.style.stroke = "#666";
    leftArm.style.strokeWidth = "2";
    leftArm.classList.add('body-part');

    let rightArm = document.createElementNS(svgNS, "line");
    rightArm.setAttribute("x1", "10");
    rightArm.setAttribute("y1", "15");
    rightArm.setAttribute("x2", "15");
    rightArm.setAttribute("y2", "20");
    rightArm.style.stroke = "#666";
    rightArm.style.strokeWidth = "2";
    rightArm.classList.add('body-part');

    // Создание ног с анимацией
    let leftLeg = document.createElementNS(svgNS, "line");
    leftLeg.setAttribute("x1", "10");
    leftLeg.setAttribute("y1", "30");
    leftLeg.setAttribute("x2", "5");
    leftLeg.setAttribute("y2", "40");
    leftLeg.style.stroke = "#666";
    leftLeg.style.strokeWidth = "2";
    leftLeg.classList.add("leg");
    leftLeg.classList.add('body-part');

    let rightLeg = document.createElementNS(svgNS, "line");
    rightLeg.setAttribute("x1", "10");
    rightLeg.setAttribute("y1", "30");
    rightLeg.setAttribute("x2", "15");
    rightLeg.setAttribute("y2", "40");
    rightLeg.style.stroke = "#666";
    rightLeg.style.strokeWidth = "2";
    rightLeg.classList.add("leg");
    rightLeg.classList.add('body-part');

    // Создание баббла с номером желаемого этажа
    let bubble = document.createElementNS(svgNS, "circle");
    bubble.setAttribute("cx", "10");
    bubble.setAttribute("cy", "50");
    bubble.setAttribute("r", "10");
    bubble.style.fill = "lightblue";
    let text = document.createElementNS(svgNS, "text");
    text.setAttribute("x", "10");
    text.setAttribute("y", "55");
    text.setAttribute("text-anchor", "middle");
    text.textContent = targetFloor;
    text.style.fill = "black";
    text.style.fontSize = "10px";
    text.style.fontFamily = "Arial";

    human.appendChild(bubble);
    human.appendChild(text);

    human.appendChild(circle);
    human.appendChild(body);
    human.appendChild(leftLeg);
    human.appendChild(rightLeg);
    human.appendChild(rightArm);
    human.appendChild(leftArm);
    updateHumanColor(human, 'green');
    return human;
}

function checkGameCompletion() {
    const allFloors = document.querySelectorAll('.floor');
    let allHumansAtTarget = true;
    // updateRecordDisplay(parseInt(localStorage.getItem('maxScore_elevator')) || 0, 'elevator');
    loadRecords('elevator');
    console.log(parseInt(localStorage.getItem('maxScore_elevator')|| 0))

    allFloors.forEach((floor, index) => {
        const floorNumber = totalFloors - index; // Этажи считаются снизу вверх
        const humans = floor.querySelectorAll('svg');

        humans.forEach(human => {
            const targetFloor = parseInt(human.getAttribute('data-target-floor'));
            if (targetFloor !== floorNumber) {
                allHumansAtTarget = false;
            }
        });
    });

    if (allHumansAtTarget && !elevatorElement.childElementCount) {
        document.getElementById('gameMessageText').textContent = "Игра завершена: Все человечки на своих этажах! Довольные: " + moodCounter.happy +
        ", Недовольные: " + moodCounter.unhappy + ", Злые: " + moodCounter.angry;
        document.getElementById('gameMessage').style.display = 'block';

        const currentMaxScore = parseInt(localStorage.getItem('maxScore_elevator')) || 0;
        if (score > currentMaxScore) {
            writeRecord(score, 'elevator');
            // updateRecordDisplay(score, 'elevator');
            loadRecords('elevator');
        }
    }
}

function updateHumanColor(human, color) {
    let bodyParts = human.querySelectorAll('.body-part');
    bodyParts.forEach(part => {
        part.style.fill = color;
        part.style.stroke = color;
    });
}

function updateMood(floor) {
    const humans = floorsWithPeople[floor];
    if (!humans) return;

    humans.forEach(human => {
        let passes = parseInt(human.getAttribute('data-passes')) + 1;
        let mood = human.getAttribute('data-mood');

        if (passes % 3 === 0) {
            if (mood === 'happy') {
                human.setAttribute('data-mood', 'unhappy');
                updateHumanColor(human, 'yellow')
            } else if (mood === 'unhappy') {
                human.setAttribute('data-mood', 'angry');
                updateHumanColor(human, 'red')
            } else if (mood === 'angry') {
                // Удаляем злого человечка и вычитаем очко из счета
                human.remove();
                score -= 1;
                console.log('Angry human disappeared. Current score: ' + score);
                floorsWithPeople[floor] = floorsWithPeople[floor].filter(h => h !== human);
                updateScoreDisplay(); // Обновляем отображение счета
            }
        }

        human.setAttribute('data-passes', passes.toString());
    });
}

function improveMood(human) {
    let mood = human.getAttribute('data-mood');

    switch (mood) {
        case 'angry':
            human.setAttribute('data-mood', 'unhappy');
            updateHumanColor(human, 'yellow')
            break;
        case 'unhappy':
            human.setAttribute('data-mood', 'happy');
            updateHumanColor(human, 'green')
            break;
        // если человечек уже доволен, то ничего не делаем
    }

    // Обнуляем счётчик проходов, так как лифт остановился на этаже
    human.setAttribute('data-passes', '0');
}

function updateMoodCounter(mood) {
    moodCounter[mood]++;
    console.log(mood + moodCounter[mood]);
}
