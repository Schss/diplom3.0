import seedrandom from 'https://cdn.jsdelivr.net/npm/seedrandom@3.0.5/+esm'
import * as THREE from 'https://cdn.skypack.dev/three@0.129.0/build/three.module.js';
import { GLTFLoader } from 'https://cdn.skypack.dev/three@0.129.0/examples/jsm/loaders/GLTFLoader.js';

const rng = seedrandom('your_seed');

const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.set(0, 2, 5);

const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 0);
scene.add(directionalLight);

// Добавление кубической карты
const cubeTextureLoader = new THREE.CubeTextureLoader();
cubeTextureLoader.setPath('./data/skybox/'); // Укажите путь к папке с изображениями
const skyboxTexture = cubeTextureLoader.load([
    'left.jpg', 'right.jpg', 'top.jpg',
    'bottom.jpg', 'front.jpg', 'back.jpg'
]);
scene.background = skyboxTexture;

// Точечный свет
const pointLight = new THREE.PointLight(0xffffff, 1, 100);
pointLight.position.set(0, 10, 5); // Позиция света
scene.add(pointLight);

// Скорость движения вперед
const carForwardSpeed = 0.07;
const carBoostSpeed = carForwardSpeed * 2; // Ускорение в 2 раза при удержании клавиши ускорения
const carDegreaseSpeed = carForwardSpeed / 2;
let currentForwardSpeed = carForwardSpeed;

// Максимальная и минимальная скорость трафика
const minTrafficSpeed = 0.05; // Минимальная скорость других машин
const maxTrafficSpeed = 0.08; // Максимальная скорость других машин

// Размеры коллизии для машин трафика
const trafficCarSize = new THREE.Vector3(1.2, 1.2, 2); // Примерные размеры машины (ширина, высота, длина)

// Параметры дороги
const roadWidth = 5;
const roadLength = 100;
const roadMaterial = new THREE.MeshPhongMaterial({ color: 0x555555 });
const roadGeometry = new THREE.PlaneGeometry(roadWidth, roadLength, 1, 1);

const roadSegment = new THREE.Mesh(roadGeometry, roadMaterial);
roadSegment.rotation.x = -Math.PI / 2;
roadSegment.position.z = camera.position.z  - (camera.position.y / Math.tan(camera.fov * Math.PI / 180 / 2));
scene.add(roadSegment);

const dashMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
const dashWidth = 0.1;
const dashLength = 2;
const dashSpacing = 3;
const dashGeometry = new THREE.PlaneGeometry(dashWidth, dashLength);

// Границы для активации и деактивации объектов
const activationZone = 20; // Расстояние перед машиной, где объекты будут генерироваться
const deactivationZone = -1; // Расстояние за камерой, где объекты будут удаляться

const minSpacing = 5; // Минимальное расстояние между объектами
const objectsPerBatch = 15; // Количество объектов, генерируемых за один раз


let distanceTraveled = 0;
const distanceDisplay = document.getElementById('distanceDisplay');

// Функция для создания одного сегмента пунктира
function createDash(zPosition) {
  const dash = new THREE.Mesh(dashGeometry, dashMaterial);
  dash.rotation.x = -Math.PI / 2;
  dash.position.z = zPosition;
  scene.add(dash);
  return dash;
}

// Создаем серию сегментов пунктира
const dashes = [];
const totalDashes = Math.floor(roadLength / (dashLength + dashSpacing)) * 2; // Удвоенное количество для заполнения обеих половин дороги
for (let i = 0; i < totalDashes; i++) {
  const zPosition = -roadLength / 4 + (i * (dashLength + dashSpacing)) % roadLength;
  dashes.push(createDash(zPosition));
}

const carGeometry = new THREE.BoxGeometry(1, 0.5, 2);
const carMaterial = new THREE.MeshPhongMaterial({ color: 0xff0000 });
var car = new THREE.Mesh(carGeometry, carMaterial);
car.position.y = 0.25;
scene.add(car);

let lastObjectZ = car.position.z - activationZone;
let lastActivationZ = car.position.z - activationZone; // Запоминаем позицию последней активации

// Создаем экземпляр загрузчика
const loader = new GLTFLoader();

let carLoaded = false;
// Загружаем модель автомобиля
loader.load('./data/mercedes-benz_slr_mclaren_2005.glb', function(gltf) {
  // Эта функция вызывается, когда загрузка завершена
  const carModel = gltf.scene;
  // Устанавливаем начальное положение и размер модели
  carModel.position.set(0, 0, 5); // Позиция над дорогой, немного впереди камеры
  carModel.scale.set(0.007, 0.007, 0.007); // Начните с единичного масштаба и корректируйте, если необходимо
    // Предположим, что модель нужно повернуть на 90 градусов
  const angle = Math.PI / 2; // 90 градусов в радианах

  // Поворачиваем модель вокруг оси Y
  carModel.rotateY(angle);
  // Удаление красного куба (машины игрока) и добавление модели автомобиля
  scene.remove(car); // Убедитесь, что переменная car ссылается на красный куб
  scene.add(carModel);

  // Обновляем ссылку на машину игрока для использования в функциях анимации и управления
  car = carModel;
  carLoaded = true;
  animate();
}, undefined, function(error) {
  console.error(error);
});

const modelsCache = {
  building: null,
  tree: null
};

const carModels = {};

const modelScales = {
  //'2021_volkswagen_golf_gti.glb': { x: 0.07, y: 0.07, z: 0.07 }//,
  //'2103.glb': { x: 0.8, y: 0.8, z: 0.8 }
  'Corolla.glb': { x: 0.7, y: 0.7, z: 0.7 },
  'kia_optima_k5.glb': { x: 0.0075, y: 0.0075, z: 0.0075 },
  // 'Car.glb': { x: 0.75, y: 0.75, z: 0.75 },
  // 'audi r8.glb': { x: 0.0075, y: 0.0075, z: 0.0075 }
  // 'bmw_m3_competition_tourning_g81.glb': { x: 0.75, y: 0.75, z: 0.75 }
  'old_rusty_car.glb': { x: 0.004, y: 0.004, z: 0.004 },
  'bentley_car.glb': { x: 0.0006, y: 0.0006, z: 0.0006 }
  //'papercar.glb':  { x: 0.75, y: 0.75, z: 0.75 },
  //'mercedes-benz_g-class_free_download.glb':  { x: 0.75, y: 0.75, z: 0.75 }
  //'lr.glb': { x: 0.0075, y: 0.0075, z: 0.0075 }//,
  //'AM DB2.glb': { x: 0.0075, y: 0.0075, z: 0.0075 }
  //'C2 ivory 1.glb': { x: 0.0075, y: 0.0075, z: 0.0075 }
  //'mitsubishi_lancer_evo_x.glb': { x: 0.3, y: 0.3, z: 0.3 }
  //'tesla_model_x.glb': { x: 0.0075, y: 0.0075, z: 0.0075 }
};


// Предварительная загрузка и кэширование моделей
function preloadModels() {
  // Загрузка зданий и деревьев
  loader.load('./data/building.glb', function(gltf) {
      modelsCache.building = gltf.scene;
  }, undefined, function(error) {
      console.error('Ошибка загрузки здания:', error);
  });
  loader.load('./data/treee.glb', function(gltf) {
      modelsCache.tree = gltf.scene;
  }, undefined, function(error) {
      console.error('Ошибка загрузки дерева:', error);
  });

  // Загрузка моделей автомобилей
   // Загрузка моделей автомобилей
   Object.keys(modelScales).forEach(model => {
    loader.load(`./data/traffic/${model}`, function(gltf) {
        carModels[model] = gltf.scene;
    }, undefined, function(error) {
        console.error(`Ошибка загрузки модели ${model}:`, error);
    });
  });

}


// Функция для загрузки и создания здания с рандомным поворотом на 90 градусов
function loadBuildingModel(x, z) {
  if (modelsCache.building) {
    const building = modelsCache.building.clone();
    building.position.set(x, 0, z);
    building.scale.set(0.1, 0.1, 0.1); // Настройте масштаб в соответствии с вашей моделью
    // Поворачиваем здание на случайный угол с шагом в 90 градусов
    const randomRotation = Math.floor(rng() * 4) * (Math.PI / 2);
    building.rotation.y = randomRotation;
    building.userData.type = 'environment'; // Добавляем пользовательские данные для идентификации
    scene.add(building);
  }
}

// Функция для загрузки и создания дерева с рандомным поворотом
function loadTreeModel(x, z) {
  if (modelsCache.tree) {
    const tree = modelsCache.tree.clone();
    tree.position.set(x, 0, z);
    tree.scale.set(0.1, 0.1, 0.1); // Настройте масштаб в соответствии с вашей моделью
    // Поворачиваем дерево на случайный угол
    const randomRotation = rng() * Math.PI * 2;
    tree.rotation.y = randomRotation;
    tree.userData.type = 'environment'; // Добавляем пользовательские данные для идентификации
    scene.add(tree);
  }
}

// Функция для создания одного объекта в случайном месте
function createRandomObject(z) {
  const side = rng() < 0.5 ? -1 : 1; // Случайно выбираем сторону: -1 для левой, 1 для правой
  const x = side * ((roadWidth + 1) / 2 + rng() * 15); // Случайное расстояние от дороги

  // Случайно выбираем, создавать ли дерево или здание
  if (rng() < 0.5) {
    loadBuildingModel(x, z);
  } else {
    loadTreeModel(x, z);
  }
}

// Функция для активации и деактивации объектов
function updateEnvironment() {
  // Генерация новых объектов
  if (car.position.z < lastActivationZ - activationZone) {
    // Генерируем объекты на расстоянии minSpacing друг от друга
    let z = lastObjectZ - minSpacing;
    while (z > car.position.z - roadLength) {
      createRandomObject(z);
      lastObjectZ = z;
      z -= minSpacing;
    }
    lastActivationZ = car.position.z;
  }

  // Удаление старых объектов
  for (let i = scene.children.length - 1; i >= 0; i--) {
    const object = scene.children[i];
    if (object.userData && object.userData.type === 'environment') {
      if (object.position.z > camera.position.z - deactivationZone) {
        scene.remove(object);
      }
    }
  }
}

// Функция для создания других машин
const lanes = [-roadWidth / 4, roadWidth / 4]; // Дорожки для размещения машин
const minZPosition = -roadLength; // Минимальное значение Z для начала дороги
const maxZPosition = -roadLength * 2; // Максимальное значение Z для конца дороги

const otherCars = [];
const otherCarGeometry = new THREE.BoxGeometry(1.3, 0.5, 2);
const otherCarMaterial = new THREE.MeshPhongMaterial({ color: 0x0000ff });
// const otherCarSpeed = 0.05; // Скорость других машин меньше, чем у управляемой машины
const minDistanceBetweenCars = 10; // Минимальное расстояние между машинами
const maxDistanceBetweenCars = 30; // Максимальное расстояние между машинами

function createOtherCar() {
  const lane = lanes[Math.floor(rng() * lanes.length)];
  const carModelKeys = Object.keys(carModels);
  if (carModelKeys.length === 0) {
      console.error("Модели автомобилей ещё не загружены.");
      return; // Прервать функцию, если модели не загружены
  }
  const modelKey = carModelKeys[Math.floor(rng() * carModelKeys.length)];
  const carModel = carModels[modelKey];

  if (!carModel) {
      console.error(`Модель ${modelKey} не найдена в кэше.`);
      return; // Прервать функцию, если модель не найдена
  }

  const cloneCarModel = carModel.clone(); // Клонировать модель

  const scale = modelScales[modelKey] || { x: 0.007, y: 0.007, z: 0.007 }; // Использовать установленный масштаб или масштаб по умолчанию
  cloneCarModel.scale.set(scale.x, scale.y, scale.z);

  const lastCar = otherCars[otherCars.length - 1];
  let zPosition = lastCar ? lastCar.position.z - minDistanceBetweenCars - rng() * (maxDistanceBetweenCars - minDistanceBetweenCars) : car.position.z - 50;

  cloneCarModel.position.set(lane, 0.25, zPosition);
  cloneCarModel.rotation.y = Math.PI; // Повернуть машину

  const speed = minTrafficSpeed + rng() * (maxTrafficSpeed - minTrafficSpeed);
  cloneCarModel.userData = {
      speed: speed,
      isActive: false,
      originalSpeed: speed
  };

  scene.add(cloneCarModel);
  otherCars.push(cloneCarModel);
}

// Создаем начальное количество машин
const initialOtherCarsCount = 100;
for (let i = 0; i < initialOtherCarsCount; i++) {
  createOtherCar();
}

function checkCollisions() {
  const carBox = new THREE.Box3().setFromObject(car);
  for (let i = 0; i < otherCars.length; i++) {
      // Создаем Box3 для каждой машины трафика с фиксированными размерами
      const otherCar = otherCars[i];
      const otherCarBox = new THREE.Box3().setFromCenterAndSize(otherCar.position, trafficCarSize);

      // Для отладки можно визуализировать размеры коллизий
      // const helper = new THREE.Box3Helper(otherCarBox, 0xffff00);
      // scene.add(helper);

      if (carBox.intersectsBox(otherCarBox)) {
          return true; // Коллизия обнаружена
      }
  }
  return false; // Коллизия не обнаружена
}

function endGame() {
  // Остановить анимацию
  cancelAnimationFrame(animationFrameId); // Отменяем запрос анимации

  // Отобразить сообщение о проигрыше
  const gameOverMessage = document.createElement('div');
  gameOverMessage.textContent = 'Шашка не зашла! Нажмите, чтобы играть снова.';
  gameOverMessage.style.cssText = `
      position: absolute;
      top: 50%;
      left: 50%;
      transform: translate(-50%, -50%);
      font-size: 20px;
      color: white;
      background: rgba(0, 0, 0, 0.7);
      padding: 20px;
      border-radius: 10px;
      cursor: pointer;
  `;
  document.body.appendChild(gameOverMessage);

  // Перезапустить игру при клике на сообщение
  gameOverMessage.onclick = function() {
      document.body.removeChild(gameOverMessage);
      restartGame();
  };
}

function restartGame() {
  window.location.reload();/*
  // Сбросить состояние игры
  distanceTraveled = 0; // Сбросить расстояние
  car.position.set(0, 0.25, 5); // Сбросить позицию машины игрока
  otherCars.forEach(otherCar => {
    scene.remove(otherCar); // Удалить машины из сцены
  });
  otherCars.length = 0; // Очистить массив машин

  // Запустить анимацию снова
  animate(); // Перезапустить цикл анимации*/
}

// Объект для хранения информации о состоянии клавиш
const keysPressed = {};

// Функция для обработки нажатия клавиш
function onKeyDown(event) {
  keysPressed[event.key.toLowerCase()] = true;
}

// Функция для обработки отпускания клавиш
function onKeyUp(event) {
  keysPressed[event.key.toLowerCase()] = false;
}

// Подписываемся на события клавиатуры
window.addEventListener('keydown', onKeyDown, false);
window.addEventListener('keyup', onKeyUp, false);


// Функции для обработки сенсорных событий

function getTouchZone(touch) {
  const width = window.innerWidth;
  const height = window.innerHeight;
  const touchX = touch.clientX;
  const touchY = touch.clientY;

  // Определяем зоны для управления
  const topZoneHeight = height * 0.25; // Верхняя 25% экрана для ускорения
  const bottomZoneHeight = height * 0.25; // Нижняя 25% экрана для замедления

  if (touchY < topZoneHeight) {
    return 'top';
  } else if (touchY > (height - bottomZoneHeight)) {
    return 'bottom';
  } else if (touchX < (width / 2)) {
    return 'left';
  } else {
    return 'right';
  }
}

function onTouchStart(event) {
  event.preventDefault();
  const touches = event.changedTouches;
  
  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    const zone = getTouchZone(touch);

    if (zone === 'left') {
      keysPressed['a'] = true;
    } else if (zone === 'right') {
      keysPressed['d'] = true;
    } else if (zone === 'top') {
      keysPressed['w'] = true;
    } else if (zone === 'bottom') {
      keysPressed['s'] = true;
    }
  }
}

function onTouchEnd(event) {
  event.preventDefault();
  const touches = event.changedTouches;
  
  for (let i = 0; i < touches.length; i++) {
    const touch = touches[i];
    const zone = getTouchZone(touch);

    if (zone === 'left') {
      keysPressed['a'] = false;
    } else if (zone === 'right') {
      keysPressed['d'] = false;
    } else if (zone === 'top') {
      keysPressed['w'] = false;
    } else if (zone === 'bottom') {
      keysPressed['s'] = false;
    }
  }
}


// Подписываемся на события сенсорного экрана
window.addEventListener('touchstart', onTouchStart, { passive: false });
//window.addEventListener('touchmove', onTouchMove, { passive: false });
window.addEventListener('touchend', onTouchEnd, { passive: false });

const activationDistance = 10; // Расстояние, на котором другие машины начнут двигаться

let animationFrameId; // Глобальная переменная для хранения ID запроса анимации

function animate() {
  if (!carLoaded) {
    return;
  }

  animationFrameId = requestAnimationFrame(animate);

  // Обновление окружения (добавление и удаление объектов)
  updateEnvironment();

  distanceTraveled += currentForwardSpeed; // Увеличиваем на пройденное расстояние за кадр
  distanceDisplay.textContent = `Проехано: ${Math.round(distanceTraveled)} м`;
  
  // Проверка столкновений перед обновлением позиции машины игрока
  if (checkCollisions()) {
    endGame();
    return; // Выход из функции animate, чтобы остановить игру
  }

  // Управление машиной
  if ((keysPressed['a'] || keysPressed['arrowleft']) && car.position.x > -(roadWidth / 2 - 0.5)) {
    car.position.x -= 0.05;
  }
  if ((keysPressed['d'] || keysPressed['arrowright']) && car.position.x < (roadWidth / 2 - 0.5)) {
    car.position.x += 0.05;
  }
  
  if (keysPressed['w'] || keysPressed['arrowup']) {
    currentForwardSpeed = carBoostSpeed; // Ускоряем машину вперед
  } 
  else if (keysPressed['s'] || keysPressed['arrowdown']){
    currentForwardSpeed = carDegreaseSpeed; // Замедляем машину
  } 
  else {
    currentForwardSpeed = carForwardSpeed; // Возвращаем обычную скорость
  }
  car.position.z -= currentForwardSpeed;
  
  dashes.forEach(dash => {
    dash.position.z += currentForwardSpeed; // Двигаем разметку вместе с машиной
    // Перемещаем разметку обратно в начало, когда она выходит за пределы видимости
    if (dash.position.z > camera.position.z) {
      dash.position.z -= roadLength;
    }
  });

  const cameraBottom = camera.position.z - (camera.position.y / Math.tan(camera.fov * Math.PI / 180 / 2));
  if (car.position.z - roadSegment.position.z < -roadLength / 2) {
    roadSegment.position.z = car.position.z - (roadLength / 2);
  }
  if (roadSegment.position.z - cameraBottom > 0) {
    roadSegment.position.z = cameraBottom;
  }

  // Камера следует за машиной
  camera.position.z = car.position.z + 5;
  if (otherCars.length < initialOtherCarsCount) {
    createOtherCar();
  }
  for (let i = otherCars.length - 1; i >= 0; i--) {
    const otherCar = otherCars[i];
    if (Math.abs(car.position.z - otherCar.position.z) < activationDistance) {
      // Если машина игрока приближается, активируем движение других машин
      otherCar.userData.isActive = true;
    }

    // Если другая машина активирована, она движется
    if (otherCar.userData.isActive) {
      otherCar.position.z -= otherCar.userData.speed;
      otherCar.userData.isActive = false;
    }
   
    // Удаление машин, когда они выходят за пределы заданного диапазона Z
    if (otherCar.position.z > camera.position.z + roadLength / 2) {
      scene.remove(otherCar);
      otherCar.position.z += otherCar.userData.speed;
      otherCars.splice(i, 1);
    }
  }

  // Добавление новых машин, если их количество меньше начального
  if (otherCars.length < initialOtherCarsCount) {
    createOtherCar();
  }

  renderer.render(scene, camera);
}
preloadModels();
//animate();

// Отслеживание изменения размеров окна браузера
window.addEventListener('resize', onWindowResize, false);

function onWindowResize() {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
}