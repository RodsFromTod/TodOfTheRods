// visuals.js - Enhanced WebGL rendering with procedural textures

console.log('SimplexNoise from window:', window.SimplexNoise);
const SimplexNoise = window.SimplexNoise;
if (!SimplexNoise) {
    console.error('SimplexNoise not loaded from simplex-noise.min.js');
}
const noise = SimplexNoise ? new SimplexNoise() : {
    noise2D: (x, y) => Math.random() * 2 - 1 // Fallback
};
console.log('Noise instance:', noise, 'Has noise2D?', typeof noise.noise2D === 'function');

class Visuals {
    constructor() {
        this.scene = null;
        this.camera = null;
        this.renderer = null;
        this.composer = null;
        this.terrainMesh = null;
        this.virtualTerrainMesh = null;
        this.rodMesh = null;
        this.ejectaMeshes = [];
        this.shockwaveMesh = null;
        this.objectMeshes = new Map();
        this.rainParticles = null;
        this.cloudGroup = null;

        this.clock = new THREE.Clock();
        this.zoomLevel = 1;
        this.minZoom = 0.5;
        this.maxZoom = 100;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.cameraAngle = Math.PI / 4;

        this.lastLogTime = 0;
        this.logInterval = 5000; // 5 seconds

        Game.systems.visuals = this;
        console.log('Visuals constructor called');
    }

    init(canvas) {
        console.log('Visuals init started');
        if (!canvas) {
            console.error('No canvas provided to visuals.init');
            return;
        }

        try {
            this.scene = new THREE.Scene();
            console.log('Scene created');

            this.camera = new THREE.PerspectiveCamera(75, canvas.width / canvas.height, 0.1, 6372000);
            this.camera.position.set(5, 20, 15);
            this.camera.lookAt(5, 0, 5);
            console.log('Camera initialized at', this.camera.position);

            this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
            this.renderer.setSize(canvas.width, canvas.height);
            this.renderer.setClearColor(0x4682b4, 1);
            this.renderer.shadowMap.enabled = true;
            console.log('Renderer initialized with size', canvas.width, 'x', canvas.height);

            const ambientLight = new THREE.AmbientLight(0x808080, 2.0);
            const directionalLight = new THREE.DirectionalLight(0xffffff, 1.2);
            directionalLight.position.set(10, 20, 10);
            directionalLight.castShadow = true;
            directionalLight.shadow.mapSize.width = 1024;
            directionalLight.shadow.mapSize.height = 1024;
            this.scene.add(ambientLight, directionalLight);
            console.log('Lights added');

            this.scene.fog = new THREE.Fog(0x4682b4, 10, 1000);
            console.log('Fog set');

            // Debug cube for visibility check
            const debugCube = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: 0xff00ff }));
            debugCube.position.set(5, 5, 5);
            this.scene.add(debugCube);
            console.log('Debug cube added at (5,5,5)');

            this.composer = null;
            console.log('Using basic renderer for debugging');

            console.log('Core WebGL initialized successfully');
        } catch (e) {
            console.error('Failed to initialize WebGL in visuals.js:', e);
            return;
        }

        if (Game.systems.terrain) {
            this.initializeTerrain();
            this.initializeVirtualTerrain();
        }

        canvas.addEventListener('wheel', this.handleZoom.bind(this));
        canvas.addEventListener('mousedown', this.startDrag.bind(this));
        canvas.addEventListener('mousemove', this.drag.bind(this));
        canvas.addEventListener('mouseup', this.stopDrag.bind(this));
    }

    initializeTerrain() {
        if (!Game.systems.terrain) {
            console.warn('Terrain not initialized, skipping terrain setup');
            return;
        }
        try {
            const terrainData = Game.systems.terrain.getTerrainData();
            this.log('Initializing terrain with data:', terrainData);

            const terrainGeometry = new THREE.PlaneGeometry(terrainData.width, terrainData.depth, terrainData.gridWidth - 1, terrainData.gridDepth - 1);
            const terrainMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.DoubleSide });
            this.terrainMesh = new THREE.Mesh(terrainGeometry, terrainMaterial);
            this.terrainMesh.rotation.x = -Math.PI / 2;
            this.terrainMesh.position.set(5, 0, 5);
            this.scene.add(this.terrainMesh);
            this.updateTerrain();
            console.log('Physical terrain initialized at', this.terrainMesh.position, 'vertices count:', terrainGeometry.attributes.position.count);
        } catch (e) {
            console.error('Failed to initialize terrain:', e);
        }
    }

    initializeVirtualTerrain() {
        const terrainData = Game.systems.terrain.getTerrainData();
        const virtualGeometry = new THREE.SphereGeometry(6371000, 64, 64);
        const virtualMaterial = new THREE.MeshBasicMaterial({ color: 0x00ff00, side: THREE.BackSide });
        this.virtualTerrainMesh = new THREE.Mesh(virtualGeometry, virtualMaterial);
        this.virtualTerrainMesh.position.set(5, -6371000, 5);
        this.scene.add(this.virtualTerrainMesh);
        console.log('Virtual terrain initialized at', this.virtualTerrainMesh.position);
    }

    handleZoom(event) {
        event.preventDefault();
        const zoomSpeed = 0.1;
        const direction = event.deltaY > 0 ? -1 : 1;
        const newZoom = this.zoomLevel * (1 + direction * zoomSpeed);

        const terrainData = Game.systems.terrain.getTerrainData();
        const terrainWidth = terrainData.width;
        const canvasWidth = Game.canvas.width;
        const minZoom = terrainWidth / (canvasWidth * 2);
        const maxZoom = 100;

        this.zoomLevel = Math.max(minZoom, Math.min(maxZoom, newZoom));
        this.updateCameraPosition();
        this.log('Zoom level:', this.zoomLevel);
    }

    startDrag(event) {
        this.isDragging = true;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;
    }

    drag(event) {
        if (!this.isDragging) return;
        const deltaX = event.clientX - this.lastMouseX;
        const deltaY = event.clientY - this.lastMouseY;
        this.lastMouseX = event.clientX;
        this.lastMouseY = event.clientY;

        const moveSpeed = 0.1 / this.zoomLevel;
        const moveX = -deltaX * moveSpeed;
        const moveZ = -deltaY * moveSpeed;

        const terrainData = Game.systems.terrain.getTerrainData();
        const terrainWidth = terrainData.width;
        const terrainDepth = terrainData.depth;
        const boundaryPadding = terrainWidth * 0.5;

        const newPosX = Math.max(-boundaryPadding, Math.min(terrainWidth + boundaryPadding, this.camera.position.x + moveX));
        const newPosZ = Math.max(-boundaryPadding, Math.min(terrainDepth + boundaryPadding, this.camera.position.z + moveZ));

        this.camera.position.x = newPosX;
        this.camera.position.z = newPosZ;
        this.updateCameraPosition();
        this.log('Camera dragged to', this.camera.position);
    }

    stopDrag() {
        this.isDragging = false;
    }

    updateCameraPosition() {
        const terrainData = Game.systems.terrain.getTerrainData();
        const baseHeight = 20;
        const baseZOffset = 15;
        const height = Math.max(0.2, baseHeight / this.zoomLevel);
        const zOffset = baseZOffset / this.zoomLevel;
        const targetX = this.camera.position.x;
        const targetZ = this.camera.position.z - zOffset;

        this.camera.position.set(targetX, height, targetZ + zOffset);
        this.camera.lookAt(targetX, 0, targetZ);
        this.log('Camera position updated to', this.camera.position);
    }

    log(...args) {
        const now = Date.now();
        if (now - this.lastLogTime >= this.logInterval) {
            console.log(...args);
            this.lastLogTime = now;
        }
    }

    render() {
        if (!this.renderer) {
            console.warn('Renderer not initialized, skipping render');
            return;
        }

        const deltaTime = this.clock.getDelta();
        this.updateTerrain();

        if (Game.gameState.currentRodIndex >= 0) {
            const rodState = Game.systems.physics.getObjectState(Game.gameState.currentRodIndex);
            const rodData = Game.systems.rods.getRodState();
            if (!rodState || !rodState.position || !rodState.velocity) {
                if (this.rodMesh) {
                    const impactEnergy = rodState && rodState.energy ? rodState.energy : 0;
                    if (impactEnergy > 10000) {
                        this.scene.remove(this.rodMesh);
                        this.rodMesh = null;
                        this.log('Rod removed due to energy > 10000 J:', impactEnergy);
                    }
                }
                return;
            }
            if (!this.rodMesh) {
                const geometry = new THREE.CylinderGeometry(rodData.radius, rodData.radius, rodData.length, 16);
                const material = new THREE.MeshBasicMaterial({ color: this.hexToThreeColor(Game.systems.rods.materials[rodData.material.toLowerCase()].color) });
                this.rodMesh = new THREE.Mesh(geometry, material);
                this.scene.add(this.rodMesh);
                this.log('Rod mesh created at', rodState.position);
            }
            this.rodMesh.position.set(rodState.position.x, rodState.position.y - rodData.length / 2, rodState.position.z);
            const degradation = Game.systems.rods.checkDegradation(rodState.velocity);
            if (degradation.degraded) {
                this.rodMesh.material.opacity = Math.max(0.3, 1 - degradation.massLoss / rodData.mass);
                this.rodMesh.scale.setScalar(1 - degradation.massLoss / rodData.mass);
            }
            if (rodState.collided) {
                this.handleImpact(Game.gameState.currentRodIndex);
                if (rodState.energy > 10000) {
                    this.scene.remove(this.rodMesh);
                    this.rodMesh = null;
                    this.log('Rod removed post-impact, energy:', rodState.energy);
                } else {
                    this.log('Rod persists post-impact, energy:', rodState.energy);
                }
            }

            if (rodState.velocity.y < -1000) {
                const particle = new THREE.Mesh(new THREE.SphereGeometry(0.5, 8, 8), new THREE.MeshBasicMaterial({ color: 0xff4500, transparent: true, opacity: 0.5 }));
                particle.position.copy(this.rodMesh.position);
                this.scene.add(particle);
                setTimeout(() => this.scene.remove(particle), 200);
            }
        }

        this.updateWeatherEffects(deltaTime);
        this.updateObjectAnimations();

        if (this.composer) {
            this.composer.render();
        } else {
            this.renderer.render(this.scene, this.camera);
        }
    }

    updateTerrain() {
        if (!this.terrainMesh || !Game.systems.terrain) return;

        const terrainData = Game.systems.terrain.getTerrainData();
        const vertices = this.terrainMesh.geometry.attributes.position.array;
        const colors = new Float32Array(vertices.length);

        this.log('Terrain data:', terrainData);

        for (let x = 0; x < terrainData.gridWidth; x++) {
            for (let z = 0; z < terrainData.gridDepth; z++) {
                const vertexIndex = (x + z * terrainData.gridWidth) * 3;
                const height = terrainData.heightMap[x][z] || 0;
                const noiseValue = noise.noise2D(x / 10, z / 10) * 5;
                const yPos = height + noiseValue;
                if (isNaN(yPos)) {
                    console.error(`NaN detected at x=${x}, z=${z}: height=${height}, noise=${noiseValue}`);
                }
                // Set local Z for height (world Y after rotation)
                vertices[vertexIndex + 2] = yPos;
                const typeColor = new THREE.Color(this.hexToThreeColor(terrainData.terrainTypes[terrainData.typeMap[x][z]].color));
                colors[vertexIndex] = typeColor.r;
                colors[vertexIndex + 1] = typeColor.g;
                colors[vertexIndex + 2] = typeColor.b;
            }
        }
        this.terrainMesh.geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        this.terrainMesh.geometry.attributes.position.needsUpdate = true;
        this.terrainMesh.geometry.attributes.color.needsUpdate = true;
        this.terrainMesh.geometry.computeVertexNormals();

        terrainData.objects.forEach(obj => {
            const key = `${obj.x},${obj.z}`;
            if (!this.objectMeshes.has(key) && obj.intact) {
                const geometry = new THREE.BoxGeometry(1, obj.height, 1);
                const material = new THREE.MeshBasicMaterial({ color: this.hexToThreeColor(obj.type === 'tree' ? '#8B4513' : '#808080') });
                const mesh = new THREE.Mesh(geometry, material);
                mesh.position.set(obj.x, obj.y + (obj.type === 'tree' ? 0 : obj.height / 2), obj.z);
                this.scene.add(mesh);
                this.objectMeshes.set(key, { mesh, physicsIndex: undefined });
                this.log(`Object ${obj.type} added at`, mesh.position);
            }
        });
    }

    updateWeatherEffects(deltaTime) {
        const weatherData = Game.systems.weather ? Game.systems.weather.getWeatherData() : { precipIntensity: 0, cloudCover: 0, windScale: 1 };
        this.scene.fog.density = (weatherData.cloudCover + weatherData.precipIntensity) * 0.001;

        if (weatherData.precipIntensity > 0) {
            if (!this.rainParticles) {
                const terrainData = Game.systems.terrain.getTerrainData();
                const geometry = new THREE.BufferGeometry();
                const positions = new Float32Array(5000 * 3);
                for (let i = 0; i < 5000; i++) {
                    positions[i * 3] = (Math.random() - 0.5) * terrainData.width + 5;
                    positions[i * 3 + 1] = Math.random() * 1000;
                    positions[i * 3 + 2] = (Math.random() - 0.5) * terrainData.depth + 5;
                }
                geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
                const material = new THREE.LineBasicMaterial({ color: weatherData.exoticType === 'acid' ? 0x00ff00 : 0x0000ff, opacity: 0.5, transparent: true });
                this.rainParticles = new THREE.LineSegments(geometry, material);
                this.scene.add(this.rainParticles);
                this.log('Rain particles added');
            }
            const positions = this.rainParticles.geometry.attributes.position.array;
            for (let i = 0; i < positions.length / 3; i++) {
                positions[i * 3 + 1] -= deltaTime * 50 * weatherData.precipIntensity;
                if (positions[i * 3 + 1] < 0) positions[i * 3 + 1] += 1000;
            }
            this.rainParticles.geometry.attributes.position.needsUpdate = true;
        } else if (this.rainParticles) {
            this.scene.remove(this.rainParticles);
            this.rainParticles = null;
        }

        if (weatherData.cloudCover > 0.3 && !this.cloudGroup) {
            const terrainData = Game.systems.terrain.getTerrainData();
            this.cloudGroup = new THREE.Group();
            for (let i = 0; i < 10; i++) {
                const cloud = new THREE.Mesh(
                    new THREE.SphereGeometry(10, 16, 16),
                    new THREE.MeshBasicMaterial({ color: 0xcccccc, transparent: true, opacity: weatherData.cloudCover * 0.5 })
                );
                cloud.position.set((Math.random() - 0.5) * 20 + 5, 30 + Math.random() * 10, (Math.random() - 0.5) * 20 + 5);
                this.cloudGroup.add(cloud);
            }
            this.scene.add(this.cloudGroup);
            this.log('Clouds added');
        } else if (weatherData.cloudCover <= 0.3 && this.cloudGroup) {
            this.scene.remove(this.cloudGroup);
            this.cloudGroup = null;
        }
    }

    updateObjectAnimations() {
        this.objectMeshes.forEach((entry, key) => {
            const { mesh, physicsIndex } = entry;
            if (physicsIndex !== undefined) {
                const state = Game.systems.physics.getObjectState(physicsIndex);
                if (state && state.active) {
                    mesh.position.set(state.position.x, state.position.y, state.position.z);
                    if (mesh.children.length > 1) {
                        mesh.rotation.z = Math.atan2(state.velocity.x, state.velocity.y) * 0.5;
                    }
                }
            }
        });
    }

    hexToThreeColor(hex) {
        return parseInt(hex.replace('#', '0x'), 16);
    }

    reset() {
        this.scene.children = this.scene.children.filter(c => c === this.terrainMesh || c === this.virtualTerrainMesh || c.type === 'Light');
        this.rodMesh = null;
        this.ejectaMeshes = [];
        this.shockwaveMesh = null;
        this.objectMeshes.clear();
        this.rainParticles = null;
        this.cloudGroup = null;
        this.zoomLevel = 1;
        this.updateCameraPosition();
        this.updateTerrain();
        this.lastLogTime = 0;
        this.scene.fog.density = 0;
    }

    handleImpact(physicsIndex) {
        this.log(`Impact handled for physicsIndex: ${physicsIndex}`);
        const rodState = Game.systems.physics.getObjectState(physicsIndex);
        if (rodState) {
            const impactX = rodState.position.x;
            const impactZ = rodState.position.z;
            const craterRadius = Game.systems.impact.getCraterRadius(rodState.energy);
            const craterDepth = Game.systems.impact.getCraterDepth(rodState.energy);

            const terrainData = Game.systems.terrain.getTerrainData();
            for (let x = 0; x < terrainData.gridWidth; x++) {
                for (let z = 0; z < terrainData.gridDepth; z++) {
                    const dx = (x - (impactX - 5));
                    const dz = (z - (impactZ - 5));
                    const distance = Math.sqrt(dx * dx + dz * dz);
                    if (distance < craterRadius) {
                        const depthFactor = 1 - (distance / craterRadius);
                        terrainData.heightMap[x][z] -= craterDepth * depthFactor;
                    }
                }
            }
            this.updateTerrain();
            this.log(`Crater created at (${impactX}, ${impactZ}), radius: ${craterRadius}, depth: ${craterDepth}, energy: ${rodState.energy} J`);
        }
    }
}

const VisualsInstance = new Visuals();
window.Visuals = VisualsInstance;