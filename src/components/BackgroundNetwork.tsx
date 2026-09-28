import React, { useEffect, useRef } from 'react';

export const BackgroundNetwork: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('resize', handleResize);

    // Check prefers-reduced-motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Generate subtle nodes
    const nodeCount = Math.min(Math.floor((width * height) / 24000), 40);
    const nodes = Array.from({ length: nodeCount }, () => ({
      x: Math.random() * width,
      y: Math.random() * height,
      vx: prefersReducedMotion ? 0 : (Math.random() - 0.5) * 0.35,
      vy: prefersReducedMotion ? 0 : (Math.random() - 0.5) * 0.35,
      radius: Math.random() * 1.5 + 1,
      baseAlpha: Math.random() * 0.3 + 0.1,
    }));

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw subtle connecting lines between close nodes
      const maxDist = 130;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          const dx = nodes[i].x - nodes[j].x;
          const dy = nodes[i].y - nodes[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < maxDist) {
            const alpha = (1 - dist / maxDist) * 0.08;
            ctx.strokeStyle = `rgba(14, 165, 233, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.beginPath();
            ctx.moveTo(nodes[i].x, nodes[i].y);
            ctx.lineTo(nodes[j].x, nodes[j].y);
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      for (const node of nodes) {
        ctx.fillStyle = `rgba(56, 189, 248, ${node.baseAlpha})`;
        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius, 0, Math.PI * 2);
        ctx.fill();

        if (!prefersReducedMotion) {
          node.x += node.vx;
          node.y += node.vy;

          if (node.x < 0) node.x = width;
          if (node.x > width) node.x = 0;
          if (node.y < 0) node.y = height;
          if (node.y > height) node.y = 0;
        }
      }

      if (!prefersReducedMotion) {
        animationFrameId = requestAnimationFrame(render);
      }
    };

    render();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-60"
      aria-hidden="true"
    />
  );
};
