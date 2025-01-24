// Bg.js
import React, { useEffect, useRef, useCallback } from 'react';
import { EventEmitter } from '../events';

const Bg = () => {
  const canvasRef = useRef(null);
  const circles = useRef([]);
  const mousePos = useRef({ x: null, y: null });
  const targetColor = useRef(null);
  const currentColor = useRef({ r: 10, g: 10, b: 10 });

  const handleAccentColor = useCallback((color) => {
    console.log("Received accentColor:", color);
    if (!color) {
      targetColor.current = null;
      return;
    }
    const rgbValues = color.substring(4, color.length - 1).replace(/\s/g, '').split(',');
    targetColor.current = {
      r: parseInt(rgbValues[0]),
      g: parseInt(rgbValues[1]),
      b: parseInt(rgbValues[2])
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
    const ctx = canvas.getContext('2d');

    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    class Circle {
      constructor() {
        this.radius = 60 + Math.random() * 60;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.dx = (Math.random() - 0.5) * 0.4;
        this.dy = (Math.random() - 0.5) * 0.4;
        this.baseSize = this.radius;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);

        const gradient = ctx.createRadialGradient(
          this.x, this.y, this.radius * 0.3,
          this.x, this.y, this.radius
        );
        gradient.addColorStop(0, `rgba(255,255,255,0.1)`);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');

        ctx.fillStyle = gradient;
        ctx.filter = 'blur(30px)';
        ctx.fill();
      }

      update() {
        if (mousePos.current.x && mousePos.current.y) {
          const dx = mousePos.current.x - this.x;
          const dy = mousePos.current.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);

          if (distance < 200) {
            const force = (200 - distance) / 50;
            this.dx -= (dx / distance) * force;
            this.dy -= (dy / distance) * force;
            this.radius = Math.max(this.baseSize * 0.6, this.radius - 0.8);
          } else {
            this.radius = Math.min(this.baseSize, this.radius + 0.5);
          }
        }

        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
          this.dx *= -1;
        }
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
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
      for (let i = 0; i < 15; i++) {
        circles.current.push(new Circle());
      }
    };

    const animate = () => {
      // Color transition
      if (targetColor.current) {
        currentColor.current.r += (targetColor.current.r - currentColor.current.r) * 0.1;
        currentColor.current.g += (targetColor.current.g - currentColor.current.g) * 0.1;
        currentColor.current.b += (targetColor.current.b - currentColor.current.b) * 0.1;
      } else {
        currentColor.current.r += (10 - currentColor.current.r) * 0.1;
        currentColor.current.g += (10 - currentColor.current.g) * 0.1;
        currentColor.current.b += (10 - currentColor.current.b) * 0.1;
      }

      ctx.fillStyle = `rgb(${Math.round(currentColor.current.r)},
                          ${Math.round(currentColor.current.g)},
                          ${Math.round(currentColor.current.b)})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      circles.current.forEach(circle => circle.update());
      requestAnimationFrame(animate);
    };

    const handleResize = () => {
      setCanvasSize();
      init();
    };

    const handleMouseMove = (e) => {
      mousePos.current = {
        x: e.clientX,
        y: e.clientY
      };
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    init();
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
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
        height: '100%'
      }}
    />
  );
};

export default Bg;