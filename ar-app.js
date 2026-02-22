// Включаем подробное логирование
console.log('🚀 AR приложение запускается...');

document.addEventListener('DOMContentLoaded', async () => {
    console.log('📄 DOM загружен');
    
    const canvas = document.getElementById('renderCanvas');
    if (!canvas) {
        console.error('❌ Canvas не найден!');
        return;
    }
    console.log('✅ Canvas найден');
    
    // UI элементы
    const statusDiv = document.getElementById('status');
    const activeCounter = document.getElementById('activeCounter');
    const markerGrid = document.getElementById('markerGrid');
    
    function updateStatus(message, isError = false) {
        console.log(isError ? '❌' : 'ℹ️', message);
        if (statusDiv) {
            statusDiv.innerHTML = (isError ? '❌ ' : '🔄 ') + message;
            statusDiv.style.color = isError ? '#f44336' : '#4CAF50';
        }
    }
    
    updateStatus('Инициализация Babylon.js...');
    
    try {
        // Создаем движок
        const engine = new BABYLON.Engine(canvas, true);
        console.log('✅ Babylon Engine создан');
        
        // Создаем сцену
        const scene = new BABYLON.Scene(engine);
        scene.clearColor = new BABYLON.Color4(0, 0, 0, 0);
        console.log('✅ Сцена создана');
        
        // Создаем UI для 10 маркеров
        if (markerGrid) {
            markerGrid.innerHTML = '';
            for (let i = 0; i < 10; i++) {
                const item = document.createElement('div');
                item.className = 'marker-item';
                item.innerHTML = `
                    <div class="marker-dot" id="dot-${i}"></div>
                    <span>Маркер ${i + 1}</span>
                `;
                markerGrid.appendChild(item);
            }
            console.log('✅ UI маркеров создан');
        }
        
        // Проверяем поддержку WebXR
        if (!navigator.xr) {
            updateStatus('WebXR не поддерживается браузером', true);
            return;
        }
        console.log('✅ WebXR поддерживается');
        
        // Проверяем поддержку AR режима
        const isARSupported = await navigator.xr.isSessionSupported('immersive-ar');
        if (!isARSupported) {
            updateStatus('AR режим не поддерживается на этом устройстве', true);
            return;
        }
        console.log('✅ AR режим поддерживается');
        
        // Проверяем наличие изображений маркеров
        const markerImages = [];
        for (let i = 0; i < 10; i++) {
            const imgSrc = `images/marker${i + 1}.jpg`;
            markerImages.push({
                name: `marker${i + 1}`,
                src: imgSrc,
                estimatedRealWorldWidth: 0.1
            });
            console.log(`📸 Маркер ${i + 1}: ${imgSrc}`);
        }
        
        // Создаем простые 3D объекты (для теста)
        const objects = new Map();
        const activeMarkers = new Array(10).fill(false);
        
        // Функция обновления UI
        function updateUI() {
            const count = activeMarkers.filter(Boolean).length;
            if (activeCounter) activeCounter.textContent = count;
            updateStatus(`Найдено: ${count}/10 маркеров`);
            
            for (let i = 0; i < 10; i++) {
                const dot = document.getElementById(`dot-${i}`);
                if (dot) {
                    dot.className = `marker-dot ${activeMarkers[i] ? 'active' : ''}`;
                }
            }
        }
        
        // Создаем простые объекты для каждого маркера
        updateStatus('Создание 3D объектов...');
        
        const colors = [
            [1,0,0], [0,1,0], [0,0,1], [1,1,0], [1,0,1],
            [0,1,1], [1,0.5,0], [0.5,0,0.5], [0,0.5,0], [0.5,0.5,0.5]
        ];
        
        for (let i = 0; i < 10; i++) {
            const group = new BABYLON.TransformNode(`group_${i}`, scene);
            
            // Создаем куб с уникальным цветом
            const box = BABYLON.MeshBuilder.CreateBox(`obj_${i}`, { size: 0.07 }, scene);
            const material = new BABYLON.StandardMaterial(`mat_${i}`, scene);
            material.diffuseColor = new BABYLON.Color3(colors[i][0], colors[i][1], colors[i][2]);
            material.emissiveColor = new BABYLON.Color3(0.2, 0.2, 0.2);
            box.material = material;
            
            // Простая анимация вращения
            scene.onBeforeRenderObservable.add(() => {
                if (box.isEnabled()) {
                    box.rotation.y += 0.02;
                }
            });
            
            box.parent = group;
            group.setEnabled(false);
            
            objects.set(markerImages[i].src, group);
            console.log(`✅ Объект ${i + 1} создан`);
        }
        
        // Настраиваем WebXR
        updateStatus('Настройка WebXR...');
        
        console.log('🔄 Создание XR helper...');
        const xrHelper = await scene.createDefaultXRExperienceAsync({
            uiOptions: {
                sessionMode: 'immersive-ar',
                referenceSpaceType: 'local'
            }
        });
        console.log('✅ XR helper создан');
        
        if (!xrHelper.enterXR) {
            updateStatus('Ошибка: enterXR не доступен', true);
            return;
        }
        
        const featuresManager = xrHelper.enterXR.featuresManager;
        if (!featuresManager) {
            updateStatus('Ошибка: featuresManager не доступен', true);
            return;
        }
        console.log('✅ featuresManager получен');
        
        // Проверяем поддержку трекинга изображений
        if (!BABYLON.WebXRFeatureName.IMAGE_TRACKING) {
            updateStatus('Трекинг изображений не поддерживается', true);
            return;
        }
        
        // Включаем трекинг изображений
        updateStatus('Активация трекинга изображений...');
        
        const imageTracking = featuresManager.enableFeature(
            BABYLON.WebXRFeatureName.IMAGE_TRACKING,
            'latest',
            {
                images: markerImages
            }
        );
        
        if (!imageTracking) {
            updateStatus('Не удалось активировать трекинг изображений', true);
            return;
        }
        console.log('✅ Трекинг изображений активирован');
        
        // Обработчики событий
        imageTracking.onTrackedImageAddedObservable.add((image) => {
            const index = markerImages.findIndex(m => m.src === image.src);
            if (index !== -1) {
                console.log(`🎯 Маркер ${index + 1} НАЙДЕН!`, image);
                activeMarkers[index] = true;
                
                const obj = objects.get(image.src);
                if (obj) {
                    obj.setEnabled(true);
                    console.log(`✅ Объект ${index + 1} показан`);
                }
                
                updateUI();
            }
        });
        
        imageTracking.onTrackedImageRemovedObservable.add((image) => {
            const index = markerImages.findIndex(m => m.src === image.src);
            if (index !== -1) {
                console.log(`👋 Маркер ${index + 1} потерян`);
                activeMarkers[index] = false;
                
                const obj = objects.get(image.src);
                if (obj) {
                    obj.setEnabled(false);
                    console.log(`✅ Объект ${index + 1} скрыт`);
                }
                
                updateUI();
            }
        });
        
        imageTracking.onTrackedImageUpdatedObservable.add((image) => {
            const index = markerImages.findIndex(m => m.src === image.src);
            if (index !== -1) {
                const obj = objects.get(image.src);
                if (obj && obj.isEnabled()) {
                    // Обновляем позицию
                    const pose = image.transformationMatrix;
                    if (pose && pose.m) {
                        obj.position.x = pose.m[12];
                        obj.position.y = pose.m[13];
                        obj.position.z = pose.m[14];
                        
                        // Обновляем поворот
                        const rotationMatrix = BABYLON.Matrix.FromArray(pose.m);
                        const quaternion = new BABYLON.Quaternion();
                        BABYLON.Quaternion.FromRotationMatrixToRef(rotationMatrix, quaternion);
                        obj.rotationQuaternion = quaternion;
                    }
                }
            }
        });
        
        // Добавляем камеру (на всякий случай)
        const camera = new BABYLON.FreeCamera('camera', new BABYLON.Vector3(0, 0, 0), scene);
        
        // Запускаем рендер
        engine.runRenderLoop(() => {
            scene.render();
        });
        
        window.addEventListener('resize', () => engine.resize());
        
        updateStatus('✅ AR готов! Наведите на маркеры');
        console.log('🎉 AR приложение успешно запущено!');
        
        // Показываем инструкцию в консоли
        console.log('📸 Маркеры должны быть в папке images/');
        console.log('📱 Наведите камеру на маркеры');
        
    } catch (error) {
        console.error('❌ КРИТИЧЕСКАЯ ОШИБКА:', error);
        updateStatus('Ошибка: ' + error.message, true);
    }
});
