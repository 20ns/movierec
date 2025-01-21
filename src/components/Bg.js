import React, { useEffect } from 'react';
import '../index.css';

const DynamicBackground = () => {
  useEffect(() => {
    const canvas = document.getElementById('backgroundCanvas');
    const ctx = canvas.getContext('2d');
    const colors = ['#ff6f61', '#6a5acd', '#48c9b0'];
    const circles = [];

    // Set canvas size
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    // Circle constructor
    class Circle {
      constructor(x, y, radius, color, speed) {
        this.x = x;
        this.y = y;
        this.radius = radius;
        this.color = color;
        this.speed = speed;
      }

      draw() {
        ctx.beginPath();
        ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        ctx.fillStyle = this.color;
        ctx.filter = 'blur(30px)';
        ctx.fill();
        ctx.closePath();
      }

      update() {
        this.x += this.speed.x;
        this.y += this.speed.y;

        // Bounce back on edges
        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
          this.speed.x *= -1;
        }
        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
          this.speed.y *= -1;
        }

        this.draw();
      }
    }

    // Initialize circles
    for (let i = 0; i < 3; i++) {
      const radius = 100 + Math.random() * 50; // Random radius
      const x = Math.random() * (canvas.width - radius * 2) + radius;
      const y = Math.random() * (canvas.height - radius * 2) + radius;
      const color = colors[i % colors.length];
      const speed = { x: (Math.random() - 0.5) * 2, y: (Math.random() - 0.5) * 2 };
      circles.push(new Circle(x, y, radius, color, speed));
    }

    // Animation loop
    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      circles.forEach(circle => circle.update());
      requestAnimationFrame(animate);
    };

    animate();

    // Resize canvas on window resize
    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return <canvas id="backgroundCanvas"></canvas>;
};

export default DynamicBackground;
