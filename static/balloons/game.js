import {submitRecord, updateRecordDisplay, writeRecord} from '../records/record_functions.js';

window.onload = function() {
    var currentMaxScore = parseInt(localStorage.getItem('maxScore_balloons')) || 0;
    // Получаем ссылку на canvas элемент
    var canvas = document.getElementById("gameCanvas");
    var ctx = canvas.getContext("2d");

    var hitBalloonsCount = 0;
    var gameActive = true;

    // Переменные для хранения координат мыши и пушки
    var mouseX, mouseY;
    var cannonX, cannonY;
    var angle; // Переменная для хранения угла поворота пушки
    
    // Переменные для хранения списков ядер, воздушных шариков и бомб
    var bullets = [];
    var balloons = [];
    var bombs = [];

    var imagesToLoad = 9;
    var imagesLoaded = 0;

    function imageLoaded() {
        imagesLoaded++;
        if (imagesLoaded === imagesToLoad) {
            document.getElementById('loadingText').style.display = 'none';
            draw();
        }
    }

    function loadImage(src) {
        var img = new Image();
        img.src = src;
        img.onload = imageLoaded;
        return img;
    }

    // Загружаем изображения спрайтов
    var backgroundImage = loadImage("background.png");
    var cannonBaseImage = loadImage("cannon_base.png");
    var cannonBarrelImage = loadImage("cannon_barrel.png");
    var balloonImage = loadImage("balloon.png");
    var balloon2Image = loadImage("balloon2.png");
    var bombBalloonImage = loadImage("bombballoon.png");
    var bombImage = loadImage("bomb.png");
    var palmImages = [loadImage("palm1.png"), loadImage("palm2.png")];

    // Структура данных для хранения информации о пальмах
    var palms = [
        { x: 0, y: 0, width: 100, height: 100, image: palmImages[0], alive: true },
        { x: 0, y: 0, width: 100, height: 100, image: palmImages[1], alive: true }
    ];

    function resizeCanvas() {
        // Задаем размеры canvas элемента
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        var referenceDimension = Math.min(canvas.width, canvas.height);
        var scaleFactor = referenceDimension / 1080;

        // Центрирование пушки и корректировка позиции
        cannonX = canvas.width / 2;
        cannonY = canvas.height * 0.79;

        palms[0].x = cannonX - 310 * scaleFactor;
        palms[0].y = cannonY - 80 * scaleFactor;
        palms[0].width = 100 * scaleFactor;
        palms[0].height = 100 * scaleFactor;

        palms[1].x = cannonX + 170 * scaleFactor;
        palms[1].y = cannonY - 80 * scaleFactor;
        palms[1].width = 100 * scaleFactor;
        palms[1].height = 100 * scaleFactor;
    }

    window.addEventListener('resize', resizeCanvas);
    resizeCanvas();

    // Обработчик события для отслеживания движения мыши
    canvas.addEventListener("mousemove", function(event) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
        
        // Пересчитываем координаты мыши в соответствии с масштабом холста
        mouseX = (event.clientX - rect.left) * scaleX;
        mouseY = (event.clientY - rect.top) * scaleY;

        angle = Math.atan2(mouseY - cannonY, mouseX - cannonX);
    });

    // Обработчик события для клика на холсте
    canvas.addEventListener("click", function(event) {
        var rect = canvas.getBoundingClientRect();
        var scaleX = canvas.width / rect.width;
        var scaleY = canvas.height / rect.height;
    
        // Пересчитываем координаты мыши в соответствии с масштабом холста
        var canvasClickX = (event.clientX - rect.left) * scaleX;
        var canvasClickY = (event.clientY - rect.top) * scaleY;

        // Вычисляем координаты центра дула пушки относительно базы пушки
        var barrelLength = 75;
        var referenceDimension = Math.min(canvas.width, canvas.height);
        var scaleFactor = referenceDimension / 1080;
        var barrelCenterX = cannonX + barrelLength * Math.cos(angle) * scaleFactor;
        var barrelCenterY = cannonY + barrelLength * Math.sin(angle) * scaleFactor;

        // Создаем новое ядро
        var bullet = {
            x: barrelCenterX,
            y: barrelCenterY,
            speed: 5 * scaleFactor,
            angle: Math.atan2(canvasClickY - cannonY, canvasClickX - cannonX), // Угол направления движения ядра
            radius: 10 * scaleFactor // Устанавливаем радиус ядра
        };

        bullets.push(bullet);
    });

    function checkGameOver() {
        const currentMaxScore = parseInt(localStorage.getItem('maxScore_balloons')) || 0;
        if (hitBalloonsCount > currentMaxScore) {
            writeRecord(hitBalloonsCount, 'balloons');
            updateRecordDisplay(hitBalloonsCount, 'balloons');
        }
        alert("Game Over! Final score: " + hitBalloonsCount);
    }

    // Обновление координат воздушных шариков на каждом кадре анимации
    function updateBalloons() {
        for (var i = 0; i < balloons.length; i++) {
            var balloon = balloons[i];
            balloon.x += balloon.speedX;
            balloon.y += balloon.speedY;

            if (balloon.hasBomb) {
                for (var j = 0; j < palms.length; j++) {
                    var palm = palms[j];
                    var palmCenterX = palm.x + palm.width / 2;
                                
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
            if (balloon.x + balloon.radius >= canvas.width || balloon.x - balloon.radius <= 0) {
                balloon.speedX *= -1; // Отражение по оси X
                if (balloon.x + balloon.radius >= canvas.width) {
                    balloon.x = canvas.width - balloon.radius;
                } else if (balloon.x - balloon.radius <= 0) {
                    balloon.x = balloon.radius;
                }
            }
            if (balloon.y + balloon.radius >= canvas.height || balloon.y - balloon.radius <= 0) {
                balloon.speedY *= -1; // Отражение по оси Y
                if (balloon.y + balloon.radius >= canvas.height) {
                    balloon.y = canvas.height - balloon.radius;
                } else if (balloon.y - balloon.radius <= 0) {
                    balloon.y = balloon.radius;
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
        var bgX = (canvas.width - bgWidth) / 2;
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

            if (palms.every(p => !p.alive)) {
                gameActive = false;
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
            ctx.arc(bullet.x, bullet.y, bullet.radius, 0, Math.PI * 2); // Используем заданный радиус ядра
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
                var bulletRadius = bullet.radius; // Радиус ядра
                var bombRadius = 10;

                if (distance < bulletRadius + bombRadius) {
                    // Столкновение произошло, удаляем ядро и бомбу
                    bullets.splice(i, 1);
                    bombs.splice(j, 1);
                    break;
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
                    hitBalloonsCount++;
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
            var image = (balloon.hasBomb || balloon.droppedBomb) ? bombBalloonImage : balloon.image;
            ctx.drawImage(image, balloon.x - balloon.radius, balloon.y - balloon.radius, balloon.radius * 2, balloon.radius * 2);

            // Если у шарика есть бомба, отрисуем её под шариком с корректировкой размера
            if (balloon.hasBomb) {
                // Устанавливаем желаемый размер бомбы
                var bombWidth = balloon.radius / 2;
                var bombHeight = bombWidth * (bombImage.height / bombImage.width);
                var bombOffsetY = balloon.radius; // Половина радиуса шарика — расстояние между шариком и бомбой

                ctx.drawImage(bombImage, balloon.x - bombWidth / 2, balloon.y + bombOffsetY - bombHeight / 2, bombWidth, bombHeight);
            }
        }
    }

    // Функция отрисовки всего на canvas
    function draw() {
        // Проверка, активна ли игра
        if (!gameActive) {
            checkGameOver();
            window.location.reload();
            return;
        }
        // Отрисовка фона
        drawBackground();

        var fontSize = Math.floor(canvas.width / 40);
        ctx.font = fontSize + "px Arial";
        ctx.fillStyle = "purple";
        ctx.fillText("Сбито шаров: " + hitBalloonsCount, 25, fontSize);
        ctx.fillText("Рекорд: " + currentMaxScore, 25, fontSize * 2);
        var referenceDimension = Math.min(canvas.width, canvas.height);
        var scaleFactor = referenceDimension / 1080;
        var cannonScale = 1 / 4.5 * scaleFactor;

        // Корректируем позицию и вращение дула относительно базы
        ctx.save();
        ctx.translate(cannonX, cannonY);
        ctx.rotate(angle);
        ctx.drawImage(cannonBarrelImage, -cannonBarrelImage.width / 2 * cannonScale, -cannonBarrelImage.height / 2 * cannonScale, cannonBarrelImage.width * cannonScale, cannonBarrelImage.height * cannonScale);
        // Восстанавливаем сохраненный контекст рисования
        ctx.restore();

        // Отрисовка базы пушки
        ctx.drawImage(cannonBaseImage, cannonX - cannonBaseImage.width / 2.3 * cannonScale, cannonY - cannonBaseImage.height / 6 * cannonScale, cannonBaseImage.width * cannonScale, cannonBaseImage.height * cannonScale);
        
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
        } else {
            balloons.push({x: x, y: y, radius: radius, speedX: speedX, speedY: speedY, image: balloonImageChoice});
        }
    }, 3000);

    // Display loading text
    var loadingText = document.createElement('div');
    loadingText.id = 'loadingText';
    loadingText.style.position = 'absolute';
    loadingText.style.top = '50%';
    loadingText.style.left = '50%';
    loadingText.style.transform = 'translate(-50%, -50%)';
    loadingText.style.color = 'white';
    loadingText.style.fontSize = '24px';
    loadingText.innerText = 'Загрузка...';
    document.body.appendChild(loadingText);

    updateRecordDisplay(parseInt(localStorage.getItem('maxScore_balloons')) || 0, 'balloons');
};
