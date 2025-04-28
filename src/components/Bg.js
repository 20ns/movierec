// Bg.js
import React, { useEffect, useRef, useCallback } from 'react';
import { EventEmitter } from '../events';

// Helper function to throttle events
const throttle = (func, limit) => {
  let inThrottle;
  return function(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Detect if device is mobile
const isMobileDevice = () => {
  return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
         (window.innerWidth <= 768);
};

const Bg = () => {
  const canvasRef = useRef(null);
  const circles = useRef([]);
  const mousePos = useRef({ x: null, y: null });
  const targetColor = useRef(null);
  const currentColor = useRef({ r: 20, g: 20, b: 20 });
  const animationFrameId = useRef(null);
  const devicePixelRatio = useRef(window.devicePixelRatio || 1);
  const isMobile = useRef(isMobileDevice());
  
  // Performance settings based on device
  const settings = useRef({
    circleCount: isMobileDevice() ? 8 : 15,
    blurAmount: isMobileDevice() ? 15 : 30,
    interactionRadius: isMobileDevice() ? 150 : 200,
    colorTransitionSpeed: 0.05,
    defaultColorTransitionSpeed: 0.03
  });

  const handleAccentColor = useCallback((color) => {
    if (!color) {
      targetColor.current = null;
      return;
    }

    const rgbString = color.replace(/[^\d,]/g, '');
    const rgbValues = rgbString.split(',').map(Number);

    if (rgbValues.length !== 3 || rgbValues.some(isNaN)) {
      console.error('Invalid color format:', color);
      return;
    }

    targetColor.current = {
      r: rgbValues[0],
      g: rgbValues[1],
      b: rgbValues[2]
    };
  }, []);

  useEffect(() => {
    EventEmitter.on('accentColor', handleAccentColor);
    return () => {
      EventEmitter.off('accentColor', handleAccentColor);
    };
  }, [handleAccentColor]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false }); // Optimize for non-transparent background
    
    // Handle high-DPI displays
    const setCanvasSize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * devicePixelRatio.current;
      canvas.height = height * devicePixelRatio.current;
      ctx.scale(devicePixelRatio.current, devicePixelRatio.current);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
    };
    setCanvasSize();

    class Circle {
      constructor() {
        this.radius = 60 + Math.random() * 60;
        this.x = Math.random() * (canvas.width / devicePixelRatio.current);
        this.y = Math.random() * (canvas.height / devicePixelRatio.current);
        this.dx = (Math.random() - 0.5) * 0.4;
        this.dy = (Math.random() - 0.5) * 0.4;
        this.baseSize = this.radius;
        // Pre-compute gradient
        this.updateGradient();
      }

      updateGradient() {
        const tempCanvas = document.createElement('canvas');
        const size = this.radius * 2;
        tempCanvas.width = size;
        tempCanvas.height = size;
        const tempCtx = tempCanvas.getContext('2d');
        
        const gradient = tempCtx.createRadialGradient(
          size/2, size/2, this.radius * 0.3,
          size/2, size/2, this.radius
        );
        gradient.addColorStop(0, `rgba(255,255,255,0.1)`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        tempCtx.fillStyle = gradient;
        tempCtx.beginPath();
        tempCtx.arc(size/2, size/2, this.radius, 0, Math.PI * 2);
        tempCtx.fill();
        
        this.gradientCache = tempCanvas;
      }

      draw() {
        // Use cached gradient when possible
        if (Math.abs(this.radius - this.lastDrawnRadius) > 5) {
          this.updateGradient();
          this.lastDrawnRadius = this.radius;
        }
        
        ctx.filter = `blur(${settings.current.blurAmount}px)`;
        ctx.drawImage(
          this.gradientCache, 
          this.x - this.radius, 
          this.y - this.radius,
          this.radius * 2,
          this.radius * 2
        );
        ctx.filter = 'none';
      }

      update() {
        if (mousePos.current.x && mousePos.current.y) {
          const dx = mousePos.current.x - this.x;
          const dy = mousePos.current.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < settings.current.interactionRadius) {
            const force = (settings.current.interactionRadius - distance) / 50;
            this.dx -= (dx / distance) * force;
            this.dy -= (dy / distance) * force;
            this.radius = Math.max(this.baseSize * 0.6, this.radius - 0.8);
          } else {
            this.radius = Math.min(this.baseSize, this.radius + 0.5);
          }
        }

        const width = canvas.width / devicePixelRatio.current;
        const height = canvas.height / devicePixelRatio.current;

        if (this.x + this.radius > width || this.x - this.radius < 0) {
          this.dx *= -1;
        }
        if (this.y + this.radius > height || this.y - this.radius < 0) {
          this.dy *= -1;
        }

        this.dx *= 0.97;
        this.dy *= 0.97;

        this.x += this.dx;
        this.y += this.dy;

        this.draw();
      }
    }

    const init = () => {
      circles.current = [];
      for (let i = 0; i < settings.current.circleCount; i++) {
        circles.current.push(new Circle());
      }
    };

    const animate = () => {
      if (targetColor.current) {
        currentColor.current.r += (targetColor.current.r - currentColor.current.r) * settings.current.colorTransitionSpeed;
        currentColor.current.g += (targetColor.current.g - currentColor.current.g) * settings.current.colorTransitionSpeed;
        currentColor.current.b += (targetColor.current.b - currentColor.current.b) * settings.current.colorTransitionSpeed;
      } else {
        currentColor.current.r += (20 - currentColor.current.r) * settings.current.defaultColorTransitionSpeed;
        currentColor.current.g += (20 - currentColor.current.g) * settings.current.defaultColorTransitionSpeed;
        currentColor.current.b += (20 - currentColor.current.b) * settings.current.defaultColorTransitionSpeed;
      }

      currentColor.current.r = Math.max(10, Math.min(50, currentColor.current.r));
      currentColor.current.g = Math.max(10, Math.min(50, currentColor.current.g));
      currentColor.current.b = Math.max(10, Math.min(50, currentColor.current.b));

      ctx.fillStyle = `rgb(${Math.round(currentColor.current.r)},
                          ${Math.round(currentColor.current.g)},
                          ${Math.round(currentColor.current.b)})`;
      ctx.fillRect(0, 0, canvas.width / devicePixelRatio.current, canvas.height / devicePixelRatio.current);

      circles.current.forEach(circle => circle.update());
      animationFrameId.current = requestAnimationFrame(animate);
    };

    const handleResize = throttle(() => {
      isMobile.current = isMobileDevice();
      // Update settings based on current device
      settings.current.circleCount = isMobile.current ? 8 : 15;
      settings.current.blurAmount = isMobile.current ? 15 : 30;
      settings.current.interactionRadius = isMobile.current ? 150 : 200;
      
      devicePixelRatio.current = window.devicePixelRatio || 1;
      setCanvasSize();
      init();
    }, 250);

    const handlePointerMove = throttle((e) => {
      mousePos.current = {
        x: e.clientX,
        y: e.clientY
      };
    }, 16); // ~60fps

    window.addEventListener('resize', handleResize, { passive: true });
    window.addEventListener('mousemove', handlePointerMove, { passive: true });
    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        handlePointerMove({ 
          clientX: e.touches[0].clientX, 
          clientY: e.touches[0].clientY 
        });
      }
    }, { passive: true });

    init();
    animationFrameId.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handlePointerMove);
      window.removeEventListener('touchmove', handlePointerMove);
      if (animationFrameId.current) {
        cancelAnimationFrame(animationFrameId.current);
      }
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex: 0,
        width: '100%',
        height: '100%',
        touchAction: 'none'
      }}
    />
  );
};

export default Bg;
