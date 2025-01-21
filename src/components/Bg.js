import React, { useEffect } from 'react';
import '../index.css';

const Bg = () => {
  useEffect(() => {
    const canvas = document.getElementById('backgroundCanvas');
    const ctx = canvas.getContext('2d');
    const colors = ['#3A3B3C', '#4F4E6F', '#354B47', '#505A5A']; // Subdued dark tones
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

        // Keep circles near the edges
        if (this.x - this.radius < 0 || this.x + this.radius > canvas.width) {
          this.speed.x *= -1;
        }
        if (this.y - this.radius < 0 || this.y + this.radius > canvas.height) {
          this.speed.y *= -1;
        }

        this.draw();
      }
    }

    // Initialize circles closer to the edges
    for (let i = 0; i < 4; i++) {
      const radius = 80 + Math.random() * 50; // Varying radii
      let x = Math.random() < 0.5 ? radius + 50 : canvas.width - radius - 50; // Near left or right edges
      let y = Math.random() < 0.5 ? radius + 50 : canvas.height - radius - 50; // Near top or bottom edges
      const color = colors[i % colors.length];
      const speed = { x: (Math.random() - 0.5) * 0.2, y: (Math.random() - 0.5) * 0.2 }; // Slow movement
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

export default Bg;
