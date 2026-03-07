import * as THREE from 'three';

export function createImpactEffect(scene, position, isPlayer) {
    const geo = new THREE.SphereGeometry(0.1, 8, 8);
    const mat = new THREE.MeshBasicMaterial({ color: isPlayer ? 0xff0000 : 0x000000 });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.copy(position);
    scene.add(mesh);

    setTimeout(() => {
        if (scene) scene.remove(mesh);
    }, 1000);
}
