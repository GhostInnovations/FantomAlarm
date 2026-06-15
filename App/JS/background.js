
const canvas = document.getElementById('bgCanvas');
const ctx = canvas.getContext('2d');
const numPoints = 75;
const numEdgePoints = 7;
const speed = 0.4;
const points = [];
// 100,7,0.25
canvas.width = window.innerWidth;
canvas.height = window.innerHeight;

class Point {
    constructor(x, y, edge) {
        this.x = x;
        this.y = y;
        this.edge = edge;
        this.vx = (Math.random() - 0.5) * speed;
        this.vy = (Math.random() - 0.5) * speed;
    }

    move() {
        if (!this.edge){

          this.x += this.vx;
          this.y += this.vy;
          
          if (this.x < 0 || this.x > canvas.width) this.vx *= -1;
          if (this.y < 0 || this.y > canvas.height) this.vy *= -1;
        }
    }
}

function init() {

    points.length = 0;

    canvas.width = window.innerWidth;
    canvas.height = Math.max(window.innerHeight,document.getElementById('body').scrollHeight);
    
    for (let i = 0; i < numPoints; i++) {
        points.push(new Point(Math.random() * canvas.width, Math.random() * canvas.height,false));
    }
    
    const spacingX = canvas.width / (numEdgePoints - 1); // Calculate horizontal spacing
    const spacingY = canvas.height / (numEdgePoints - 1); // Calculate vertical spacing
    
    for (let i = 0; i < numEdgePoints; i++) {
        points.push(new Point(i * spacingX, 0, true));
        if (i > 0) {points.push(new Point(canvas.width, i * spacingY, true));}
        if (i > 0) {points.push(new Point(canvas.width - i * spacingX, canvas.height, true));}
        if (i > 0 && i < numEdgePoints - 1) {points.push(new Point(0, canvas.height - i * spacingY, true));}
    }

    animate();
}

function getColor(y) {
    const ratio = y / canvas.height;

    var color1 = document.getElementById("Top").value;
    var color2 = document.getElementById("Bottom").value;

    // const color1 = '#ff0000'; // Light blue
    // const color2 = '#ffeb00';    // Dark blue

    const r = Math.round(Number(`0x${color1.slice(1,3)}`) + ratio * (Number(`0x${color2.slice(1,3)}`) - Number(`0x${color1.slice(1,3)}`)));
    const g = Math.round(Number(`0x${color1.slice(3,5)}`) + ratio * (Number(`0x${color2.slice(3,5)}`) - Number(`0x${color1.slice(3,5)}`)));
    const b = Math.round(Number(`0x${color1.slice(-2)}`) + ratio * (Number(`0x${color2.slice(-2)}`) - Number(`0x${color1.slice(-2)}`)));

    return `rgb(${r}, ${g}, ${b})`;
}

function drawTriangles() {
    const delaunay = d3.Delaunay.from(points.map(p => [p.x, p.y]));
    const triangles = delaunay.triangles;

    for (let i = 0; i < triangles.length; i += 3) {
        const x1 = points[triangles[i]].x;
        const y1 = points[triangles[i]].y;
        const x2 = points[triangles[i + 1]].x;
        const y2 = points[triangles[i + 1]].y;
        const x3 = points[triangles[i + 2]].x;
        const y3 = points[triangles[i + 2]].y;

        // Calculate centroid for the solid color
        const cx = (x1 + x2 + x3) / 3;
        const cy = (y1 + y2 + y3) / 3;
        const color = getColor(cy);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.lineTo(x3, y3);
        ctx.closePath();

        ctx.fillStyle = color;
        ctx.fill();
        
        ctx.strokeStyle = document.getElementById("Line").value;
        ctx.stroke();
    }
}

function animate() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    points.forEach(point => point.move());
    drawTriangles();
    requestAnimationFrame(animate);
}

init();

window.addEventListener('resize', () => {
    init();
});