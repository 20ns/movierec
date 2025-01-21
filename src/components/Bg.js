import React, { useEffect, useRef } from 'react';
import '../index.css';

const EnhancedDarkBackground = () => {
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

    // Darker color palette with increased contrast
    const colors = [
      'rgba(35, 65, 90, 0.5)',    // Deep ocean blue
      'rgba(60, 30, 60, 0.5)',    // Royal purple
      'rgba(150, 40, 40, 0.5)',   // Crimson
      'rgba(40, 80, 60, 0.5)',    // Emerald
      'rgba(80, 50, 30, 0.5)'     // Bronze
    ];

    class Circle {
      constructor() {
        this.radius = 60 + Math.random() * 60; // Increased base size
        this.x = Math.random() * canvas.width;
        this.y = Math.random() * canvas.height;
        this.color = colors[Math.floor(Math.random() * colors.length)];
        this.dx = (Math.random() - 0.5) * 0.4;
        this.dy = (Math.random() - 0.5) * 0.4;
        this.baseSize = this.radius;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        
        // Enhanced gradient fill
        const gradient = ctx.createRadialGradient(
          this.x, this.y, this.radius * 0.3,
          this.x, this.y, this.radius
        );
        gradient.addColorStop(0, this.color);
        gradient.addColorStop(1, 'rgba(0,0,0,0)');
        
        ctx.fillStyle = gradient;
        ctx.filter = 'blur(30px)'; // Increased blur for smoother edges
        ctx.fill();
      }

      update() {
        // Mouse interaction
        if (mousePos.current.x && mousePos.current.y) {
          const dx = mousePos.current.x - this.x;
          const dy = mousePos.current.y - this.y;
          const distance = Math.sqrt(dx * dx + dy * dy);
          
          // Stronger repel effect for larger circles
          if (distance < 200) { // Increased interaction radius
            const force = (200 - distance) / 50;
            this.dx -= (dx / distance) * force;
            this.dy -= (dy / distance) * force;
            this.radius = Math.max(this.baseSize * 0.6, this.radius - 0.8);
          } else {
            this.radius = Math.min(this.baseSize, this.radius + 0.5);
          }
        }

        // Wall collision with size consideration
        if (this.x + this.radius > canvas.width || this.x - this.radius < 0) {
          this.dx *= -1;
        }
        if (this.y + this.radius > canvas.height || this.y - this.radius < 0) {
          this.dy *= -1;
        }

        // Adjusted friction for smoother movement
        this.dx *= 0.97;
        this.dy *= 0.97;

        this.x += this.dx;
        this.y += this.dy;
        
        this.draw();
      }
    }

    // Initialize more circles
    const init = () => {
      circles.current = [];
      for (let i = 0; i < 15; i++) { // Increased quantity (from 8 to 15)
        circles.current.push(new Circle());
      }
    };

    // Animation loop
    const animate = () => {
      ctx.fillStyle = '#0a0a0a';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      circles.current.forEach(circle => circle.update());
      requestAnimationFrame(animate);
    };

    // Event handlers
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

export default EnhancedDarkBackground;