/**
 * TouchControls — Virtual joystick + look zone for mobile FPS
 * 
 * Left side (bottom 40%, left 35%): Movement joystick
 * Right side (rest of screen): Camera look (drag to rotate)
 */

export const isMobile = (() => {
    const ua = /Android|iPhone|iPad|iPod|webOS|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
    const touch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    return (ua && touch) || (touch && window.innerWidth < 1024);
})();

export default class TouchControls {
    constructor(yawObject, pitchObject, keys) {
        this.yawObject = yawObject;
        this.pitchObject = pitchObject;
        this.keys = keys; // Reference to controls.keys

        // Joystick state
        this.joystickActive = false;
        this.joystickTouchId = null;
        this.joystickOrigin = { x: 0, y: 0 };
        this.joystickCurrent = { x: 0, y: 0 };

        // Look state
        this.lookTouchId = null;
        this.lookPrev = { x: 0, y: 0 };

        // Sensitivity
        this.lookSensitivity = 0.003;

        // Create joystick visual overlay
        this.createJoystickOverlay();

        // Bind touch events
        this.onTouchStart = this.onTouchStart.bind(this);
        this.onTouchMove = this.onTouchMove.bind(this);
        this.onTouchEnd = this.onTouchEnd.bind(this);

        document.addEventListener('touchstart', this.onTouchStart, { passive: false });
        document.addEventListener('touchmove', this.onTouchMove, { passive: false });
        document.addEventListener('touchend', this.onTouchEnd, { passive: false });
        document.addEventListener('touchcancel', this.onTouchEnd, { passive: false });
    }

    createJoystickOverlay() {
        // Joystick base (visible when active)
        this.joystickBase = document.createElement('div');
        this.joystickBase.className = 'touch-joystick-base';
        this.joystickBase.style.display = 'none';

        // Joystick thumb
        this.joystickThumb = document.createElement('div');
        this.joystickThumb.className = 'touch-joystick-thumb';
        this.joystickBase.appendChild(this.joystickThumb);

        document.body.appendChild(this.joystickBase);
    }

    isJoystickZone(x, y) {
        // Left 35% of screen, bottom 50%
        return x < window.innerWidth * 0.35 && y > window.innerHeight * 0.5;
    }

    isLookZone(x, y) {
        // Right side of screen (not joystick and not over UI buttons)
        return x > window.innerWidth * 0.35;
    }

    onTouchStart(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];
            const x = touch.clientX;
            const y = touch.clientY;

            // Check if touching a UI button (don't intercept)
            const el = document.elementFromPoint(x, y);
            if (el && (el.classList.contains('mobile-action-btn') || el.closest('.mobile-action-btn') || el.closest('.mobile-controls'))) {
                continue;
            }

            if (this.isJoystickZone(x, y) && this.joystickTouchId === null) {
                e.preventDefault();
                this.joystickTouchId = touch.identifier;
                this.joystickOrigin = { x, y };
                this.joystickCurrent = { x, y };
                this.joystickActive = true;

                // Show joystick at touch point
                this.joystickBase.style.display = 'block';
                this.joystickBase.style.left = (x - 50) + 'px';
                this.joystickBase.style.top = (y - 50) + 'px';
                this.joystickThumb.style.transform = 'translate(0px, 0px)';
            } else if (this.isLookZone(x, y) && this.lookTouchId === null) {
                e.preventDefault();
                this.lookTouchId = touch.identifier;
                this.lookPrev = { x, y };
            }
        }
    }

    onTouchMove(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            if (touch.identifier === this.joystickTouchId) {
                e.preventDefault();
                this.joystickCurrent = { x: touch.clientX, y: touch.clientY };

                const dx = this.joystickCurrent.x - this.joystickOrigin.x;
                const dy = this.joystickCurrent.y - this.joystickOrigin.y;
                const maxDist = 50;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const clampedDist = Math.min(dist, maxDist);
                const angle = Math.atan2(dy, dx);

                const clampedX = Math.cos(angle) * clampedDist;
                const clampedY = Math.sin(angle) * clampedDist;

                // Move thumb visual
                this.joystickThumb.style.transform = `translate(${clampedX}px, ${clampedY}px)`;

                // Map to WASD keys (normalized)
                const normX = clampedX / maxDist;
                const normY = clampedY / maxDist;
                const deadzone = 0.2;

                this.keys.w = normY < -deadzone;
                this.keys.s = normY > deadzone;
                this.keys.a = normX < -deadzone;
                this.keys.d = normX > deadzone;

                // Sprint if pushed to edge
                this.keys.shift = dist > maxDist * 0.85;
            }

            if (touch.identifier === this.lookTouchId) {
                e.preventDefault();
                const dx = touch.clientX - this.lookPrev.x;
                const dy = touch.clientY - this.lookPrev.y;

                // Apply rotation (same logic as mouse but from touch delta)
                this.yawObject.rotation.y -= dx * this.lookSensitivity;
                this.pitchObject.rotation.x -= dy * this.lookSensitivity;
                this.pitchObject.rotation.x = Math.max(
                    -Math.PI / 2,
                    Math.min(Math.PI / 2, this.pitchObject.rotation.x)
                );

                this.lookPrev = { x: touch.clientX, y: touch.clientY };
            }
        }
    }

    onTouchEnd(e) {
        for (let i = 0; i < e.changedTouches.length; i++) {
            const touch = e.changedTouches[i];

            if (touch.identifier === this.joystickTouchId) {
                this.joystickTouchId = null;
                this.joystickActive = false;
                this.joystickBase.style.display = 'none';

                // Release all movement keys
                this.keys.w = false;
                this.keys.s = false;
                this.keys.a = false;
                this.keys.d = false;
                this.keys.shift = false;
            }

            if (touch.identifier === this.lookTouchId) {
                this.lookTouchId = null;
            }
        }
    }

    cleanup() {
        document.removeEventListener('touchstart', this.onTouchStart);
        document.removeEventListener('touchmove', this.onTouchMove);
        document.removeEventListener('touchend', this.onTouchEnd);
        document.removeEventListener('touchcancel', this.onTouchEnd);
        if (this.joystickBase && this.joystickBase.parentNode) {
            this.joystickBase.parentNode.removeChild(this.joystickBase);
        }
    }
}
