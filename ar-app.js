// Ждем загрузки DOM
document.addEventListener('DOMContentLoaded', async () => {
    const canvas = document.getElementById('renderCanvas');
    const engine = new BABYLON.Engine(canvas, true);
    
    // Создаем сцену
    const scene = new BABYLON.Scene(engine);
    scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
    
    // Камера
    const camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 0, 0), scene);
    
    // Свет
    const light = new BABYLON.HemisphericLight('light', new BABYLON.Vector3(0, 1, 0), scene);
    light.intensity = 0.8;
    
    // UI элементы
    const markerGrid = document.getElementById('markerGrid');
    const activeCounter = document.getElementById('activeCounter');
    const statusDiv = document.getElementById('status');
    
    // Создаем UI для 10 маркеров
    for (let i = 0; i < 10; i++) {
        const item = document.createElement('div');
        item.className = 'marker-item';
        item.id = `marker-ui-${i}`;
        item.innerHTML = `
            <div class="marker-dot" id="dot-${i}"></div>
            <span>Маркер ${i + 1}</span>
        `;
        markerGrid.appendChild(item);
    }
    
    // Массив с маркерами (изображения из папки images)
    const markerImages = [];
    for (let i = 0; i < 10; i++) {
        markerImages.push({
            name: `marker${i + 1}`,
            src: `images/marker${i + 1}.jpg`, // Путь к изображениям
            estimatedRealWorldWidth: 0.1 // 10 см в реальности
        });
    }
    
    // Хранилище для 3D объектов
    const objects = new Map();
    let activeMarkers = new Array(10).fill(false);
    
    // Функция обновления UI
    function updateUI() {
        const count = activeMarkers.filter(Boolean).length;
        activeCounter.textContent = count;
        statusDiv.innerHTML = `📷 Найдено: ${count}/10 маркеров`;
        
        for (let i = 0; i < 10; i++) {
            const dot = document.getElementById(`dot-${i}`);
            if (dot) {
                dot.className = `marker-dot ${activeMarkers[i] ? 'active' : ''}`;
            }
        }
    }
    
    // Функция создания 3D объекта для маркера
    async function create3DObject(index, scene) {
        const group = new BABYLON.TransformNode(`group_${index}`);
        
        // Пытаемся загрузить модель из папки models
        // Если модели нет, создаем простую геометрию
        try {
            // Пробуем загрузить .glb модель
            const result = await BABYLON.SceneLoader.ImportMeshAsync(
                "",
                "models/",
                `model${index + 1}.glb`,
                scene
            );
            
            result.meshes.forEach(mesh => {
                mesh.parent = group;
                mesh.scaling.scaleInPlace(0.1); // Масштабируем под размер маркера
            });
            
        } catch (e) {
            console.log(`Модель ${index + 1} не найдена, создаем геометрию`);
            
            // Создаем уникальную геометрию для каждого маркера
            let mesh;
            const material = new BABYLON.StandardMaterial(`mat_${index}`, scene);
            
            // Разные цвета для разных маркеров
            const colors = [
                [1,0,0], [0,1,0], [0,0,1], [1,1,0], [1,0,1],
                [0,1,1], [1,0.5,0], [0.5,0,0.5], [0,0.5,0], [0.5,0.5,0.5]
            ];
            material.diffuseColor = new BABYLON.Color3(colors[index][0], colors[index][1], colors[index][2]);
            material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            
            // Создаем разные формы
            switch(index % 5) {
                case 0:
                    mesh = BABYLON.MeshBuilder.CreateBox(`obj_${index}`, { size: 0.07 }, scene);
                    // Анимация вращения
                    scene.onBeforeRenderObservable.add(() => {
                        if (mesh.isEnabled()) mesh.rotation.y += 0.02;
                    });
                    break;
                case 1:
                    mesh = BABYLON.MeshBuilder.CreateSphere(`obj_${index}`, { diameter: 0.07 }, scene);
                    // Анимация пульсации
                    let scale = 1;
                    let dir = 1;
                    scene.onBeforeRenderObservable.add(() => {
                        if (mesh.isEnabled()) {
                            scale += 0.01 * dir;
                            if (scale > 1.2) dir = -1;
                            if (scale < 0.8) dir = 1;
                            mesh.scaling.setAll(scale);
                        }
                    });
                    break;
                case 2:
                    mesh = BABYLON.MeshBuilder.CreateCylinder(`obj_${index}`, { height: 0.1, diameter: 0.05 }, scene);
                    // Анимация вращения
                    scene.onBeforeRenderObservable.add(() => {
                        if (mesh.isEnabled()) mesh.rotation.y += 0.03;
                    });
                    break;
                case 3:
                    mesh = BABYLON.MeshBuilder.CreateTorus(`obj_${index}`, { diameter: 0.07, thickness: 0.02 }, scene);
                    // Анимация вращения
                    scene.onBeforeRenderObservable.add(() => {
                        if (mesh.isEnabled()) {
                            mesh.rotation.y += 0.02;
                            mesh.rotation.x += 0.01;
                        }
                    });
                    break;
                case 4:
                    mesh = BABYLON.MeshBuilder.CreateCylinder(`obj_${index}`, { height: 0.1, diameterTop: 0, diameterBottom: 0.07 }, scene);
                    // Анимация прыжков
                    let yOffset = 0;
                    let yDir = 1;
                    scene.onBeforeRenderObservable.add(() => {
                        if (mesh.isEnabled()) {
                            yOffset += 0.002 * yDir;
                            if (Math.abs(yOffset) > 0.03) yDir *= -1;
                            mesh.position.y = yOffset;
                        }
                    });
                    break;
            }
            
            mesh.material = material;
            mesh.parent = group;
        }
        
        group.setEnabled(false); // Изначально скрыт
        return group;
    }
    
    // Создаем все 3D объекты
    statusDiv.innerHTML = '🔄 Загрузка 3D объектов...';
    for (let i = 0; i < 10; i++) {
        const obj = await create3DObject(i, scene);
        objects.set(markerImages[i].src, obj);
    }
    
    // Настраиваем WebXR
    statusDiv.innerHTML = '🔍 Запуск AR...';
    
    try {
        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: 'immersive-ar',
                referenceSpaceType: 'local'
            }
        });
        
        const featuresManager = xrHelper.enterXR?.featuresManager;
        
        if (featuresManager) {
            // Включаем трекинг изображений
            const imageTracking = featuresManager.enableFeature(
                BABYLON.WebXRFeatureName.IMAGE_TRACKING,
                'latest',
                {
                    images: markerImages
                }
            );
            
            // Когда маркер найден
            imageTracking.onTrackedImageAddedObservable.add((image) => {
                const index = markerImages.findIndex(m => m.src === image.src);
                if (index !== -1) {
                    console.log(`✅ Маркер ${index + 1} найден`);
                    activeMarkers[index] = true;
                    
                    const obj = objects.get(image.src);
                    if (obj) {
                        obj.setEnabled(true);
                    }
                    
                    updateUI();
                }
            });
            
            // Когда маркер потерян
            imageTracking.onTrackedImageRemovedObservable.add((image) => {
                const index = markerImages.findIndex(m => m.src === image.src);
                if (index !== -1) {
                    console.log(`❌ Маркер ${index + 1} потерян`);
                    activeMarkers[index] = false;
                    
                    const obj = objects.get(image.src);
                    if (obj) {
                        obj.setEnabled(false);
                    }
                    
                    updateUI();
                }
            });
            
            // Обновление позиции объекта
            imageTracking.onTrackedImageUpdatedObservable.add((image) => {
                const index = markerImages.findIndex(m => m.src === image.src);
                if (index !== -1) {
                    const obj = objects.get(image.src);
                    if (obj) {
                        // Получаем позицию из матрицы
                        const pose = image.transformationMatrix;
                        obj.position.x = pose.m[12];
                        obj.position.y = pose.m[13];
                        obj.position.z = pose.m[14];
                        
                        // Устанавливаем поворот
                        const rotationMatrix = BABYLON.Matrix.FromArray(pose.m);
                        const quaternion = new BABYLON.Quaternion();
                        BABYLON.Quaternion.FromRotationMatrixToRef(rotationMatrix, quaternion);
                        obj.rotationQuaternion = quaternion;
                    }
                }
            });
            
            statusDiv.innerHTML = '✅ AR готов. Наведите на маркеры!';
            updateUI();
        }
        
    } catch (error) {
        console.error('WebXR ошибка:', error);
        statusDiv.innerHTML = '❌ Ошибка AR: ' + error.message;
    }
    
    // Запуск рендера
    engine.runRenderLoop(() => {
        scene.render();
    });
    
    // Адаптация под размер окна
    window.addEventListener('resize', () => engine.resize());
});