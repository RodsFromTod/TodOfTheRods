console.log('test-webgl.js loaded');

window.addEventListener('load', () => {
    console.log('Window load event triggered');
    const canvas = document.getElementById('gameCanvas');
    if (!canvas) {
        console.error('Canvas not found');
        return;
    }
    if (!window.THREE) {
        console.error('Three.js not loaded');
        return;
    }
    try {
        const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
        renderer.setSize(canvas.width, canvas.height);
        console.log('WebGL context created successfully');
    } catch (e) {
        console.error('Failed to create WebGL context:', e);
    }
});