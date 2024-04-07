window.onload = function() {
    // Получаем ссылку на canvas элемент
    var canvas = document.getElementById("gameCanvas");
    var ctx = canvas.getContext("2d");

    // Задаем размеры canvas элемента
    canvas.width = 1920;
    canvas.height = 1080;

    // Загружаем изображения спрайтов
    var backgroundImage = new Image();
    backgroundImage.src = "background.png";

    var cannonBaseImage = new Image();
    cannonBaseImage.src = "cannon_base.png";

    var cannonBarrelImage = new Image();
    cannonBarrelImage.src = "cannon_barrel.png";

    var balloonImage = new Image();
    balloonImage.src = "balloon.png";

    var balloon2Image = new Image();
    balloon2Image.src = "balloon2.png"; // Путь к второму изображению воздушного шарика

    // Загружаем изображения для бомб и пальм
    var bombBalloonImage = new Image();
    bombBalloonImage.src = "bombballoon.png"; // Путь к изображению шарика с бомбой
    var bombImage = new Image();
    bombImage.src = "bomb.png"; // Путь к изображению бомбы
    var palmImages = [new Image(), new Image()];
    palmImages[0].src = "palm1.png"; // Путь к изображению первой пальмы
    palmImages[1].src = "palm2.png"; // Путь к изображению второй пальмы

    // Структура данных для хранения информации о бомбах
    var bombs = [];
    // Переменные для хранения координат мыши и пушки
    var mouseX, mouseY;
    var cannonX = canvas.width / 2 + 20; // X координата базы пушки
    var cannonY = canvas.height - 250; // Y координата базы пушки
    var angle; // Переменная для хранения угла поворота пушки


    // Структура данных для хранения информации о пальмах
    var palms = [
        { x: cannonX - 310, y: cannonY - 80, width: 100, height: 100, image: palmImages[0], alive: true },
        { x: cannonX + 170, y: cannonY - 80, width: 100, height: 100, image: palmImages[1], alive: true }
    ];
    
    // Обработчик события для отслеживания движения мыши
    canvas.addEventListener("mousemove", function(event) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
    
        // Пересчитываем координаты мыши в соответствии с масштабом холста
        mouseX = (event.clientX - rect.left) * scaleX;
        mouseY = (event.clientY - rect.top) * scaleY;
    
        angle = Math.atan2(mouseY - cannonY, mouseX - cannonX); // Расчет угла поворота пушки
    });

    // Переменная для хранения списка ядер
    var bullets = [];

    // Переменная для хранения списка воздушных шариков
    var balloons = [];

    // Обработчик события для клика на холсте
    canvas.addEventListener("click", function(event) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
    
        // Пересчитываем координаты мыши в соответствии с масштабом холста
        var canvasClickX = (event.clientX - rect.left) * scaleX;
        var canvasClickY = (event.clientY - rect.top) * scaleY;
    
        // Вычисляем координаты центра дула пушки относительно базы пушки
        var barrelLength = 75; // Длина дула пушки в пикселях
        var barrelCenterX = cannonX + barrelLength * Math.cos(angle) - 20;
        var barrelCenterY = cannonY + barrelLength * Math.sin(angle) - 40;
    
        // Создаем новое ядро
        var bullet = {
            x: barrelCenterX, // Используем вычисленные координаты центра дула пушки
            y: barrelCenterY, // Используем вычисленные координаты центра дула пушки
            speed: 5, // Скорость ядра
            angle: Math.atan2(canvasClickY - cannonY, canvasClickX - cannonX) // Угол направления движения ядра
        };
    
        // Добавляем ядро в список ядер
        bullets.push(bullet);
    });

// Обновление координат воздушных шариков на каждом кадре анимации
function updateBalloons() {
var rect = canvas.getBoundingClientRect();
for (var i = 0; i < balloons.length; i++) {
    var balloon = balloons[i];
    balloon.x += balloon.speedX;
    balloon.y += balloon.speedY;

    if (balloon.hasBomb) {
        for (var j = 0; j < palms.length; j++) {
            var palm = palms[j];
            var palmCenterX = palm.x + palm.width / 2; // Центр пальмы по оси X
            // Проверяем, находится ли шарик с бомбой на одной вертикали с центром пальмы
            if (balloon.x > palmCenterX - balloon.radius && balloon.x < palmCenterX + balloon.radius &&
                balloon.y < palm.y && 
                palm.alive) { // Шарик выше верха пальмы и пальма еще не уничтожена
                // Сбрасываем бомбу
                var bombWidth = balloon.radius / 2; // Такой же размер, как на шарике
                var bombHeight = bombWidth * (bombImage.height / bombImage.width); // Сохраняем пропорции
                bombs.push({
                    x: palmCenterX,
                    y: balloon.y + balloon.radius,
                    width: bombWidth, // Добавляем ширину бомбы
                    height: bombHeight, // Добавляем высоту бомбы
                    speedY: 2
                });
                balloon.hasBomb = false; // Удаляем бомбу у шарика
                balloon.droppedBomb = true; // Указываем, что бомба была сброшена
                break; // Прекращаем проверку, так как бомба уже сброшена
            }
        }
    }
        // Проверяем столкновение с границами видимой области и отражаем шарик
        if (balloon.x + balloon.radius >= rect.right || balloon.x - balloon.radius <= rect.left) {
            balloon.speedX *= -1; // Отражение по оси X
            if (balloon.x + balloon.radius >= rect.right) {
                balloon.x = rect.right - balloon.radius;
            } else if (balloon.x - balloon.radius <= rect.left) {
                balloon.x = rect.left + balloon.radius;
            }
        }
        if (balloon.y + balloon.radius >= rect.bottom || balloon.y - balloon.radius <= rect.top) {
            balloon.speedY *= -1; // Отражение по оси Y
            if (balloon.y + balloon.radius >= rect.bottom) {
                balloon.y = rect.bottom - balloon.radius;
            } else if (balloon.y - balloon.radius <= rect.top) {
                balloon.y = rect.top + balloon.radius;
            }
        }
}
}

function drawBackground() {
// Вычисляем соотношение сторон для фона и холста
var bgAspectRatio = backgroundImage.width / backgroundImage.height;
var canvasAspectRatio = canvas.width / canvas.height;

var bgWidth, bgHeight;
if (bgAspectRatio < canvasAspectRatio) {
    // Ширина фона должна быть равна ширине холста
    bgWidth = canvas.width;
    bgHeight = bgWidth / bgAspectRatio;
} else {
    // Высота фона должна быть равна высоте холста
    bgHeight = canvas.height;
    bgWidth = bgHeight * bgAspectRatio;
}

// Выравниваем фон по нижнему краю холста, если фон выше холста
var bgX = 0;
var bgY = canvas.height - bgHeight;

ctx.drawImage(backgroundImage, bgX, bgY, bgWidth, bgHeight);
}


// Функция для отрисовки пальм
function drawPalms() {
for (var i = 0; i < palms.length; i++) {
    var palm = palms[i];
    if (palm.alive) {
        ctx.drawImage(palm.image, palm.x, palm.y, palm.width, palm.height);
    }
}
}
// Функция для отрисовки бомб
function drawBombs() {
for (var i = bombs.length - 1; i >= 0; i--) {
    var bomb = bombs[i];
    bomb.y += bomb.speedY;
    
    ctx.drawImage(bombImage, bomb.x - bomb.width / 2, bomb.y - bomb.height / 2, bomb.width, bomb.height);

    // Проверяем столкновение бомбы с пальмами
    for (var j = 0; j < palms.length; j++) {
        var palm = palms[j];
        if (palm.alive && bomb.x > palm.x && bomb.x < palm.x + palm.width &&
            bomb.y > palm.y && bomb.y < palm.y + palm.height) {
            // Пальма уничтожена
            palm.alive = false;
            // Удаляем бомбу
            bombs.splice(i, 1);
            break; // Нет необходимости проверять другие пальмы
        }
    }

    // Удаляем бомбу, если она вышла за пределы холста
    if (bomb.y > canvas.height) {
        bombs.splice(i, 1);
    }
}
}


    // Функция для отрисовки ядер
    function drawBullets() {
        for (var i = 0; i < bullets.length; i++) {
            var bullet = bullets[i];

            // Обновляем координаты ядра в соответствии с его скоростью и углом
            bullet.x += Math.cos(bullet.angle) * bullet.speed;
            bullet.y += Math.sin(bullet.angle) * bullet.speed;

            // Отрисовываем ядро
            ctx.beginPath();
            ctx.arc(bullet.x, bullet.y, 10, 0, Math.PI * 2);
            ctx.fillStyle = "red";
            ctx.fill();
            ctx.closePath();

            // Проверяем столкновение ядра с бомбами
            for (var j = bombs.length - 1; j >= 0; j--) {
                var bomb = bombs[j];
                var dx = bullet.x - bomb.x;
                var dy = bullet.y - bomb.y;
                var distance = Math.sqrt(dx * dx + dy * dy);

                // Устанавливаем радиус ядра и бомбы для проверки столкновения
                var bulletRadius = 10; // Радиус ядра
                var bombRadius = 10; // Предполагаемый радиус бомбы, нужно настроить

                if (distance < bulletRadius + bombRadius) {
                    // Столкновение произошло, удаляем ядро и бомбу
                    bullets.splice(i, 1);
                    bombs.splice(j, 1);
                    break; // Выходим из внутреннего цикла
                }
            }
            // Проверяем столкновение ядра с воздушными шариками
            for (var j = 0; j < balloons.length; j++) {
                var balloon = balloons[j];
                if (bullet.x > balloon.x - balloon.radius && bullet.x < balloon.x + balloon.radius &&
                    bullet.y > balloon.y - balloon.radius && bullet.y < balloon.y + balloon.radius) {
                    // Удаляем попавший в шарик ядерный снаряд и сам шарик
                    bullets.splice(i, 1);
                    balloons.splice(j, 1);
                    i--;
                    break;
                }
            }

            // Удаляем ядро из списка, если оно выходит за пределы холста
            if (bullet.x < 0 || bullet.x > canvas.width || bullet.y < 0 || bullet.y > canvas.height) {
                bullets.splice(i, 1);
                i--;
            }
        }
    }

    // Функция для отрисовки воздушных шариков
    function drawBalloons() {
        for (var i = 0; i < balloons.length; i++) {
            var balloon = balloons[i];
            var image = (balloon.hasBomb || balloon.droppedBomb) ? bombBalloonImage : balloon.image; // Изменено условие
            ctx.drawImage(image, balloon.x - balloon.radius, balloon.y - balloon.radius, balloon.radius * 2, balloon.radius * 2);
    
            // Если у шарика есть бомба, отрисуем её под шариком с корректировкой размера
            if (balloon.hasBomb) {
                // Устанавливаем желаемый размер бомбы
                var bombWidth = balloon.radius/2; // Например, равный радиусу шарика
                var bombHeight = bombWidth * (bombImage.height / bombImage.width); // Сохраняем пропорции
                var bombOffsetY = balloon.radius; // Половина радиуса шарика — расстояние между шариком и бомбой

                ctx.drawImage(bombImage, balloon.x - bombWidth / 2, balloon.y + bombOffsetY  - bombHeight / 2, bombWidth, bombHeight);
            }
        }
    }

    // Функция отрисовки всего на canvas
    function draw() {
        // Отрисовка фона
        drawBackground();

        // Отрисовка пушки
        var scale = 1 / 4.5; // Масштабирование в 3 раза

        // Сохраняем контекст рисования перед отрисовкой дула пушки
        ctx.save();

        // Перемещаем контекст рисования для отрисовки дула пушки
        ctx.translate(cannonX - 23, cannonY - 50); // Перемещаем дуло пушки на 20 пикселей вверх

        // Перемещаем и масштабируем контекст рисования для отрисовки дула пушки
        ctx.scale(scale, scale);
        ctx.rotate(angle);
        ctx.drawImage(cannonBarrelImage, -cannonBarrelImage.width / 2, -cannonBarrelImage.height / 2);

        // Восстанавливаем сохраненный контекст рисования
        ctx.restore();

        // Отрисовка базы пушки
        ctx.drawImage(cannonBaseImage, cannonX - cannonBaseImage.width / 2 * scale, cannonY - cannonBaseImage.height / 2 * scale, cannonBaseImage.width * scale, cannonBaseImage.height * scale);

        // Отрисовка пальм
        drawPalms();

        // Отрисовка воздушных шариков
        drawBalloons();

        updateBalloons();
        // Ядра
        drawBullets();

        // Отрисовка бомб
        drawBombs();

        // Повторный вызов функции draw() для создания анимации
        requestAnimationFrame(draw);
    }

    // Создание нового воздушного шарика каждые 3 секунды
    setInterval(function() {
        var radius = Math.random() * 50 + 20; // Случайный радиус шарика от 20 до 70
        var x = Math.random() * (canvas.width - 2 * radius) + radius; // Случайная координата X
        var y = Math.random() * (canvas.height - 2 * radius) + radius; // Случайная координата Y
        var speedX = Math.random() * 4 - 2; // Случайная скорость по оси X от -2 до 2
        var speedY = Math.random() * 4 - 2; // Случайная скорость по оси Y от -2 до 2

        // Случайный выбор изображения шарика
        var balloonImageChoice = Math.random() < 0.5 ? balloonImage : balloon2Image;

        if (Math.random() < 0.3) { // 30% вероятность
            var bombBalloon = {x: x, y: y, radius: radius, speedX: speedX, speedY: speedY, hasBomb: true, droppedBomb: false};
            balloons.push(bombBalloon);
        }
        else
            balloons.push({x: x, y: y, radius: radius, speedX: speedX, speedY: speedY, image: balloonImageChoice});
    }, 3000);

    // Вызываем функцию draw() для начала анимации
    draw();
};