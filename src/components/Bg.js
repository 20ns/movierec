import React, { useEffect, useRef } from 'react';
import '../index.css';

const DarkInteractiveBackground = () => {
  const canvasRef = useRef(null);
  const circles = useRef([]);
  const mousePos = useRef({ x: null, y: null });

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const setCanvasSize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    setCanvasSize();

    // Darker color palette with transparency
    const colors = [
      'rgba(25, 55, 77, 0.4)',    // Deep slate blue
      'rgba(47, 79, 79, 0.4)',    // Dark cyan
      'rgba(75, 35, 75, 0.4)',    // Muted purple
      'rgba(139, 0, 0, 0.4)',     // Dark red
      'rgba(30, 60, 50, 0.4)'     // Deep emerald
    ];

    class Circle {
      constructor() {
        this.radius = 40 + Math.random() * 40;
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.dx = (Math.random() - 0.5) * 0.5;
        this.dy = (Math.random() - 0.5) * 0.5;
        this.baseSize = this.radius;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Create gradient fill
        const gradient = ctx.createRadialGradient(
          this.x, this.y, 0,
          this.x, this.y, this.radius
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.filter = 'blur(25px)';
        ctx.fill();
      }

      update() {
        // Mouse interaction
        if (mousePos.current.x && mousePos.current.y) {
          const dx = mousePos.current.x - this.x;
          const dy = mousePos.current.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Repel from mouse
          if (distance < 150) {
            this.dx -= (dx / distance) * 0.1;
            this.dy -= (dy / distance) * 0.1;
            this.radius = Math.max(this.baseSize * 0.7, this.radius - 0.5);
          } else {
            this.radius = Math.min(this.baseSize, this.radius + 0.5);
          }
        }

        // Bounce off walls
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
          this.dx *= -1;
        }
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
          this.dy *= -1;
        }

        // Apply friction
        this.dx *= 0.98;
        this.dy *= 0.98;

        this.x += this.dx;
        this.y += this.dy;
        
        this.draw();
      }
    }

    // Initialize circles
    const init = () => {
      circles.current = [];
      for (let i = 0; i < 8; i++) {
        circles.current.push(new Circle());
      }
    };

    // Animation loop
    const animate = () => {
      ctx.fillStyle = '#0a0a0a';  // Dark background
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      circles.current.forEach(circle => circle.update());
      requestAnimationFrame(animate);
    };

    // Handle resize
    const handleResize = () => {
      setCanvasSize();
      init();
    };

    // Mouse move handler
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

export default DarkInteractiveBackground;